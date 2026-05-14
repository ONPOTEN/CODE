import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/post.dart';
import '../models/user.dart';
import '../services/post_service.dart';
import '../providers/auth_provider.dart';
import '../widgets/engagement_buttons.dart';
import 'create_post_screen.dart';
import 'edit_post_screen.dart';

/// My Wall Screen
/// Displays user's wall posts and shared posts with ability to create new posts
class MyWallScreen extends StatefulWidget {
  const MyWallScreen({Key? key}) : super(key: key);

  @override
  State<MyWallScreen> createState() => _MyWallScreenState();
}

class _MyWallScreenState extends State<MyWallScreen> {
  // User and posts data
  User? _user;
  List<Post> _wallPosts = [];
  List<Post> _sharedPosts = [];

  // Loading states
  bool _userLoading = true;
  bool _wallPostsLoading = true;
  bool _sharedPostsLoading = true;

  // UI state
  String? _errorMessage;
  String? _successMessage;

  // Pagination
  int _currentPage = 1;
  int? _totalPages;
  String _searchQuery = '';
  String _selectedType = '';

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
    _loadWallPosts();
    _loadSharedPosts();
  }

  /// Load current user profile
  Future<void> _loadUserProfile() async {
    if (!mounted) return;

    setState(() => _userLoading = true);

    try {
      final authProvider = context.read<AuthProvider>();
      if (authProvider.user != null) {
        // Create a user from auth provider data
        _user = User(
          id: authProvider.user!.id,
          username: authProvider.user!.username,
          email: authProvider.user!.email,
          displayName: authProvider.user!.displayName,
          role: 'user',
        );
      }
    } catch (e) {
      print('Error loading user profile: $e');
    } finally {
      if (mounted) {
        setState(() => _userLoading = false);
      }
    }
  }

  /// Load user's wall posts
  Future<void> _loadWallPosts() async {
    if (!mounted) return;

    setState(() => _wallPostsLoading = true);

    try {
      final result = await PostService.getMyPosts(
        page: _currentPage,
        type: _selectedType.isNotEmpty ? _selectedType : null,
      );

      if (mounted) {
        setState(() {
          if (result['success']) {
            _wallPosts = result['posts'] ?? [];
            _totalPages = result['last_page'];
          } else {
            _errorMessage = result['message'];
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = 'Failed to load wall posts: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _wallPostsLoading = false);
      }
    }
  }

  /// Load shared posts on user's wall
  Future<void> _loadSharedPosts() async {
    if (!mounted) return;

    setState(() => _sharedPostsLoading = true);

    try {
      final authProvider = context.read<AuthProvider>();
      if (authProvider.user != null) {
        final result = await PostService.getSharedWallPosts(
          userId: authProvider.user!.id,
        );

        if (mounted) {
          setState(() {
            if (result['success']) {
              _sharedPosts = result['posts'] ?? [];
            }
          });
        }
      }
    } catch (e) {
      print('Error loading shared posts: $e');
    } finally {
      if (mounted) {
        setState(() => _sharedPostsLoading = false);
      }
    }
  }

  /// Handle search input
  void _handleSearch(String query) {
    setState(() {
      _searchQuery = query;
      _currentPage = 1;
    });
    // Search is implemented client-side filtering
  }

  /// Handle type filter
  void _handleTypeFilter(String? type) {
    setState(() {
      _selectedType = type ?? '';
      _currentPage = 1;
    });
    _loadWallPosts();
  }

  /// Delete a shared post
  Future<void> _handleDeleteSharedPost(Post post) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Shared Post'),
        content: const Text(
          'Are you sure you want to remove this shared post from your wall?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final authProvider = context.read<AuthProvider>();
      if (authProvider.user != null) {
        final result = await PostService.deleteSharedPost(
          postId: post.id,
          wallId: authProvider.user!.id,
        );

        if (mounted) {
          if (result['success']) {
            setState(() {
              _sharedPosts.removeWhere((p) => p.id == post.id);
            });

            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Shared post removed from your wall!'),
                backgroundColor: Colors.green,
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(result['message'] ?? 'Failed to remove post'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error removing post: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Navigate to create post screen
  Future<void> _navigateToCreatePost() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const CreatePostScreen(),
      ),
    );

    if (result == true && mounted) {
      _currentPage = 1;
      _loadWallPosts();
    }
  }

  /// Navigate to edit post screen
  Future<void> _navigateToEditPost(Post post) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EditPostScreen(post: post),
      ),
    );

    if (result == true && mounted) {
      _loadWallPosts();
    }
  }

  /// Delete a wall post
  Future<void> _deletePost(Post post) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Post'),
        content: Text(
          'Are you sure you want to delete "${post.title}"? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final result = await PostService.deletePost(post.id);

      if (mounted) {
        if (result['success']) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Post deleted successfully'),
              backgroundColor: Colors.green,
            ),
          );
          _loadWallPosts();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Failed to delete post'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Format date string
  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    } catch (_) {
      return dateString;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Wall'),
        elevation: 0,
      ),
      body: _userLoading
          ? const Center(child: CircularProgressIndicator())
          : _user == null
              ? const Center(
                  child: Text('Failed to load user profile'),
                )
              : RefreshIndicator(
                  onRefresh: () async {
                    _currentPage = 1;
                    await Future.wait([
                      _loadWallPosts(),
                      _loadSharedPosts(),
                    ]);
                  },
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // User Header
                          _buildUserHeader(),
                          const SizedBox(height: 24),

                          // Search and Filter
                          _buildSearchAndFilter(),
                          const SizedBox(height: 16),

                          // Error message
                          if (_errorMessage != null)
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.red[100],
                                border: Border.all(color: Colors.red[400]!),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                _errorMessage!,
                                style: TextStyle(color: Colors.red[700]),
                              ),
                            ),

                          // Success message
                          if (_successMessage != null)
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.green[100],
                                border: Border.all(color: Colors.green[400]!),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                _successMessage!,
                                style: TextStyle(color: Colors.green[700]),
                              ),
                            ),

                          const SizedBox(height: 16),

                          // Wall Posts
                          _buildWallPostsSection(),
                          const SizedBox(height: 24),

                          // Shared Posts
                          if (_sharedPosts.isNotEmpty)
                            _buildSharedPostsSection(),
                        ],
                      ),
                    ),
                  ),
                ),
    );
  }

  /// Build user header with avatar and info
  Widget _buildUserHeader() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey[300]!),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Avatar
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.grey[300],
                  ),
                  child: const Icon(Icons.person, size: 40),
                ),
                const SizedBox(width: 20),
                // User info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _user?.displayName ?? 'User',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '@${_user?.username ?? 'unknown'}',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Build search and filter section
  Widget _buildSearchAndFilter() {
    return Column(
      children: [
        // Search field
        TextField(
          onChanged: _handleSearch,
          decoration: InputDecoration(
            hintText: 'Search posts...',
            prefixIcon: const Icon(Icons.search),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          ),
        ),
        const SizedBox(height: 12),
        // Type filter
        DropdownButton<String>(
          value: _selectedType.isEmpty ? null : _selectedType,
          hint: const Text('Filter by type'),
          isExpanded: true,
          items: const [
            DropdownMenuItem(value: '', child: Text('All Types')),
            DropdownMenuItem(value: 'post', child: Text('Post')),
            DropdownMenuItem(value: 'page', child: Text('Page')),
            DropdownMenuItem(value: 'product', child: Text('Product')),
          ],
          onChanged: _handleTypeFilter,
        ),
      ],
    );
  }

  /// Build wall posts section
  Widget _buildWallPostsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Wall Posts',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            ElevatedButton.icon(
              onPressed: _navigateToCreatePost,
              icon: const Icon(Icons.add),
              label: const Text('Create Post'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_wallPostsLoading)
          const Center(child: CircularProgressIndicator())
        else if (_wallPosts.isEmpty)
          Center(
            child: Text(
              'No posts yet',
              style: TextStyle(color: Colors.grey[600]),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _wallPosts.length,
            separatorBuilder: (_, __) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final post = _wallPosts[index];
              return Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey[300]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Post image
                    if (post.images.isNotEmpty)
                      ClipRRect(
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(12),
                          topRight: Radius.circular(12),
                        ),
                        child: Image.network(
                          post.images.first,
                          width: double.infinity,
                          height: 200,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) {
                            return Container(
                              height: 200,
                              color: Colors.grey[300],
                              child: const Icon(Icons.image),
                            );
                          },
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Title
                          Text(
                            post.title,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          // Excerpt
                          if (post.excerpt.isNotEmpty)
                            Text(
                              post.excerpt,
                              style: TextStyle(color: Colors.grey[600]),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          const SizedBox(height: 12),
                          // Post metadata
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.blue[100],
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  post.type.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.blue[700],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
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
                          // Engagement Buttons
                          EngagementButtons(
                            postId: post.id,
                            postTitle: post.title,
                            postText: post.content,
                            showLabels: true,
                            compact: false,
                          ),
                          const SizedBox(height: 12),
                          // Action buttons
                          Row(
                            children: [
                              ElevatedButton.icon(
                                onPressed: () => _navigateToEditPost(post),
                                icon: const Icon(Icons.edit),
                                label: const Text('Edit'),
                                style: ElevatedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton.icon(
                                onPressed: () => _deletePost(post),
                                icon: const Icon(Icons.delete),
                                label: const Text('Delete'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.red,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
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
            },
          ),
        const SizedBox(height: 16),
        // Pagination
        if (_totalPages != null && _totalPages! > 1)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ElevatedButton(
                onPressed: _currentPage > 1
                    ? () {
                        setState(() => _currentPage--);
                        _loadWallPosts();
                      }
                    : null,
                child: const Text('Previous'),
              ),
              const SizedBox(width: 16),
              Text('Page $_currentPage of $_totalPages'),
              const SizedBox(width: 16),
              ElevatedButton(
                onPressed: _currentPage < (_totalPages ?? 1)
                    ? () {
                        setState(() => _currentPage++);
                        _loadWallPosts();
                      }
                    : null,
                child: const Text('Next'),
              ),
            ],
          ),
      ],
    );
  }

  /// Build shared posts section
  Widget _buildSharedPostsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(height: 32),
        const Text(
          'Shared Posts',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        if (_sharedPostsLoading)
          const Center(child: CircularProgressIndicator())
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _sharedPosts.length,
            separatorBuilder: (_, __) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final post = _sharedPosts[index];
              return Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey[300]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Post image
                    if (post.images.isNotEmpty)
                      ClipRRect(
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(12),
                          topRight: Radius.circular(12),
                        ),
                        child: Image.network(
                          post.images.first,
                          width: double.infinity,
                          height: 200,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) {
                            return Container(
                              height: 200,
                              color: Colors.grey[300],
                              child: const Icon(Icons.image),
                            );
                          },
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Author info
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 20,
                                child: Text(
                                  (post.author?.displayName ?? 'U')
                                      .substring(0, 1)
                                      .toUpperCase(),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      post.author?.displayName ?? 'Unknown',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Text(
                                      '@${post.author?.username ?? 'unknown'}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey[600],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              // Three-dot menu
                              PopupMenuButton(
                                itemBuilder: (context) => [
                                  PopupMenuItem(
                                    child: const Row(
                                      children: [
                                        Icon(Icons.delete, color: Colors.red),
                                        SizedBox(width: 8),
                                        Text(
                                          'Remove',
                                          style: TextStyle(color: Colors.red),
                                        ),
                                      ],
                                    ),
                                    onTap: () {
                                      _handleDeleteSharedPost(post);
                                    },
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          // Title
                          Text(
                            post.title,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          // Excerpt
                          if (post.excerpt.isNotEmpty)
                            Text(
                              post.excerpt,
                              style: TextStyle(color: Colors.grey[600]),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          const SizedBox(height: 12),
                          // Post metadata
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.purple[100],
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'SHARED',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.purple[700],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
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
                          // Engagement Buttons
                          EngagementButtons(
                            postId: post.id,
                            postTitle: post.title,
                            postText: post.content,
                            showLabels: true,
                            compact: false,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }
}
