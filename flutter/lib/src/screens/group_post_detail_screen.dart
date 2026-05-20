import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/group_post.dart';
import '../services/api_config.dart';
import '../services/group_service.dart';
import '../widgets/engagement_buttons.dart';
import '../providers/engagement_provider.dart';
import '../widgets/post_video_player.dart';

class GroupPostDetailScreen extends StatefulWidget {
  final int postId;

  const GroupPostDetailScreen({
    Key? key,
    required this.postId,
  }) : super(key: key);

  @override
  State<GroupPostDetailScreen> createState() => _GroupPostDetailScreenState();
}

class _GroupPostDetailScreenState extends State<GroupPostDetailScreen> {
  GroupPost? _post;
  bool _isLoading = true;
  String? _error;
  
  late PageController _pageController;
  late TextEditingController _commentController;
  int _currentImageIndex = 0;
  bool _isCommentSubmitting = false;
  final GlobalKey _commentInputKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _commentController = TextEditingController();
    _fetchPost();
  }

  Future<void> _fetchPost() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await GroupService.getGroupPost(widget.postId);
      
      if (response['success'] == true) {
        setState(() {
          _post = response['post'] as GroupPost;
        });

        // Fetch engagement stats and comments when post is loaded
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            final engagementProvider = context.read<EngagementProvider>();
            // Note: If backend expects different endpoint for group post engagement, 
            // you might need to adapt EngagementProvider. 
            // Here we assume it handles it or we use standard post ID.
            engagementProvider.fetchEngagementStats(_post!.id);
            engagementProvider.fetchComments(_post!.id);
          }
        });
      } else {
        setState(() {
          _error = response['message'] ?? 'Failed to load post';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error loading post: $e';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submitComment() async {
    final commentText = _commentController.text.trim();
    if (commentText.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a comment'),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    setState(() {
      _isCommentSubmitting = true;
    });

    try {
      final engagementProvider = context.read<EngagementProvider>();
      // Assuming EngagementProvider handles adding comments to this post ID
      await engagementProvider.addComment(_post!.id, commentText);

      _commentController.clear();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Comment added successfully'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to add comment: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isCommentSubmitting = false;
        });
      }
    }
  }

  Widget _buildImageGallery() {
    if (_post!.images == null || _post!.images!.isEmpty) {
      return const SizedBox.shrink();
    }

    final allImages = _post!.images!.map((url) => ApiConfig.getImageUrl(url)).toList();

    return Stack(
      children: [
        SizedBox(
          height: 300,
          child: PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentImageIndex = index;
              });
            },
            itemCount: allImages.length,
            itemBuilder: (context, index) {
              return Image.network(
                allImages[index],
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: Colors.grey[300],
                    child: Center(
                      child: Icon(Icons.broken_image, size: 60, color: Colors.grey[600]),
                    ),
                  );
                },
              );
            },
          ),
        ),
        if (allImages.length > 1)
          Positioned(
            top: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${_currentImageIndex + 1} / ${allImages.length}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildAuthorInfo() {
    final author = _post!.author;
    if (author == null) return const SizedBox.shrink();

    return ListTile(
      leading: CircleAvatar(
        backgroundColor: Colors.blue[100],
        backgroundImage: author.avatar != null ? NetworkImage(author.avatar!) : null,
        child: author.avatar == null ? Icon(Icons.person, color: Colors.blue[700]) : null,
      ),
      title: Row(
        children: [
          Text(author.displayName ?? author.username ?? 'Unknown Author', style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
      subtitle: Text(
        'Posted on ${_post!.postDate.split(' ')[0]}',
        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
      ),
    );
  }

  Widget _buildEngagementStats() {
    return Consumer<EngagementProvider>(
      builder: (context, engagementProvider, _) {
        final engagement = engagementProvider.getEngagement(_post!.id);
        
        if (engagement == null) {
          return const SizedBox.shrink();
        }

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${engagement.likeCount} Likes • ${engagement.commentCount} Comments', 
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCommentsSection() {
    return Consumer<EngagementProvider>(
      builder: (context, engagementProvider, _) {
        final comments = engagementProvider.getComments(_post!.id);
        final isLoading = engagementProvider.isLoadingComments(_post!.id);

        if (isLoading) {
          return const Center(child: Padding(padding: EdgeInsets.all(16.0), child: CircularProgressIndicator()));
        }

        if (comments == null || comments.isEmpty) {
          return const Padding(
            padding: EdgeInsets.all(16.0),
            child: Center(child: Text('Chưa có bình luận nào. Hãy là người đầu tiên bình luận!')),
          );
        }

        return ListView.builder(
          physics: const NeverScrollableScrollPhysics(),
          shrinkWrap: true,
          itemCount: comments.length,
          itemBuilder: (context, index) {
            final comment = comments[index];
            return ListTile(
              leading: CircleAvatar(
                backgroundColor: Colors.grey[200],
                backgroundImage: comment.authorImage != null ? NetworkImage(comment.authorImage!) : null,
                child: comment.authorImage == null ? const Icon(Icons.person, color: Colors.grey) : null,
              ),
              title: Text(comment.authorName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text(comment.content),
            );
          },
        );
      },
    );
  }

  Widget _buildBottomSidebar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade300)),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -2)),
        ],
      ),
      child: SafeArea(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 2.0),
              child: IconButton(
                icon: const Icon(Icons.camera_alt_outlined),
                color: Colors.grey.shade600,
                tooltip: 'Đính kèm ảnh',
                onPressed: () {},
                style: IconButton.styleFrom(
                  hoverColor: Colors.grey.shade100,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                constraints: const BoxConstraints(minHeight: 40, maxHeight: 80),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8.0),
                ),
                child: Scrollbar(
                  child: TextField(
                    key: _commentInputKey,
                    controller: _commentController,
                    maxLines: null,
                    keyboardType: TextInputType.multiline,
                    textInputAction: TextInputAction.newline,
                    style: const TextStyle(fontSize: 14.0),
                    onChanged: (text) => setState(() {}),
                    decoration: const InputDecoration(
                      hintText: 'Viết bình luận...',
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Padding(
              padding: const EdgeInsets.only(bottom: 2.0),
              child: ValueListenableBuilder<TextEditingValue>(
                valueListenable: _commentController,
                builder: (context, value, child) {
                  final isComposing = value.text.trim().isNotEmpty && !_isCommentSubmitting;
                  return IconButton.filled(
                    icon: _isCommentSubmitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.send_rounded, size: 20),
                    tooltip: 'Đăng bình luận',
                    onPressed: isComposing ? _submitComment : null,
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.blue,
                      disabledBackgroundColor: Colors.blue.withOpacity(0.5),
                      foregroundColor: Colors.white,
                      disabledForegroundColor: Colors.white70,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Bài viết')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _post == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Lỗi')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error ?? 'Không tìm thấy bài viết', style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _fetchPost, child: const Text('Thử lại')),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_post!.group?.groupName ?? 'Bài viết nhóm'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildAuthorInfo(),
                  _buildImageGallery(),
                  if (_post!.video != null && _post!.video!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                      child: FeedVideoPlayer(
                        videoUrl: _post!.video!,
                        height: 250,
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  if (_post!.postExcerpt != null && _post!.postExcerpt!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.blue[50],
                          border: Border(left: BorderSide(color: Colors.blue[500]!, width: 4)),
                        ),
                        child: Text(_post!.postExcerpt!, style: const TextStyle(fontStyle: FontStyle.italic)),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text(_post!.postContent ?? '', style: const TextStyle(fontSize: 16, height: 1.5)),
                  ),
                  const Divider(),
                  _buildEngagementStats(),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                    child: EngagementButtons(
                      postId: _post!.id,
                      postTitle: _post!.postTitle ?? 'Group Post',
                      postText: _post!.postExcerpt,
                      onCommentPressed: () {
                        // Focus comment input
                        FocusScope.of(context).requestFocus(FocusNode());
                        // Scroll or focus implementation here
                      },
                    ),
                  ),
                  const Divider(thickness: 4, color: Color(0xFFF3F4F6)), // Gray-100 equivalent
                  const Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Text('Bình luận', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                  _buildCommentsSection(),
                  const SizedBox(height: 20), // Padding before bottom bar
                ],
              ),
            ),
          ),
          _buildBottomSidebar(),
        ],
      ),
    );
  }
}
