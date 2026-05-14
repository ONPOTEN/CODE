import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/user.dart';
import '../services/user_service.dart';
import '../services/friend_service.dart';
import '../services/auth_storage.dart';
import '../services/api_config.dart';
import '../screens/user_profile_screen.dart';

class FriendSuggestions extends StatefulWidget {
  final int page;

  const FriendSuggestions({Key? key, this.page = 1}) : super(key: key);

  @override
  _FriendSuggestionsState createState() => _FriendSuggestionsState();
}

class _FriendSuggestionsState extends State<FriendSuggestions> {
  List<User> _suggestions = [];
  bool _isLoading = true;
  int? _currentUserId;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    _currentUserId = await AuthStorage.getUserId();
    
    if (_currentUserId != null) {
      await _fetchSuggestions();
    } else {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _fetchSuggestions() async {
    try {
      if (mounted) {
        setState(() {
          _isLoading = true;
        });
      }

      final result = await UserService.getUsers(page: widget.page, perPage: 8);

      if (mounted) {
        if (result['success'] == true) {
          final allUsers = result['users'] as List<User>;
          
          // Filter out current user and users who are already friends
          final filtered = allUsers.where((u) => 
            u.id != _currentUserId && !u.isFriend
          ).toList();
          
          setState(() {
            _suggestions = filtered;
            _isLoading = false;
          });
        } else {
          setState(() {
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleAddFriend(int userId, int index) async {
    try {
      final result = await FriendService.sendFriendRequest(userId);
      
      if (result['success'] == true) {
        if (mounted) {
          setState(() {
            // Optimistically update UI
            if (index < _suggestions.length) {
              final oldUser = _suggestions[index];
              final userJson = oldUser.toJson();
              userJson['friend_request_sent'] = true;
              _suggestions[index] = User.fromJson(userJson);
            }
          });
        }
      } else {
        if (result['message'] != null && result['message'].toString().contains('already friends')) {
          if (mounted) {
            setState(() {
              if (index < _suggestions.length) {
                final oldUser = _suggestions[index];
                final userJson = oldUser.toJson();
                userJson['is_friend'] = true;
                _suggestions[index] = User.fromJson(userJson);
              }
            });
          }
        } else {
          _showError('Không thể gửi lời mời kết bạn');
        }
      }
    } catch (e) {
      _showError('Lỗi: ${e.toString()}');
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _suggestions.isEmpty) {
      return const SizedBox.shrink();
    }

    if (_suggestions.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.symmetric(
          horizontal: BorderSide(color: Colors.grey[200]!, width: 1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Gợi ý kết bạn',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Colors.grey[800],
                  ),
                ),
                GestureDetector(
                  onTap: () {
                    // Navigate to friends page if it exists
                    // Navigator.pushNamed(context, '/friends');
                  },
                  child: Text(
                    'Xem tất cả',
                    style: TextStyle(
                      color: Colors.blue[600],
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            height: 240, // Fixed height for horizontal list
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(left: 16, right: 8, bottom: 20),
              itemCount: _suggestions.length,
              itemBuilder: (context, index) {
                final user = _suggestions[index];
                final avatarUrl = user.avatar != null && user.avatar!.isNotEmpty
                    ? ApiConfig.getImageUrl(user.avatar!)
                    : null;

                return Container(
                  width: 140,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: Colors.grey[200]!),
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => UserProfileScreen(userId: user.id),
                            ),
                          );
                        },
                        child: ClipRRect(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                          child: Container(
                            height: 135,
                            width: 140,
                            color: Colors.grey[100],
                            child: avatarUrl != null
                                ? CachedNetworkImage(
                                    imageUrl: avatarUrl,
                                    fit: BoxFit.cover,
                                    placeholder: (context, url) => Center(
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor: AlwaysStoppedAnimation<Color>(Colors.grey[400]!),
                                      ),
                                    ),
                                    errorWidget: (context, url, error) => _buildDefaultAvatar(),
                                  )
                                : _buildDefaultAvatar(),
                          ),
                        ),
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => UserProfileScreen(userId: user.id),
                                    ),
                                  );
                                },
                                child: Text(
                                  user.displayName.isNotEmpty ? user.displayName : user.username,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                    color: Colors.grey[900],
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              SizedBox(
                                width: double.infinity,
                                child: user.isFriend
                                    ? ElevatedButton(
                                        onPressed: null,
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.grey[100],
                                          foregroundColor: Colors.grey[500],
                                          elevation: 0,
                                          padding: const EdgeInsets.symmetric(vertical: 8),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          minimumSize: const Size.fromHeight(36),
                                        ),
                                        child: const Text('Bạn bè', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                      )
                                    : user.friendRequestSent
                                        ? ElevatedButton(
                                            onPressed: null,
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.grey[100],
                                              foregroundColor: Colors.grey[500],
                                              elevation: 0,
                                              padding: const EdgeInsets.symmetric(vertical: 8),
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              minimumSize: const Size.fromHeight(36),
                                            ),
                                            child: const Text('Đã gửi', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                          )
                                        : ElevatedButton(
                                            onPressed: () => _handleAddFriend(user.id, index),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.blue[50],
                                              foregroundColor: Colors.blue[600],
                                              elevation: 0,
                                              padding: const EdgeInsets.symmetric(vertical: 8),
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              minimumSize: const Size.fromHeight(36),
                                            ),
                                            child: const Text('Thêm bạn', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                          ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDefaultAvatar() {
    return Container(
      color: Colors.grey[200],
      child: Center(
        child: Icon(
          Icons.person,
          size: 64,
          color: Colors.grey[400],
        ),
      ),
    );
  }
}
