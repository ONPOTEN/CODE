import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/post.dart';
import '../services/api_config.dart';
import '../widgets/engagement_buttons.dart';
import '../widgets/post_video_player.dart';
import '../widgets/html_content_widget.dart';
import '../providers/engagement_provider.dart';

class PostDetailScreen extends StatefulWidget {
  final Post post;
  final bool isAuthor;

  const PostDetailScreen({
    Key? key,
    required this.post,
    this.isAuthor = false,
  }) : super(key: key);

  @override
  State<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends State<PostDetailScreen> {
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
    // Fetch engagement stats and comments when screen loads
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final engagementProvider = context.read<EngagementProvider>();
      engagementProvider.fetchEngagementStats(widget.post.id);
      engagementProvider.fetchComments(widget.post.id);
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  void _scrollToCommentInput() {
    // Scroll to the comment input field when comment button is pressed
    Scrollable.of(_commentInputKey.currentContext ?? context)
        .position
        .animateTo(
          Scrollable.of(_commentInputKey.currentContext ?? context)
              .position
              .maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        )
        .then((_) {
      // Focus on the comment input field
      _commentController.clear();
      FocusScope.of(context).requestFocus(FocusScope.of(context));
    });
  }

  void _viewFullScreenImage() {
    // Convert all image URLs before passing to fullscreen gallery
    final fixedImages = widget.post.images
        .map((url) => ApiConfig.getImageUrl(url))
        .toList();

    if (fixedImages.isEmpty && widget.post.featuredImage != null) {
      // Include featured image if no other images
      fixedImages.insert(
        0,
        ApiConfig.getImageUrl(widget.post.featuredImage!),
      );
    }

    if (fixedImages.isNotEmpty) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => _FullScreenImageGallery(
            images: fixedImages,
            initialIndex: _currentImageIndex,
          ),
        ),
      );
    }
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
      await engagementProvider.addComment(widget.post.id, commentText);

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

  Widget _buildMediaGallery() {
    // Check if post has video
    final hasVideo = widget.post.video != null && widget.post.video!.isNotEmpty;

    if (hasVideo) {
      return PostVideoPlayer(
        videoUrl: widget.post.video!,
        height: 300,
        borderRadius: BorderRadius.zero,
        autoPlay: false,
        showFullscreenButton: true,
      );
    }

    // Fall back to image gallery
    return _buildImageGallery();
  }

  Widget _buildImageGallery() {
    final allImages = <String>[];

    if (widget.post.featuredImage != null && widget.post.featuredImage!.isNotEmpty) {
      allImages.add(ApiConfig.getImageUrl(widget.post.featuredImage!));
    }

    allImages.addAll(
      widget.post.images.map((url) => ApiConfig.getImageUrl(url)).toList(),
    );

    if (allImages.isEmpty) {
      return Container(
        height: 300,
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.blue[300]!, Colors.blue[600]!],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const Center(
          child: Icon(
            Icons.article,
            size: 80,
            color: Colors.white,
          ),
        ),
      );
    }

    return Stack(
      children: [
        // Image PageView
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
              return GestureDetector(
                onTap: _viewFullScreenImage,
                child: Image.network(
                  allImages[index],
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: Colors.grey[300],
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.broken_image,
                            size: 60,
                            color: Colors.grey[600],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Failed to load image',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    );
                  },
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return Container(
                      color: Colors.grey[200],
                      child: Center(
                        child: CircularProgressIndicator(
                          value: loadingProgress.expectedTotalBytes != null
                              ? loadingProgress.cumulativeBytesLoaded /
                                  loadingProgress.expectedTotalBytes!
                              : null,
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),

        // Image Counter Badge
        if (allImages.length > 1)
          Positioned(
            top: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.7),
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

        // Fullscreen Button
        if (allImages.isNotEmpty)
          Positioned(
            bottom: 16,
            right: 16,
            child: IconButton(
              onPressed: _viewFullScreenImage,
              icon: const Icon(Icons.fullscreen),
              style: IconButton.styleFrom(
                backgroundColor: Colors.black.withValues(alpha: 0.7),
                foregroundColor: Colors.white,
              ),
            ),
          ),

        // Navigation Arrows (if multiple images)
        if (allImages.length > 1) ...[
          // Left Arrow
          if (_currentImageIndex > 0)
            Positioned(
              left: 16,
              top: 0,
              bottom: 0,
              child: Center(
                child: IconButton(
                  onPressed: () {
                    _pageController.previousPage(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  },
                  icon: const Icon(Icons.arrow_back_ios),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.black.withValues(alpha: 0.5),
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ),

          // Right Arrow
          if (_currentImageIndex < allImages.length - 1)
            Positioned(
              right: 16,
              top: 0,
              bottom: 0,
              child: Center(
                child: IconButton(
                  onPressed: () {
                    _pageController.nextPage(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  },
                  icon: const Icon(Icons.arrow_forward_ios),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.black.withValues(alpha: 0.5),
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ),
        ],

        // Image Dots Indicator
        if (allImages.length > 1)
          Positioned(
            bottom: 16,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                allImages.length,
                (index) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _currentImageIndex == index
                        ? Colors.white
                        : Colors.white.withValues(alpha: 0.4),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildStatusBadge() {
    final statusColor = widget.post.isPublished()
        ? Colors.green
        : widget.post.isDraft()
            ? Colors.orange
            : Colors.grey;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: statusColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        widget.post.status.toUpperCase(),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildTypeBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Text(
        widget.post.type.toUpperCase(),
        style: TextStyle(
          color: Colors.blue[700],
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.blue[700]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAuthorCard() {
    final author = widget.post.author;
    if (author == null) return const SizedBox.shrink();

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Author Avatar
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.blue[100],
              ),
              child: author.avatar != null
                  ? ClipOval(
                      child: Image.network(
                        author.avatar!,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Icon(
                            Icons.person,
                            color: Colors.blue[700],
                          );
                        },
                      ),
                    )
                  : Icon(
                      Icons.person,
                      color: Colors.blue[700],
                    ),
            ),
            const SizedBox(width: 12),
            // Author Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    author.displayName,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '@${author.username}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            // Follow/Profile Button (placeholder for future)
            Icon(
              Icons.arrow_forward_ios,
              size: 16,
              color: Colors.grey[400],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return 'Unknown';
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays == 0) {
        if (difference.inHours == 0) {
          if (difference.inMinutes == 0) {
            return 'Just now';
          }
          return '${difference.inMinutes} minute${difference.inMinutes > 1 ? 's' : ''} ago';
        }
        return '${difference.inHours} hour${difference.inHours > 1 ? 's' : ''} ago';
      } else if (difference.inDays < 7) {
        return '${difference.inDays} day${difference.inDays > 1 ? 's' : ''} ago';
      } else {
        return '${date.day}/${date.month}/${date.year}';
      }
    } catch (e) {
      return dateString;
    }
  }

  String _formatDatetime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        if (difference.inMinutes == 0) {
          return 'Just now';
        }
        return '${difference.inMinutes} minute${difference.inMinutes > 1 ? 's' : ''} ago';
      }
      return '${difference.inHours} hour${difference.inHours > 1 ? 's' : ''} ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} day${difference.inDays > 1 ? 's' : ''} ago';
    } else {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    }
  }

  Widget _buildEngagementStats() {
    return Consumer<EngagementProvider>(
      builder: (context, engagementProvider, _) {
        final engagement = engagementProvider.getEngagement(widget.post.id);
        final isLoading = engagementProvider.isLoadingEngagement(widget.post.id);

        if (isLoading && engagement == null) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: CircularProgressIndicator(
                color: Colors.blue[600],
              ),
            ),
          );
        }

        if (engagement == null) {
          return const SizedBox.shrink();
        }

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.blue[50],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.blue[200]!),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Engagement',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  // Likes
                  _buildEngagementStat(
                    icon: Icons.thumb_up,
                    label: 'Likes',
                    count: engagement.likeCount,
                    color: Colors.green,
                  ),
                  // Dislikes
                  _buildEngagementStat(
                    icon: Icons.thumb_down,
                    label: 'Dislikes',
                    count: engagement.dislikeCount,
                    color: Colors.red,
                  ),
                  // Comments
                  _buildEngagementStat(
                    icon: Icons.comment,
                    label: 'Comments',
                    count: engagement.commentCount,
                    color: Colors.orange,
                  ),
                  // Shares
                  _buildEngagementStat(
                    icon: Icons.share,
                    label: 'Shares',
                    count: engagement.shareCount,
                    color: Colors.purple,
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEngagementStat({
    required IconData icon,
    required String label,
    required int count,
    required Color color,
  }) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          icon,
          color: color,
          size: 24,
        ),
        const SizedBox(height: 4),
        Text(
          count.toString(),
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildCommentInputSection() {
    return Padding(
      key: _commentInputKey,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Add Comment',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: TextField(
                  controller: _commentController,
                  minLines: 1,
                  maxLines: 3,
                  enabled: !_isCommentSubmitting,
                  decoration: InputDecoration(
                    hintText: 'Write a comment...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.blue,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: _isCommentSubmitting ? null : _submitComment,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: _isCommentSubmitting
                          ? SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                              ),
                            )
                          : const Icon(
                              Icons.send,
                              color: Colors.white,
                              size: 20,
                            ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCommentsSection() {
    return Consumer<EngagementProvider>(
      builder: (context, engagementProvider, _) {
        final comments = engagementProvider.getComments(widget.post.id);
        final isLoading = engagementProvider.isLoadingComments(widget.post.id);

        if (isLoading && comments.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: CircularProgressIndicator(
                color: Colors.blue[600],
              ),
            ),
          );
        }

        if (comments.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Text(
                'No comments yet',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ),
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Comments (${comments.length})',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: comments.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final comment = comments[index];
                return Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: Colors.blue[100],
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Center(
                              child: Text(
                                comment.authorName[0].toUpperCase(),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  comment.authorName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  _formatDatetime(comment.createdAt),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        comment.content,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[800],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // App Bar with Image
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: _buildMediaGallery(),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.share),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Share post')),
                  );
                },
                tooltip: 'Share',
              ),
            ],
          ),

          // Content
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Section
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Status and Type
                      Row(
                        children: [
                          _buildStatusBadge(),
                          const SizedBox(width: 8),
                          _buildTypeBadge(),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Title
                      Text(
                        widget.post.title,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Post metadata (date created)
                      Row(
                        children: [
                          Icon(Icons.calendar_today,
                              size: 16, color: Colors.grey[600]),
                          const SizedBox(width: 4),
                          Text(
                            'Posted ${_formatDate(widget.post.createdAt)}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const Divider(height: 1),

                // Author Card
                _buildAuthorCard(),

                const Divider(height: 1),

                // Details Section
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Post Details',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Comment Count (from engagement provider)
                      Consumer<EngagementProvider>(
                        builder: (context, engagementProvider, _) {
                          final engagement = engagementProvider.getEngagement(widget.post.id);
                          final commentCount = engagement?.commentCount ?? widget.post.commentCount;
                          return _buildInfoRow(
                            Icons.comment,
                            'Comments',
                            '$commentCount',
                          );
                        },
                      ),

                      // Visibility
                      _buildInfoRow(
                        widget.post.isPublic()
                            ? Icons.public
                            : Icons.lock,
                        'Visibility',
                        widget.post.isPublic() ? 'Public' : 'Private',
                      ),

                      // Updated Date
                      if (widget.post.updatedAt != null)
                        _buildInfoRow(
                          Icons.update,
                          'Last Updated',
                          _formatDate(widget.post.updatedAt),
                        ),
                    ],
                  ),
                ),

                // Engagement Stats Section
                _buildEngagementStats(),

                // Content Section
                if (widget.post.content.isNotEmpty) ...[
                  const Divider(height: 1),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Content',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        HtmlContentWidget(
                          content: widget.post.content,
                          maxImageWidth: MediaQuery.of(context).size.width - 32,
                          maxImageHeight: 400,
                          maxVideoWidth: MediaQuery.of(context).size.width - 32,
                          maxVideoHeight: 220,
                          defaultTextStyle: TextStyle(
                            fontSize: 15,
                            color: Colors.grey[800],
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Engagement Section
                const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: EngagementButtons(
                    postId: widget.post.id,
                    postTitle: widget.post.title,
                    postSlug: 'post-${widget.post.id}',
                    postText: widget.post.excerpt,
                    onCommentPressed: _scrollToCommentInput,
                    showLabels: true,
                    compact: false,
                  ),
                ),

                // Comments Section
                const Divider(height: 1),
                _buildCommentsSection(),

                // Comment Input Section
                const Divider(height: 1),
                _buildCommentInputSection(),

                const SizedBox(height: 80), // Space for FAB
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Full Screen Image Gallery
class _FullScreenImageGallery extends StatefulWidget {
  final List<String> images;
  final int initialIndex;

  const _FullScreenImageGallery({
    required this.images,
    required this.initialIndex,
  });

  @override
  State<_FullScreenImageGallery> createState() =>
      _FullScreenImageGalleryState();
}

class _FullScreenImageGalleryState extends State<_FullScreenImageGallery> {
  late PageController _pageController;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: widget.initialIndex);
    _currentIndex = widget.initialIndex;
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          '${_currentIndex + 1} / ${widget.images.length}',
          style: const TextStyle(color: Colors.white),
        ),
      ),
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentIndex = index;
              });
            },
            itemCount: widget.images.length,
            itemBuilder: (context, index) {
              return InteractiveViewer(
                minScale: 0.5,
                maxScale: 4.0,
                child: Image.network(
                  widget.images[index],
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return Center(
                      child: Icon(
                        Icons.broken_image,
                        color: Colors.white,
                        size: 64,
                      ),
                    );
                  },
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return Center(
                      child: CircularProgressIndicator(
                        value: loadingProgress.expectedTotalBytes != null
                            ? loadingProgress.cumulativeBytesLoaded /
                                loadingProgress.expectedTotalBytes!
                            : null,
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
