import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/user.dart';
import '../services/api_config.dart';
import '../services/auth_storage.dart';
import '../services/friend_service.dart';
import '../services/message_service.dart';
import 'chat_screen.dart';

class UserProfileScreen extends StatefulWidget {
  final int userId;

  const UserProfileScreen({Key? key, required this.userId}) : super(key: key);

  @override
  State<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends State<UserProfileScreen> {
  User? _user;
  bool _isLoading = true;
  String? _error;
  int? _currentUserId;
  bool _isActionLoading = false;
  bool _isMessageLoading = false;

  // Friendship status
  bool _isFriend = false;
  bool _friendRequestSent = false;
  bool _friendRequestReceived = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentUserId();
    _loadUserProfile();
  }

  Future<void> _loadCurrentUserId() async {
    final userId = await AuthStorage.getUserId();
    if (mounted) {
      setState(() {
        _currentUserId = userId;
      });
    }
  }

  Future<void> _loadUserProfile() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        setState(() {
          _isLoading = false;
          _error = 'Vui lòng đăng nhập để xem hồ sơ';
        });
        return;
      }

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/users/${widget.userId}')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        final userData = data['data'] ?? data;
        setState(() {
          _user = User.fromJson(userData);
          _isFriend = userData['is_friend'] == true;
          _friendRequestSent = userData['friend_request_sent'] == true;
          _friendRequestReceived = userData['friend_request_received'] == true;
          _isLoading = false;
        });
      } else {
        setState(() {
          _isLoading = false;
          _error = data['message'] ?? 'Không thể tải hồ sơ người dùng';
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Lỗi: ${e.toString()}';
      });
    }
  }

  Future<void> _sendFriendRequest() async {
    if (_user == null) return;

    setState(() {
      _isActionLoading = true;
    });

    try {
      final result = await FriendService.sendFriendRequest(_user!.id);

      if (mounted) {
        if (result['success'] == true) {
          setState(() {
            _friendRequestSent = true;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đã gửi lời mời kết bạn!'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Không thể gửi lời mời kết bạn'),
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
          _isActionLoading = false;
        });
      }
    }
  }

  Future<void> _acceptFriendRequest() async {
    if (_user == null) return;

    setState(() {
      _isActionLoading = true;
    });

    try {
      final result = await FriendService.acceptFriendRequest(_user!.id);

      if (mounted) {
        if (result['success'] == true) {
          setState(() {
            _isFriend = true;
            _friendRequestReceived = false;
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
              content: Text(result['message'] ?? 'Không thể chấp nhận lời mời'),
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
          _isActionLoading = false;
        });
      }
    }
  }

  Future<void> _rejectFriendRequest() async {
    if (_user == null) return;

    setState(() {
      _isActionLoading = true;
    });

    try {
      final result = await FriendService.rejectFriendRequest(_user!.id);

      if (mounted) {
        if (result['success'] == true) {
          setState(() {
            _friendRequestReceived = false;
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
              content: Text(result['message'] ?? 'Không thể từ chối lời mời'),
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
          _isActionLoading = false;
        });
      }
    }
  }

  Future<void> _unfriend() async {
    if (_user == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hủy kết bạn'),
        content: Text('Bạn có chắc muốn hủy kết bạn với ${_user!.displayName}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() {
      _isActionLoading = true;
    });

    try {
      final result = await FriendService.unfriend(_user!.id);

      if (mounted) {
        if (result['success'] == true) {
          setState(() {
            _isFriend = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đã hủy kết bạn'),
              backgroundColor: Colors.orange,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Không thể hủy kết bạn'),
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
          _isActionLoading = false;
        });
      }
    }
  }

  Future<void> _navigateToChat() async {
    if (_user == null) return;

    setState(() {
      _isMessageLoading = true;
    });

    try {
      final result = await MessageService.getOrCreateConversation(_user!.id);

      if (mounted) {
        setState(() {
          _isMessageLoading = false;
        });

        if (result['success'] == true && result['conversation'] != null) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => ChatScreen(conversation: result['conversation']),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Không thể tạo cuộc trò chuyện'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isMessageLoading = false;
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

  Widget _buildAvatar() {
    final firstLetter = _user?.displayName.isNotEmpty == true
        ? _user!.displayName[0].toUpperCase()
        : 'U';

    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Colors.grey[300]!, width: 3),
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
                errorWidget: (context, url, error) => _buildAvatarFallback(firstLetter),
              )
            : _buildAvatarFallback(firstLetter),
      ),
    );
  }

  Widget _buildAvatarFallback(String letter) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue[400]!, Colors.purple[400]!],
        ),
      ),
      child: Center(
        child: Text(
          letter,
          style: const TextStyle(
            fontSize: 40,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String? value) {
    if (value == null || value.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
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
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    final isOwnProfile = _currentUserId == _user?.id;
    if (isOwnProfile || _user == null) return const SizedBox.shrink();

    return Column(
      children: [
        // Message button
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _isMessageLoading ? null : _navigateToChat,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                icon: _isMessageLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.chat_bubble_outline),
                label: Text(_isMessageLoading ? 'Đang tải...' : 'Nhắn tin'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Friend action buttons
        if (_friendRequestReceived) ...[
          // Show accept/reject buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isActionLoading ? null : _acceptFriendRequest,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  icon: _isActionLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.check),
                  label: const Text('Chấp nhận'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isActionLoading ? null : _rejectFriendRequest,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  icon: const Icon(Icons.close),
                  label: const Text('Từ chối'),
                ),
              ),
            ],
          ),
        ] else if (_isFriend) ...[
          // Show unfriend button
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _isActionLoading ? null : _unfriend,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  icon: _isActionLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.person_remove),
                  label: const Text('Hủy kết bạn'),
                ),
              ),
            ],
          ),
        ] else if (_friendRequestSent) ...[
          // Show pending button
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.grey[400],
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  icon: const Icon(Icons.hourglass_empty),
                  label: const Text('Đã gửi lời mời'),
                ),
              ),
            ],
          ),
        ] else ...[
          // Show add friend button
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isActionLoading ? null : _sendFriendRequest,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  icon: _isActionLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.person_add),
                  label: Text(_isActionLoading ? 'Đang gửi...' : 'Thêm bạn'),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_user?.displayName ?? 'Hồ sơ người dùng'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : _buildProfileContent(),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
            const SizedBox(height: 16),
            Text(
              _error ?? 'Đã xảy ra lỗi',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loadUserProfile,
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileContent() {
    if (_user == null) return const SizedBox.shrink();

    return RefreshIndicator(
      onRefresh: _loadUserProfile,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Avatar
            _buildAvatar(),
            const SizedBox(height: 16),

            // Name and username
            Text(
              _user!.displayName,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              '@${_user!.username}',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),

            // Friend badge
            if (_isFriend) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.green[100],
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle, size: 16, color: Colors.green[700]),
                    const SizedBox(width: 6),
                    Text(
                      'Bạn bè',
                      style: TextStyle(
                        color: Colors.green[700],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Action buttons
            _buildActionButtons(),

            const SizedBox(height: 24),

            // User details card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Thông tin',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Divider(height: 24),
                    _buildInfoRow(Icons.email, 'Email', _user!.email),
                    _buildInfoRow(Icons.phone, 'Điện thoại', _user!.phone),
                    _buildInfoRow(Icons.location_on, 'Địa chỉ', _user!.location),
                    _buildInfoRow(Icons.business, 'Công ty', _user!.company),
                    _buildInfoRow(Icons.work, 'Nghề nghiệp', _user!.occupation),
                    _buildInfoRow(Icons.star, 'Nghề nghiệp chính', _user!.mainOccupation),
                    _buildInfoRow(Icons.favorite, 'Sở thích', _user!.hobby),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
