import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/post.dart';
import '../services/post_service.dart';
import '../services/api_config.dart';
import '../services/auth_service.dart';
import '../services/auth_storage.dart';
import '../services/message_service.dart';
import '../widgets/engagement_buttons.dart';
import '../widgets/post_video_player.dart';
import '../widgets/html_content_widget.dart';
import 'post_detail_screen.dart';
import 'create_post_screen.dart';
import 'chat_screen.dart';
import 'user_profile_screen.dart';
import '../widgets/friend_suggestions.dart';

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? _username;
  String? _displayName;
  int? _currentUserId;
  List<Post> _posts = [];
  bool _isLoading = true;
  String? _errorMessage;
  int _currentPage = 1;
  bool _hasMorePosts = true;
  bool _isLoadingMore = false;

  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadUserData();
    _loadPosts();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadUserData() async {
    final username = await AuthStorage.getUsername();
    final displayName = await AuthStorage.getDisplayName();
    final userId = await AuthStorage.getUserId();
    setState(() {
      _username = username;
      _displayName = displayName;
      _currentUserId = userId;
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoadingMore && _hasMorePosts) {
        _loadMorePosts();
      }
    }
  }

  Future<void> _loadPosts({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _currentPage = 1;
        _posts = [];
        _hasMorePosts = true;
        _isLoading = true;
        _errorMessage = null;
      });
    } else {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final result = await PostService.getPosts(
        page: _currentPage,
        perPage: 10,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (result['success'] == true) {
            final newPosts = result['posts'] ?? [];
            if (refresh) {
              _posts = newPosts;
            } else {
              _posts.addAll(newPosts);
            }
            _hasMorePosts = (newPosts as List).length >= 10;
          } else {
            _errorMessage = result['message'] ?? 'Failed to load posts';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Error loading posts: ${e.toString()}';
        });
      }
    }
  }

  Future<void> _loadMorePosts() async {
    if (_isLoadingMore || !_hasMorePosts) return;

    setState(() {
      _isLoadingMore = true;
    });

    _currentPage++;

    try {
      final result = await PostService.getPosts(
        page: _currentPage,
        perPage: 10,
      );

      if (mounted) {
        setState(() {
          _isLoadingMore = false;
          if (result['success'] == true) {
            final newPosts = result['posts'] ?? [];
            _posts.addAll(newPosts);
            _hasMorePosts = (newPosts as List).length >= 10;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingMore = false;
          _currentPage--;
        });
      }
    }
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return '';
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inSeconds < 60) return 'just now';
      if (difference.inMinutes < 60) return '${difference.inMinutes}m';
      if (difference.inHours < 24) return '${difference.inHours}h';
      if (difference.inDays < 7) return '${difference.inDays}d';
      if (difference.inDays < 30) return '${(difference.inDays / 7).floor()}w';
      return '${(difference.inDays / 30).floor()}mo';
    } catch (e) {
      return '';
    }
  }

  String _getTruncatedContent(String? content, {int wordLimit = 50}) {
    if (content == null || content.isEmpty) return '';
    final words = content.trim().split(RegExp(r'\s+'));
    if (words.length > wordLimit) {
      return words.take(wordLimit).join(' ') + '...';
    }
    return content;
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Logout'),
        content: Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('Logout'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => Center(child: CircularProgressIndicator()),
      );

      final result = await AuthService.logout();
      Navigator.of(context).pop();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'Logged out'),
          backgroundColor: Colors.green,
        ),
      );

      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  Widget _buildPostItem(Post post) {
    final authorAvatar = post.author?.avatar;
    final authorName = post.author?.displayName ?? post.author?.username ?? 'Unknown';
    final hasImages = post.images.isNotEmpty;
    final hasFeaturedImage = post.featuredImage != null && post.featuredImage!.isNotEmpty;
    final hasVideo = post.video != null && post.video!.isNotEmpty;

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Colors.grey[200]!, width: 1),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar
          GestureDetector(
            onTap: () {
              // Navigate to user profile
              if (post.author != null) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => UserProfileScreen(userId: post.author!.id),
                  ),
                );
              }
            },
            child: CircleAvatar(
              radius: 20,
              backgroundColor: Colors.grey[300],
              backgroundImage: authorAvatar != null && authorAvatar.isNotEmpty
                  ? CachedNetworkImageProvider(ApiConfig.getImageUrl(authorAvatar))
                  : null,
              child: authorAvatar == null || authorAvatar.isEmpty
                  ? Text(
                      authorName.isNotEmpty ? authorName[0].toUpperCase() : 'U',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
          ),
          SizedBox(width: 12),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header row: Name, time, menu
                Row(
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Flexible(
                            child: GestureDetector(
                              onTap: () {
                                // Navigate to user profile when tapping name
                                if (post.author != null) {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => UserProfileScreen(userId: post.author!.id),
                                    ),
                                  );
                                }
                              },
                              child: Text(
                                authorName,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                          SizedBox(width: 6),
                          Text(
                            _formatDate(post.createdAt),
                            style: TextStyle(
                              color: Colors.grey[500],
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Menu button
                    PopupMenuButton<String>(
                      icon: Icon(Icons.more_vert, size: 18, color: Colors.grey[600]),
                      padding: EdgeInsets.zero,
                      onSelected: (value) {
                        switch (value) {
                          case 'save':
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Post saved!')),
                            );
                            break;
                          case 'edit':
                            Navigator.pushNamed(context, '/edit-post', arguments: post.id);
                            break;
                          case 'delete':
                            _confirmDeletePost(post.id);
                            break;
                        }
                      },
                      itemBuilder: (context) => [
                        PopupMenuItem(value: 'save', child: Text('Save')),
                        PopupMenuItem(value: 'edit', child: Text('Edit')),
                        PopupMenuItem(
                          value: 'delete',
                          child: Text('Delete', style: TextStyle(color: Colors.red)),
                        ),
                      ],
                    ),
                  ],
                ),
                // Post content
                if (post.content.isNotEmpty) ...[
                  SizedBox(height: 6),
                  GestureDetector(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => PostDetailScreen(post: post),
                        ),
                      );
                    },
                    child: HtmlContentWidget(
                      content: post.content,
                      truncate: true,
                      maxWords: 50,
                      defaultTextStyle: TextStyle(fontSize: 15, height: 1.4),
                    ),
                  ),
                ],
                // Video player
                if (hasVideo) ...[
                  SizedBox(height: 10),
                  FeedVideoPlayer(
                    videoUrl: post.video!,
                    height: 200,
                    borderRadius: BorderRadius.circular(12),
                  ),
                ],
                // Images carousel (only show if no video)
                if (!hasVideo && (hasImages || hasFeaturedImage)) ...[
                  SizedBox(height: 10),
                  _buildImageCarousel(post),
                ],
                // Engagement buttons and Message button row
                SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: EngagementButtons(
                        postId: post.id,
                        postTitle: post.title,
                        postSlug: 'post-${post.id}',
                        postText: post.excerpt,
                        showLabels: false,
                        compact: true,
                      ),
                    ),
                    // Nhắn tin button - only show if not your own post
                    if (post.author != null && _currentUserId != post.author!.id)
                      GestureDetector(
                        onTap: () => _navigateToChat(post.author!.id),
                        child: Container(
                          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.blue,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.chat_bubble_outline, size: 14, color: Colors.white),
                              SizedBox(width: 4),
                              Text(
                                'Nhắn tin',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageCarousel(Post post) {
    List<String> allImages = [];

    // Add featured image first if exists
    if (post.featuredImage != null && post.featuredImage!.isNotEmpty) {
      allImages.add(post.featuredImage!);
    }

    // Add other images
    for (var img in post.images) {
      if (!allImages.contains(img)) {
        allImages.add(img);
      }
    }

    if (allImages.isEmpty) return SizedBox.shrink();

    if (allImages.length == 1) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: CachedNetworkImage(
          imageUrl: ApiConfig.getImageUrl(allImages[0]),
          fit: BoxFit.cover,
          width: double.infinity,
          height: 200,
          placeholder: (context, url) => Container(
            height: 200,
            color: Colors.grey[200],
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
          ),
          errorWidget: (context, url, error) => Container(
            height: 200,
            color: Colors.grey[200],
            child: Icon(Icons.image_not_supported, color: Colors.grey[400]),
          ),
        ),
      );
    }

    // Multiple images - horizontal scroll
    return SizedBox(
      height: 200,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: allImages.length,
        itemBuilder: (context, index) {
          return Container(
            width: 200,
            margin: EdgeInsets.only(right: index < allImages.length - 1 ? 8 : 0),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CachedNetworkImage(
                    imageUrl: ApiConfig.getImageUrl(allImages[index]),
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      color: Colors.grey[200],
                      child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                    ),
                    errorWidget: (context, url, error) => Container(
                      color: Colors.grey[200],
                      child: Icon(Icons.image_not_supported, color: Colors.grey[400]),
                    ),
                  ),
                  // Image counter badge
                  if (allImages.length > 1)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${index + 1}/${allImages.length}',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _confirmDeletePost(int postId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete Post'),
        content: Text('Are you sure you want to delete this post?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final result = await PostService.deletePost(postId);
        if (result['success'] == true) {
          setState(() {
            _posts.removeWhere((p) => p.id == postId);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Post deleted'), backgroundColor: Colors.green),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(result['message'] ?? 'Failed to delete'), backgroundColor: Colors.red),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error deleting post'), backgroundColor: Colors.red),
        );
      }
    }
  }

  // Navigate to chat with a user
  Future<void> _navigateToChat(int userId) async {
    // Don't message yourself
    if (_currentUserId != null && _currentUserId == userId) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bạn không thể nhắn tin cho chính mình'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final result = await MessageService.getOrCreateConversation(userId);

      // Dismiss loading
      if (mounted) Navigator.of(context).pop();

      if (result['success'] == true && result['conversation'] != null) {
        if (mounted) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => ChatScreen(conversation: result['conversation']),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Không thể tạo cuộc trò chuyện'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      // Dismiss loading
      if (mounted) Navigator.of(context).pop();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('Centimet2'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Container(color: Colors.grey[200], height: 1),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: Column(
        children: [
          // Facebook-style Create Post Card
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey[200]!),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                // Avatar + "What's on your mind?" row
                Row(
                  children: [
                    // User avatar
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: Colors.grey[300],
                      child: Text(
                        (_displayName ?? _username ?? 'U').isNotEmpty
                            ? (_displayName ?? _username ?? 'U')[0].toUpperCase()
                            : 'U',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    // Pill-shaped "Bạn đang nghĩ gì thế?" button
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (context) => CreatePostScreen()),
                          ).then((created) {
                            if (created == true) {
                              _loadPosts(refresh: true);
                            }
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(24),
                          ),
                          child: Text(
                            'Bạn đang nghĩ gì thế${_displayName != null && _displayName!.isNotEmpty ? ', $_displayName' : ''}?',
                            style: TextStyle(
                              color: Colors.grey[500],
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // Divider
                Divider(color: Colors.grey[200], height: 1),
                const SizedBox(height: 6),
                // Action buttons row
                Row(
                  children: [
                    // Video trực tiếp
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (context) => CreatePostScreen()),
                          ).then((created) {
                            if (created == true) {
                              _loadPosts(refresh: true);
                            }
                          });
                        },
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.videocam, color: Colors.red[500], size: 22),
                              const SizedBox(width: 6),
                              Text(
                                'Video',
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontWeight: FontWeight.w500,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Ảnh/video
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (context) => CreatePostScreen()),
                          ).then((created) {
                            if (created == true) {
                              _loadPosts(refresh: true);
                            }
                          });
                        },
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.photo_library, color: Colors.green[500], size: 22),
                              const SizedBox(width: 6),
                              Text(
                                'Ảnh/video',
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontWeight: FontWeight.w500,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Cảm xúc
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (context) => CreatePostScreen()),
                          ).then((created) {
                            if (created == true) {
                              _loadPosts(refresh: true);
                            }
                          });
                        },
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.emoji_emotions, color: Colors.amber[600], size: 22),
                              const SizedBox(width: 6),
                              Text(
                                'Cảm xúc',
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontWeight: FontWeight.w500,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Posts Feed
          Expanded(
            child: _isLoading && _posts.isEmpty
                ? Center(child: CircularProgressIndicator())
                : _errorMessage != null && _posts.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                            SizedBox(height: 16),
                            Text('Error Loading Posts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                            SizedBox(height: 8),
                            Text(_errorMessage!, textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[600])),
                            SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _loadPosts(refresh: true),
                              icon: Icon(Icons.refresh),
                              label: Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : _posts.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.article_outlined, size: 64, color: Colors.grey[400]),
                                SizedBox(height: 16),
                                Text('No posts yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                SizedBox(height: 8),
                                Text('Be the first to create a post!', style: TextStyle(color: Colors.grey[600])),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => _loadPosts(refresh: true),
                            child: ListView.builder(
                              controller: _scrollController,
                              itemCount: _posts.length + (_isLoadingMore ? 1 : 0) + (!_hasMorePosts && _posts.isNotEmpty ? 1 : 0),
                              itemBuilder: (context, index) {
                                if (index == _posts.length && _isLoadingMore) {
                                  return Padding(
                                    padding: EdgeInsets.all(16),
                                    child: Center(child: CircularProgressIndicator()),
                                  );
                                }
                                if (index == _posts.length && !_hasMorePosts) {
                                  return Padding(
                                    padding: EdgeInsets.all(24),
                                    child: Center(
                                      child: Text(
                                        "You've reached the end",
                                        style: TextStyle(color: Colors.grey[500], fontSize: 14),
                                      ),
                                    ),
                                  );
                                }
                                
                                // Show friend suggestions every 5 posts, starting after the first post
                                if (index > 0 && index % 5 == 0) {
                                  return Column(
                                    children: [
                                      FriendSuggestions(page: (index ~/ 5) + 1),
                                      _buildPostItem(_posts[index]),
                                    ],
                                  );
                                }
                                
                                return _buildPostItem(_posts[index]);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
