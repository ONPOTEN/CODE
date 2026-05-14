import 'package:flutter/material.dart';
import '../models/post.dart';
import '../services/post_service.dart';
import '../services/api_config.dart';
import '../widgets/engagement_buttons.dart';
import 'post_detail_screen.dart';

class PostsFeedScreen extends StatefulWidget {
  const PostsFeedScreen({Key? key}) : super(key: key);

  @override
  State<PostsFeedScreen> createState() => _PostsFeedScreenState();
}

class _PostsFeedScreenState extends State<PostsFeedScreen> {
  List<Post> _posts = [];
  bool _isLoading = true;
  String? _errorMessage;
  int _currentPage = 1;
  bool _hasMorePosts = true;
  bool _isLoadingMore = false;

  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  String _searchQuery = '';
  String _selectedType = '';

  @override
  void initState() {
    super.initState();
    _loadPosts();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels ==
        _scrollController.position.maxScrollExtent) {
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
        search: _searchQuery.isEmpty ? null : _searchQuery,
        type: _selectedType.isEmpty ? null : _selectedType,
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
        search: _searchQuery.isEmpty ? null : _searchQuery,
        type: _selectedType.isEmpty ? null : _selectedType,
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
        });
      }
    }
  }

  void _onSearchChanged(String query) {
    setState(() {
      _searchQuery = query;
      _currentPage = 1;
    });
    _loadPosts(refresh: true);
  }

  void _onTypeFilterChanged(String? type) {
    setState(() {
      _selectedType = type ?? '';
      _currentPage = 1;
    });
    _loadPosts(refresh: true);
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case Post.statusPublish:
        return Colors.green;
      case Post.statusDraft:
        return Colors.orange;
      case Post.statusPending:
        return Colors.amber;
      default:
        return Colors.grey;
    }
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
          return '${difference.inMinutes} min ago';
        }
        return '${difference.inHours}h ago';
      } else if (difference.inDays < 7) {
        return '${difference.inDays}d ago';
      } else {
        return '${date.day}/${date.month}/${date.year}';
      }
    } catch (e) {
      return dateString;
    }
  }

  Widget _buildPostCard(Post post) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => PostDetailScreen(post: post),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Featured Image or Placeholder
            if (post.featuredImage != null && (post.featuredImage ?? '').isNotEmpty)
              ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(12)),
                child: Image.network(
                  ApiConfig.getImageUrl(post.featuredImage ?? ''),
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      height: 200,
                      color: Colors.grey[300],
                      child: Center(
                        child: Icon(
                          Icons.image_not_supported,
                          color: Colors.grey[600],
                          size: 48,
                        ),
                      ),
                    );
                  },
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return Container(
                      height: 200,
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
              )
            else
              Container(
                height: 200,
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
              ),
            // Content Section
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getStatusColor(post.status),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      post.status.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Title
                  Text(
                    post.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  // Excerpt
                  if (post.excerpt.isNotEmpty)
                    Text(
                      post.excerpt,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[700],
                        height: 1.4,
                      ),
                    ),
                  const SizedBox(height: 8),
                  // Meta Information
                  Row(
                    children: [
                      Icon(Icons.person, size: 14, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          post.author?.displayName ?? 'Unknown Author',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(Icons.schedule, size: 14, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Text(
                        _formatDate(post.createdAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Engagement Section
                  EngagementButtons(
                    postId: post.id,
                    postTitle: post.title,
                    postSlug: 'post-${post.id}',
                    postText: post.excerpt,
                    showLabels: true,
                    compact: true,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Posts Feed'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Search and Filter Bar
          Container(
            color: Colors.blue,
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                // Search Field
                TextField(
                  controller: _searchController,
                  onChanged: _onSearchChanged,
                  style: const TextStyle(color: Colors.black),
                  decoration: InputDecoration(
                    hintText: 'Search posts...',
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: Colors.grey),
                            onPressed: () {
                              _searchController.clear();
                              _onSearchChanged('');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                // Type Filter Dropdown
                DropdownButton<String>(
                  value: _selectedType.isEmpty ? null : _selectedType,
                  hint: const Text(
                    'Filter by Type',
                    style: TextStyle(color: Colors.white),
                  ),
                  dropdownColor: Colors.blue[700],
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  isExpanded: true,
                  items: [
                    const DropdownMenuItem(
                      value: '',
                      child: Text('All Types', style: TextStyle(color: Colors.white)),
                    ),
                    const DropdownMenuItem(
                      value: Post.typePost,
                      child: Text('Post', style: TextStyle(color: Colors.white)),
                    ),
                    const DropdownMenuItem(
                      value: Post.typePage,
                      child: Text('Page', style: TextStyle(color: Colors.white)),
                    ),
                    const DropdownMenuItem(
                      value: Post.typeProduct,
                      child: Text('Product', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                  onChanged: _onTypeFilterChanged,
                ),
              ],
            ),
          ),
          // Posts List
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : _errorMessage != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.error_outline,
                              size: 64,
                              color: Colors.red[300],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Error Loading Posts',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _errorMessage!,
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _loadPosts(refresh: true),
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      )
                    : _posts.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.article_outlined,
                                  size: 64,
                                  color: Colors.grey[400],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No Posts Found',
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _searchQuery.isNotEmpty
                                      ? 'Try a different search term'
                                      : 'Be the first to create a post!',
                                  style: TextStyle(color: Colors.grey[600]),
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton.icon(
                                  onPressed: () => _loadPosts(refresh: true),
                                  icon: const Icon(Icons.refresh),
                                  label: const Text('Refresh'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.blue,
                                    foregroundColor: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => _loadPosts(refresh: true),
                            child: ListView.builder(
                              controller: _scrollController,
                              itemCount: _posts.length +
                                  (_isLoadingMore ? 1 : 0),
                              itemBuilder: (context, index) {
                                if (index == _posts.length) {
                                  return Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Center(
                                      child: CircularProgressIndicator(
                                        color: Colors.blue[600],
                                      ),
                                    ),
                                  );
                                }
                                return _buildPostCard(_posts[index]);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
