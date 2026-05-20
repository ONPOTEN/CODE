import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/group.dart';
import '../models/group_post.dart';
import '../services/group_service.dart';
import '../services/api_config.dart';
import '../widgets/engagement_buttons.dart';
import '../widgets/post_video_player.dart';
import '../widgets/suggested_groups.dart';
import 'post_detail_screen.dart';
import 'create_group_post_screen.dart';

class GroupDetailScreen extends StatefulWidget {
  final int groupId;

  const GroupDetailScreen({Key? key, required this.groupId}) : super(key: key);

  @override
  State<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends State<GroupDetailScreen> {
  Group? _group;
  List<GroupPost> _posts = [];
  bool _isLoading = true;
  bool _isLoadingPosts = false;
  bool _isLoadingMore = false;
  String? _errorMessage;
  int _currentPage = 1;
  bool _hasMorePosts = true;

  bool _isMember = false;
  String? _memberRole;
  String? _memberStatus;
  bool _isJoining = false;

  String _sortBy = 'post_date';
  String _sortOrder = 'desc';

  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadGroupData();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoadingMore && _hasMorePosts) {
        _loadMorePosts();
      }
    }
  }

  Future<void> _loadGroupData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Load group details and membership in parallel
      final results = await Future.wait([
        GroupService.getGroup(widget.groupId),
        GroupService.checkMembership(widget.groupId),
      ]);

      final groupResult = results[0];
      final membershipResult = results[1];

      if (mounted) {
        setState(() {
          if (groupResult['success'] == true) {
            _group = groupResult['group'] as Group;
          } else {
            _errorMessage = groupResult['message'] ?? 'Failed to load group';
          }

          if (membershipResult['success'] == true) {
            _isMember = membershipResult['is_member'] ?? false;
            _memberRole = membershipResult['role'];
            _memberStatus = membershipResult['status'];
          }

          _isLoading = false;
        });

        // Load posts after group is loaded
        if (_group != null) {
          _loadPosts();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Error: ${e.toString()}';
        });
      }
    }
  }

  Future<void> _loadPosts({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _currentPage = 1;
        _posts = [];
        _hasMorePosts = true;
      });
    }

    setState(() {
      _isLoadingPosts = true;
    });

    try {
      final result = await GroupService.getGroupPosts(
        widget.groupId,
        page: _currentPage,
        perPage: 10,
        sortBy: _sortBy,
        order: _sortOrder,
      );

      if (mounted) {
        setState(() {
          _isLoadingPosts = false;
          if (result['success'] == true) {
            final newPosts = result['posts'] as List<GroupPost>;
            if (refresh) {
              _posts = newPosts;
            } else {
              _posts.addAll(newPosts);
            }
            _hasMorePosts = newPosts.length >= 10;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingPosts = false;
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
      final result = await GroupService.getGroupPosts(
        widget.groupId,
        page: _currentPage,
        perPage: 10,
        sortBy: _sortBy,
        order: _sortOrder,
      );

      if (mounted) {
        setState(() {
          _isLoadingMore = false;
          if (result['success'] == true) {
            final newPosts = result['posts'] as List<GroupPost>;
            _posts.addAll(newPosts);
            _hasMorePosts = newPosts.length >= 10;
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

  Future<void> _handleJoinLeave() async {
    if (_isJoining) return;

    setState(() {
      _isJoining = true;
    });

    try {
      Map<String, dynamic> result;
      if (_isMember) {
        result = await GroupService.leaveGroup(widget.groupId);
      } else {
        result = await GroupService.joinGroup(widget.groupId);
      }

      if (mounted) {
        setState(() {
          _isJoining = false;
        });

        if (result['success'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? (_isMember ? 'Đã rời nhóm' : 'Đã tham gia nhóm')),
              backgroundColor: Colors.green,
            ),
          );
          // Refresh membership status
          final membershipResult = await GroupService.checkMembership(widget.groupId);
          if (mounted) {
            setState(() {
              _isMember = membershipResult['is_member'] ?? false;
              _memberRole = membershipResult['role'];
              _memberStatus = membershipResult['status'];
            });
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Có lỗi xảy ra'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isJoining = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _onSortChanged(String? value) {
    if (value != null) {
      setState(() {
        if (value == 'newest') {
          _sortBy = 'post_date';
          _sortOrder = 'desc';
        } else if (value == 'oldest') {
          _sortBy = 'post_date';
          _sortOrder = 'asc';
        } else if (value == 'most_comments') {
          _sortBy = 'comments_count';
          _sortOrder = 'desc';
        }
      });
      _loadPosts(refresh: true);
    }
  }

  Widget _buildGroupHeader() {
    if (_group == null) return const SizedBox.shrink();

    return Column(
      children: [
        // Cover Image
        Stack(
          children: [
            Container(
              height: 200,
              width: double.infinity,
              color: Colors.blue[100],
              child: _group!.coverImage != null && _group!.coverImage!.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: ApiConfig.getImageUrl(_group!.coverImage!),
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: 200,
                      placeholder: (context, url) => Container(
                        color: Colors.blue[100],
                        child: const Center(
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      ),
                      errorWidget: (context, url, error) => Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.blue[300]!, Colors.blue[600]!],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Icon(Icons.group, size: 60, color: Colors.white.withOpacity(0.5)),
                      ),
                    )
                  : Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Colors.blue[300]!, Colors.blue[600]!],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Icon(Icons.group, size: 60, color: Colors.white.withOpacity(0.5)),
                    ),
            ),
            // Back button
            Positioned(
              top: 40,
              left: 16,
              child: CircleAvatar(
                backgroundColor: Colors.black.withOpacity(0.5),
                child: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
            ),
          ],
        ),
        // Group Info Card
        Container(
          color: Colors.white,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Avatar
                  CircleAvatar(
                    radius: 35,
                    backgroundColor: Colors.blue[200],
                    backgroundImage: _group!.avatar != null && _group!.avatar!.isNotEmpty
                        ? CachedNetworkImageProvider(ApiConfig.getImageUrl(_group!.avatar!))
                        : null,
                    child: _group!.avatar == null || _group!.avatar!.isEmpty
                        ? Text(
                            _group!.groupName.isNotEmpty
                                ? _group!.groupName[0].toUpperCase()
                                : 'G',
                            style: const TextStyle(
                              fontSize: 28,
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 16),
                  // Name and stats
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _group!.groupName,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(
                              _group!.isPublic() ? Icons.public : Icons.lock,
                              size: 14,
                              color: Colors.grey[600],
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _group!.isPublic() ? 'Công khai' : 'Riêng tư',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey[600],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              '${_group!.membersCount} thành viên',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              // Description
              if (_group!.description != null && _group!.description!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  _group!.description!,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[700],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              // Join/Leave Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _isJoining ? null : _handleJoinLeave,
                  icon: _isJoining
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Icon(_isMember ? Icons.logout : Icons.group_add),
                  label: Text(_isMember ? 'Rời nhóm' : 'Tham gia nhóm'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isMember ? Colors.grey[300] : Colors.blue,
                    foregroundColor: _isMember ? Colors.black : Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              // Member status badge
              if (_memberStatus == 'pending') ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.orange[100],
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.hourglass_empty, size: 16, color: Colors.orange[800]),
                      const SizedBox(width: 4),
                      Text(
                        'Đang chờ phê duyệt',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.orange[800],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSortBar() {
    String currentSort = 'newest';
    if (_sortBy == 'post_date' && _sortOrder == 'desc') {
      currentSort = 'newest';
    } else if (_sortBy == 'post_date' && _sortOrder == 'asc') {
      currentSort = 'oldest';
    } else if (_sortBy == 'comments_count') {
      currentSort = 'most_comments';
    }

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      margin: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          Text(
            'Bài viết (${_group?.postsCount ?? 0})',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          DropdownButton<String>(
            value: currentSort,
            underline: const SizedBox.shrink(),
            icon: const Icon(Icons.sort),
            items: const [
              DropdownMenuItem(value: 'newest', child: Text('Mới nhất')),
              DropdownMenuItem(value: 'oldest', child: Text('Cũ nhất')),
              DropdownMenuItem(value: 'most_comments', child: Text('Nhiều bình luận')),
            ],
            onChanged: _onSortChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildPostCard(GroupPost post) {
    final hasImages = post.images.isNotEmpty;
    final hasVideo = post.video != null && post.video!.isNotEmpty;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          Navigator.pushNamed(context, '/group-post', arguments: post.id);
        },
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 0, vertical: 4),
          color: Colors.white,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Author header
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    // Author avatar
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: Colors.blue[200],
                      backgroundImage: post.author?.avatar != null && post.author!.avatar!.isNotEmpty
                          ? CachedNetworkImageProvider(ApiConfig.getImageUrl(post.author!.avatar!))
                          : null,
                      child: post.author?.avatar == null || post.author!.avatar!.isEmpty
                          ? Text(
                              post.author?.displayName?.isNotEmpty == true
                                  ? post.author!.displayName![0].toUpperCase()
                                  : 'U',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(width: 10),
                    // Author name and date
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            post.author?.displayName ?? 'Người dùng',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          Text(
                            _formatDate(post.postDate),
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Menu button
                    IconButton(
                      icon: const Icon(Icons.more_horiz),
                      onPressed: () {},
                    ),
                  ],
                ),
              ),
              // Post title
              if (post.postTitle.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    post.postTitle,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              // Post content
              if (post.postContent.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    post.postContent,
                    style: const TextStyle(fontSize: 14),
                    maxLines: 5,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              // Video
              if (hasVideo)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: FeedVideoPlayer(
                    videoUrl: post.video!,
                    height: 250,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              // Images (show even if video exists)
              if (hasImages) ...[
                if (hasVideo) const SizedBox(height: 12),
                _buildImagesGrid(post.images),
              ],
              // Stats and actions
              // Engagement buttons
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: _GroupPostEngagementRow(
                  post: post,
                  onCommentPressed: () {
                    Navigator.pushNamed(context, '/group-post', arguments: post.id);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImagesGrid(List<String> images) {
    if (images.isEmpty) return const SizedBox.shrink();

    if (images.length == 1) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: CachedNetworkImage(
            imageUrl: ApiConfig.getImageUrl(images[0]),
            fit: BoxFit.cover,
            width: double.infinity,
            height: 250,
            placeholder: (context, url) => Container(
              height: 250,
              color: Colors.grey[200],
              child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
            ),
            errorWidget: (context, url, error) => Container(
              height: 250,
              color: Colors.grey[200],
              child: const Icon(Icons.broken_image, size: 40),
            ),
          ),
        ),
      );
    }

    // Multiple images - show grid
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: images.length == 2 ? 2 : 3,
          crossAxisSpacing: 4,
          mainAxisSpacing: 4,
        ),
        itemCount: images.length > 6 ? 6 : images.length,
        itemBuilder: (context, index) {
          final isLast = index == 5 && images.length > 6;
          return Stack(
            fit: StackFit.expand,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: CachedNetworkImage(
                  imageUrl: ApiConfig.getImageUrl(images[index]),
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(
                    color: Colors.grey[200],
                    child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                  ),
                  errorWidget: (context, url, error) => Container(
                    color: Colors.grey[200],
                    child: const Icon(Icons.broken_image),
                  ),
                ),
              ),
              if (isLast)
                Container(
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Center(
                    child: Text(
                      '+${images.length - 6}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }



  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 1) {
        return 'Vừa xong';
      } else if (diff.inMinutes < 60) {
        return '${diff.inMinutes} phút trước';
      } else if (diff.inHours < 24) {
        return '${diff.inHours} giờ trước';
      } else if (diff.inDays < 7) {
        return '${diff.inDays} ngày trước';
      } else {
        return '${date.day}/${date.month}/${date.year}';
      }
    } catch (e) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                      const SizedBox(height: 16),
                      Text(
                        'Lỗi',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _errorMessage!,
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _loadGroupData,
                        icon: const Icon(Icons.refresh),
                        label: const Text('Thử lại'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () async {
                    await _loadGroupData();
                  },
                  child: CustomScrollView(
                    controller: _scrollController,
                    slivers: [
                      // Group Header
                      SliverToBoxAdapter(
                        child: _buildGroupHeader(),
                      ),
                      // Sort Bar
                      SliverToBoxAdapter(
                        child: _buildSortBar(),
                      ),
                      // Posts List
                      if (_isLoadingPosts && _posts.isEmpty)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.all(32),
                            child: Center(child: CircularProgressIndicator()),
                          ),
                        )
                      else if (_posts.isEmpty)
                        SliverToBoxAdapter(
                          child: Container(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              children: [
                                Icon(Icons.article_outlined, size: 64, color: Colors.grey[400]),
                                const SizedBox(height: 16),
                                const Text(
                                  'Chưa có bài viết nào',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Hãy là người đầu tiên đăng bài trong nhóm này',
                                  style: TextStyle(color: Colors.grey[600]),
                                ),
                              ],
                            ),
                          ),
                        )
                      else
                        SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              if (index >= _posts.length) {
                                return const Padding(
                                  padding: EdgeInsets.all(16),
                                  child: Center(
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ),
                                );
                              }
                              
                              if (index == 1 && _posts.length > 1) {
                                return Column(
                                  children: [
                                    SuggestedGroups(currentGroupId: widget.groupId),
                                    _buildPostCard(_posts[index]),
                                  ],
                                );
                              }
                              
                              return _buildPostCard(_posts[index]);
                            },
                            childCount: _posts.length + (_isLoadingMore ? 1 : 0),
                          ),
                        ),
                      // Bottom padding
                      const SliverToBoxAdapter(
                        child: SizedBox(height: 16),
                      ),
                    ],
                  ),
                ),
      // Floating action button for creating post (only for members)
      floatingActionButton: _isMember && _memberStatus != 'pending'
          ? FloatingActionButton(
              onPressed: () async {
                final result = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(
                    builder: (context) => CreateGroupPostScreen(
                      groupId: widget.groupId,
                      groupName: _group?.groupName ?? 'Nhóm',
                    ),
                  ),
                );
                // Refresh posts if new post was created
                if (result == true) {
                  _loadPosts(refresh: true);
                }
              },
              backgroundColor: Colors.blue,
              child: const Icon(Icons.edit, color: Colors.white),
            )
          : null,
    );
  }
}

class _GroupPostEngagementRow extends StatefulWidget {
  final GroupPost post;
  final VoidCallback onCommentPressed;

  const _GroupPostEngagementRow({
    Key? key,
    required this.post,
    required this.onCommentPressed,
  }) : super(key: key);

  @override
  State<_GroupPostEngagementRow> createState() => _GroupPostEngagementRowState();
}

class _GroupPostEngagementRowState extends State<_GroupPostEngagementRow> {
  late int _likeCount;
  late int _dislikeCount;
  late int _shareCount;
  late int _commentCount;
  bool _isLiked = false;
  bool _isDisliked = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _likeCount = widget.post.likesCount;
    _dislikeCount = widget.post.dislikesCount;
    _shareCount = 0; // Backend doesn't return shareCount in GroupPost by default
    _commentCount = widget.post.commentsCount;
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    final result = await GroupService.getEngagementStats(widget.post.id);
    if (result['success'] && mounted) {
      final data = result['data'];
      setState(() {
        _likeCount = data['likes']['count'] ?? _likeCount;
        _isLiked = data['likes']['user_liked'] ?? false;
        _dislikeCount = data['dislikes']['count'] ?? _dislikeCount;
        _isDisliked = data['dislikes']['user_disliked'] ?? false;
        _commentCount = data['comments']['count'] ?? _commentCount;
        _shareCount = data['shares']['count'] ?? _shareCount;
      });
    }
  }

  Future<void> _toggleLike() async {
    if (_isLoading) return;
    setState(() => _isLoading = true);

    try {
      final result = _isLiked
          ? await GroupService.unlikePost(widget.post.id)
          : await GroupService.likePost(widget.post.id);

      if (result['success'] && mounted) {
        setState(() {
          _isLiked = !_isLiked;
          _likeCount = result['data']['likes_count'] ?? (_isLiked ? _likeCount + 1 : _likeCount - 1);
          if (_isLiked && _isDisliked) {
            _isDisliked = false;
            _dislikeCount = (_dislikeCount > 0) ? _dislikeCount - 1 : 0;
          }
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleDislike() async {
    if (_isLoading) return;
    setState(() => _isLoading = true);

    try {
      final result = _isDisliked
          ? await GroupService.removeDislikePost(widget.post.id)
          : await GroupService.dislikePost(widget.post.id);

      if (result['success'] && mounted) {
        setState(() {
          _isDisliked = !_isDisliked;
          _dislikeCount = result['data']['dislikes_count'] ?? (_isDisliked ? _dislikeCount + 1 : _dislikeCount - 1);
          if (_isDisliked && _isLiked) {
            _isLiked = false;
            _likeCount = (_likeCount > 0) ? _likeCount - 1 : 0;
          }
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showShareBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (BuildContext context) {
        return Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
              ),
              const SizedBox(height: 16),
              Text('Chia sẻ bài viết', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 24),
              GridView.count(
                crossAxisCount: 3,
                shrinkWrap: true,
                mainAxisSpacing: 24,
                crossAxisSpacing: 16,
                children: [
                  _buildShareOption('Facebook', '📘', 'facebook'),
                  _buildShareOption('Twitter', '𝕏', 'twitter'),
                  _buildShareOption('WhatsApp', '💬', 'whatsapp'),
                  _buildShareOption('LinkedIn', '💼', 'linkedin'),
                  _buildShareOption('Email', '✉️', 'email'),
                  _buildShareOption('Copy Link', '🔗', 'direct'),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Widget _buildShareOption(String label, String icon, String platform) {
    return GestureDetector(
      onTap: () async {
        Navigator.pop(context);
        final result = await GroupService.sharePost(widget.post.id, sharedVia: platform);
        if (result['success'] && mounted) {
          setState(() {
            _shareCount = result['data']['shares_count'] ?? _shareCount + 1;
          });
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Đã chia sẻ qua $platform!')));
        }
      },
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
            child: Center(child: Text(icon, style: const TextStyle(fontSize: 32))),
          ),
          const SizedBox(height: 8),
          Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildButton(String icon, int count, bool isActive, VoidCallback onPressed) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _isLoading ? null : onPressed,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          decoration: BoxDecoration(
            color: isActive ? Colors.blue.shade50 : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isActive ? Colors.blue : Colors.transparent, width: 1),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(icon, style: const TextStyle(fontSize: 16)),
              const SizedBox(width: 6),
              Text(
                '$count',
                style: TextStyle(
                  color: isActive ? Colors.blue : Colors.grey[700],
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _buildButton('👍', _likeCount, _isLiked, _toggleLike),
        _buildButton('👎', _dislikeCount, _isDisliked, _toggleDislike),
        _buildButton('📤', _shareCount, false, () => _showShareBottomSheet(context)),
        _buildButton('💬', _commentCount, false, widget.onCommentPressed),
      ],
    );
  }
}

