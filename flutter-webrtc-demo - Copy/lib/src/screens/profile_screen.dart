import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/user.dart';
import '../models/friend.dart';
import '../services/auth_service.dart';
import '../services/friend_service.dart';
import '../services/api_config.dart';
import 'login_screen.dart';
import 'profile_edit_screen.dart';
import 'my_shop_screen.dart';
import 'friends_list_screen.dart';
import 'create_post_screen.dart';
import 'my_posts_screen.dart';
import 'add_friend_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  User? _user;
  bool _isLoading = true;
  List<Friend> _pendingRequests = [];
  bool _isRequestsLoading = true;
  int? _actionLoadingId;

  final TextEditingController _searchController = TextEditingController();
  List<User> _searchResults = [];
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _loadUserData();
    _loadPendingRequests();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadUserData() async {
    try {
      final result = await AuthService.getCurrentUser();
      print('Profile Screen - getCurrentUser result: $result');

      if (result['success'] == true && result['user'] != null) {
        setState(() {
          _user = result['user'] as User;
          _isLoading = false;
        });
      } else {
        setState(() {
          _isLoading = false;
        });

        // Show error message if available
        if (mounted && result['message'] != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message']),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (e) {
      print('Profile Screen - Error loading user data: $e');
      setState(() {
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  Future<void> _loadPendingRequests() async {
    setState(() {
      _isRequestsLoading = true;
    });

    try {
      final result = await FriendService.getFriendRequests();

      if (mounted) {
        setState(() {
          _isRequestsLoading = false;
          if (result['success'] == true) {
            _pendingRequests = result['requests'] as List<Friend>;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isRequestsLoading = false;
        });
      }
    }
  }

  Future<void> _handleAcceptRequest(int senderId) async {
    setState(() {
      _actionLoadingId = senderId;
    });

    try {
      final result = await FriendService.acceptFriendRequest(senderId);

      if (mounted) {
        if (result['success'] == true) {
          setState(() {
            _pendingRequests.removeWhere((req) => req.userId == senderId);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đã chấp nhận lời mời kết bạn!'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Không thể chấp nhận lời mời kết bạn'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _actionLoadingId = null;
        });
      }
    }
  }

  Future<void> _handleRejectRequest(int senderId) async {
    setState(() {
      _actionLoadingId = senderId;
    });

    try {
      final result = await FriendService.rejectFriendRequest(senderId);

      if (mounted) {
        if (result['success'] == true) {
          setState(() {
            _pendingRequests.removeWhere((req) => req.userId == senderId);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đã từ chối lời mời kết bạn'),
              backgroundColor: Colors.orange,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Không thể từ chối lời mời kết bạn'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _actionLoadingId = null;
        });
      }
    }
  }

  Future<void> _handleLogout() async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Đăng xuất'),
        content: const Text('Bạn có chắc chắn muốn đăng xuất không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );

    if (shouldLogout == true) {
      try {
        await AuthService.logout();
        if (mounted) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (context) => LoginScreen()),
            (route) => false,
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Đăng xuất thất bại: $e')),
          );
        }
      }
    }
  }

  Future<void> _navigateToEditProfile() async {
    if (_user == null) return;

    final updatedUser = await Navigator.of(context).push<User>(
      MaterialPageRoute(
        builder: (context) => ProfileEditScreen(user: _user!),
      ),
    );

    // If user was updated, reload the profile data
    if (updatedUser != null) {
      setState(() {
        _user = updatedUser;
      });
      // Optionally reload from server to get latest data
      _loadUserData();
    }
  }

  Future<void> _searchUsers(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _isSearching = false;
      });
      return;
    }

    setState(() {
      _isSearching = true;
    });

    try {
      final result = await FriendService.searchUsers(query);

      if (mounted) {
        setState(() {
          _isSearching = false;
          if (result['success'] == true) {
            _searchResults = result['users'] as List<User>;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSearching = false;
        });
      }
    }
  }

  Widget _buildInfoRow(String label, String? value, {bool? isPublic}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    value?.isNotEmpty == true ? value! : 'Chưa xác định',
                    style: TextStyle(
                      color: value?.isNotEmpty == true ? Colors.black : Colors.grey,
                    ),
                  ),
                ),
                if (isPublic != null) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: isPublic ? Colors.green[100] : Colors.orange[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      isPublic ? 'Công khai' : 'Riêng tư',
                      style: TextStyle(
                        fontSize: 11,
                        color: isPublic ? Colors.green[800] : Colors.orange[800],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar() {
    final firstLetter = _user?.displayName.isNotEmpty == true
        ? _user!.displayName[0].toUpperCase()
        : 'U';

    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Colors.grey[300]!, width: 2),
      ),
      child: ClipOval(
        child: _user?.avatar != null && _user!.avatar!.isNotEmpty
            ? CachedNetworkImage(
                imageUrl: ApiConfig.getImageUrl(_user!.avatar!),
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.blue[400]!, Colors.purple[400]!],
                    ),
                  ),
                  child: const Center(
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  ),
                ),
                errorWidget: (context, url, error) => Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.blue[400]!, Colors.purple[400]!],
                    ),
                  ),
                  child: Center(
                    child: Text(
                      firstLetter,
                      style: const TextStyle(
                        fontSize: 40,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              )
            : Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.blue[400]!, Colors.purple[400]!],
                  ),
                ),
                child: Center(
                  child: Text(
                    firstLetter,
                    style: const TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildUserSearch() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tìm kiếm người dùng',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Tìm kiếm người dùng khác...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _isSearching
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _searchResults = [];
                              });
                            },
                          )
                        : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              onChanged: (value) {
                if (value.length >= 2) {
                  _searchUsers(value);
                } else {
                  setState(() {
                    _searchResults = [];
                  });
                }
              },
            ),
            // Search results
            if (_searchResults.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(top: 12),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey[300]!),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _searchResults.length > 5 ? 5 : _searchResults.length,
                  separatorBuilder: (context, index) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final user = _searchResults[index];
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.blue[200],
                        backgroundImage: user.avatar != null && user.avatar!.isNotEmpty
                            ? CachedNetworkImageProvider(ApiConfig.getImageUrl(user.avatar!))
                            : null,
                        child: user.avatar == null || user.avatar!.isEmpty
                            ? Text(
                                user.displayName.isNotEmpty
                                    ? user.displayName[0].toUpperCase()
                                    : 'U',
                                style: const TextStyle(color: Colors.white),
                              )
                            : null,
                      ),
                      title: Text(user.displayName),
                      subtitle: Text('@${user.username}'),
                      onTap: () {
                        // Show user info dialog
                        showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: Text(user.displayName),
                            content: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Username: @${user.username}'),
                                if (user.email.isNotEmpty) Text('Email: ${user.email}'),
                                if (user.location != null) Text('Location: ${user.location}'),
                              ],
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: const Text('Đóng'),
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPendingRequests() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.person_add, color: Colors.blue[600], size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Lời mời kết bạn',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (_pendingRequests.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.blue,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${_pendingRequests.length}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 16),
            if (_isRequestsLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (_pendingRequests.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Icon(Icons.group, size: 48, color: Colors.grey[400]),
                      const SizedBox(height: 12),
                      Text(
                        'Không có lời mời kết bạn',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Khi ai đó gửi lời mời kết bạn cho bạn, nó sẽ xuất hiện ở đây.',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[500],
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _pendingRequests.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final request = _pendingRequests[index];
                  final isLoading = _actionLoadingId == request.userId;

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey[300]!),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        // Avatar
                        GestureDetector(
                          onTap: () {
                            // Show user info
                            if (request.user != null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('${request.user!.displayName} (@${request.user!.username})'),
                                  duration: const Duration(seconds: 2),
                                ),
                              );
                            }
                          },
                          child: CircleAvatar(
                            radius: 24,
                            backgroundColor: Colors.blue[200],
                            backgroundImage: request.user?.avatar != null &&
                                    request.user!.avatar!.isNotEmpty
                                ? CachedNetworkImageProvider(
                                    ApiConfig.getImageUrl(request.user!.avatar!))
                                : null,
                            child: request.user?.avatar == null ||
                                    request.user!.avatar!.isEmpty
                                ? Text(
                                    request.user?.displayName?.isNotEmpty == true
                                        ? request.user!.displayName![0].toUpperCase()
                                        : 'U',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  )
                                : null,
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              GestureDetector(
                                onTap: () {
                                  // Show user info
                                  if (request.user != null) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('${request.user!.displayName} (@${request.user!.username})'),
                                        duration: const Duration(seconds: 2),
                                      ),
                                    );
                                  }
                                },
                                child: Text(
                                  request.user?.displayName ?? 'Người dùng không xác định',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _formatDate(request.createdAt),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Actions
                        Column(
                          children: [
                            ElevatedButton(
                              onPressed: isLoading
                                  ? null
                                  : () => _handleAcceptRequest(request.userId),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                minimumSize: const Size(80, 32),
                              ),
                              child: isLoading
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Text('Chấp nhận', style: TextStyle(fontSize: 12)),
                            ),
                            const SizedBox(height: 4),
                            OutlinedButton(
                              onPressed: isLoading
                                  ? null
                                  : () => _handleRejectRequest(request.userId),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                minimumSize: const Size(80, 32),
                              ),
                              child: const Text('Từ chối', style: TextStyle(fontSize: 12)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_user == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Hồ sơ'),
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.person_off,
                  size: 80,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 24),
                const Text(
                  'Chưa đăng nhập',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Vui lòng đăng nhập để xem hồ sơ của bạn',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pushReplacement(
                        MaterialPageRoute(builder: (context) => LoginScreen()),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text(
                      'Đi đến trang đăng nhập',
                      style: TextStyle(fontSize: 16),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: _loadUserData,
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hồ sơ'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              _loadUserData();
              _loadPendingRequests();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await Future.wait([
            _loadUserData(),
            _loadPendingRequests(),
          ]);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // User Information Card
              Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Thông tin người dùng',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Divider(height: 24),

                      // Avatar and Name
                      Row(
                        children: [
                          _buildAvatar(),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _user!.displayName,
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  '@${_user!.username}',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 32),

                      // User Details
                      _buildInfoRow('Tên hiển thị:', _user!.displayName),
                      _buildInfoRow('Tên đăng nhập:', _user!.username),
                      _buildInfoRow('Email:', _user!.email, isPublic: _user!.emailPublic),
                      _buildInfoRow('ID người dùng:', _user!.id.toString()),
                      _buildInfoRow('Sở thích:', _user!.hobby, isPublic: _user!.hobbyPublic),
                      _buildInfoRow('Công ty:', _user!.company, isPublic: _user!.companyPublic),
                      _buildInfoRow('Nghề nghiệp:', _user!.occupation, isPublic: _user!.occupationPublic),
                      _buildInfoRow('Nghề nghiệp chính:', _user!.mainOccupation, isPublic: _user!.mainOccupationPublic),
                      _buildInfoRow('Địa chỉ:', _user!.location, isPublic: _user!.locationPublic),
                      _buildInfoRow('Điện thoại:', _user!.phone, isPublic: _user!.phonePublic),
                      _buildInfoRow('Vai trò:', _user!.role),

                      // Profile Visibility
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(
                              width: 130,
                              child: Text(
                                'Hiển thị hồ sơ:',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: Colors.black87,
                                ),
                              ),
                            ),
                            Expanded(
                              child: Row(
                                children: [
                                  Icon(
                                    _user!.profileVisibility == 'private'
                                        ? Icons.lock
                                        : Icons.public,
                                    size: 16,
                                    color: _user!.profileVisibility == 'private'
                                        ? Colors.orange[700]
                                        : Colors.green[700],
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    _user!.profileVisibility == 'private'
                                        ? 'Riêng tư'
                                        : 'Công khai',
                                    style: TextStyle(
                                      color: _user!.profileVisibility == 'private'
                                          ? Colors.orange[700]
                                          : Colors.green[700],
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Success Message Card
              Card(
                color: Colors.green[50],
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green[700]),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Xác thực thành công với Laravel API',
                              style: TextStyle(
                                color: Colors.green[800],
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Token xác thực của bạn đã được lưu trữ và sẽ được gửi với tất cả các yêu cầu API.',
                        style: TextStyle(
                          color: Colors.green[700],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Actions Card
              Card(
                color: Colors.blue[50],
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hành động',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue[900],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ElevatedButton(
                            onPressed: _navigateToEditProfile,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.orange[600],
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('Chỉnh sửa hồ sơ'),
                          ),
                          ElevatedButton(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (context) => const MyShopScreen(),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.teal[600],
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('Cửa hàng của tôi'),
                          ),
                          ElevatedButton(
                            onPressed: () async {
                              final result = await Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (context) => const MyPostsScreen(),
                                ),
                              );
                              // Reload profile if needed after returning
                              if (result == true && mounted) {
                                _loadUserData();
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green[600],
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('Bài viết của tôi'),
                          ),
                          ElevatedButton(
                            onPressed: () async {
                              final result = await Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (context) => const CreatePostScreen(),
                                ),
                              );
                              // Show success message if post was created
                              if (result == true && mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Bài viết đã được tạo thành công!'),
                                    backgroundColor: Colors.green,
                                  ),
                                );
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue[600],
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('Tạo bài viết mới'),
                          ),
                          ElevatedButton(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (context) => const FriendsListScreen(),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.purple[600],
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('Bạn bè của tôi'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // User Search Card
              _buildUserSearch(),
              const SizedBox(height: 16),

              // Pending Friend Requests Card
              _buildPendingRequests(),
              const SizedBox(height: 16),

              // Logout Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _handleLogout,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red[600],
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text(
                    'Đăng xuất',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
