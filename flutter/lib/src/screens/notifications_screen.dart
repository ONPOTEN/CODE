import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/notification.dart';
import '../providers/notification_provider.dart';
import '../services/api_config.dart';
import 'chat_screen.dart';
import 'post_detail_screen.dart';
import 'group_post_detail_screen.dart';
import 'shop_post_view_screen.dart';
import '../services/message_service.dart';
import '../services/post_service.dart';

class NotificationsScreen extends StatefulWidget {
  @override
  _NotificationsScreenState createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    // Fetch notifications when screen is opened
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().fetchNotifications();
    });
  }

  String _formatRelativeTime(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inSeconds < 60) return 'Vừa xong';
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    if (diff.inDays < 7) return '${diff.inDays} ngày trước';

    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  String _getNotificationText(NotificationModel notification) {
    final type = notification.type;
    final posttype = notification.posttype;

    if (type == 'comment') {
      if (posttype == 'grouppost') return 'đã bình luận về bài viết nhóm của bạn';
      if (posttype == 'post') return 'đã bình luận về bài viết của bạn';
      if (posttype == 'shoppost') return 'đã bình luận về bài viết cửa hàng của bạn';
    }

    if (type == 'like') {
      if (posttype == 'grouppost') return 'đã thích bài viết nhóm của bạn';
      if (posttype == 'post') return 'đã thích bài viết của bạn';
      if (posttype == 'shoppost') return 'đã thích bài viết cửa hàng của bạn';
    }

    if (type == 'message') {
      return 'đã gửi tin nhắn cho bạn';
    }

    return 'thông báo';
  }

  Future<void> _handleNotificationClick(NotificationModel notification) async {
    // Mark as read first
    if (notification.status == 0) {
      context.read<NotificationProvider>().markAsRead(notification.id);
    }

    final posttype = notification.posttype;

    if (posttype == 'message') {
      // Navigate to chat
      // Need to use MessageService.getOrCreateConversation to get conversation object
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );
      try {
        final result = await MessageService.getOrCreateConversation(notification.userid);
        if (mounted) Navigator.pop(context);
        
        if (result['success'] == true && result['conversation'] != null) {
          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ChatScreen(conversation: result['conversation']),
              ),
            );
          }
        }
      } catch (e) {
        if (mounted) Navigator.pop(context);
      }
      return;
    }

    // Handle post navigation
    if (posttype == 'post') {
      // Fetch post then navigate
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );
      try {
        final result = await PostService.getPost(notification.postid);
        if (mounted) Navigator.pop(context);

        if (result['success'] == true && result['post'] != null) {
          if (mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => PostDetailScreen(post: result['post']),
              ),
            );
          }
        }
      } catch (e) {
        if (mounted) Navigator.pop(context);
      }
    } else if (posttype == 'grouppost') {
      Navigator.pushNamed(
        context,
        '/group-post',
        arguments: notification.postid,
      );
    } else if (posttype == 'shoppost') {
      // In a real app we'd fetch the shop post and navigate, or just use a generic route.
      // Assuming generic ShopPostViewScreen doesn't exist yet, we do nothing or show a toast.
    }
  }

  Widget _buildTypeIcon(String type) {
    if (type == 'comment') {
      return Container(
        width: 20,
        height: 20,
        decoration: const BoxDecoration(
          color: Colors.blue,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.comment, size: 12, color: Colors.white),
      );
    }
    if (type == 'like') {
      return Container(
        width: 20,
        height: 20,
        decoration: const BoxDecoration(
          color: Colors.red,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.favorite, size: 12, color: Colors.white),
      );
    }
    if (type == 'message') {
      return Container(
        width: 20,
        height: 20,
        decoration: const BoxDecoration(
          color: Colors.green,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.chat, size: 12, color: Colors.white),
      );
    }
    return const SizedBox.shrink();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: const Text('Thông báo'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: Colors.grey[200], height: 1),
        ),
        actions: [
          Consumer<NotificationProvider>(
            builder: (context, provider, _) {
              if (provider.unreadCount > 0) {
                return TextButton(
                  onPressed: () {
                    provider.markAllAsRead();
                  },
                  child: const Text(
                    'Đánh dấu tất cả đã đọc',
                    style: TextStyle(color: Colors.blue, fontWeight: FontWeight.w500),
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ],
      ),
      body: Consumer<NotificationProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading && provider.notifications.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none, size: 64, color: Colors.grey[300]),
                  const SizedBox(height: 16),
                  Text('Chưa có thông báo nào', style: TextStyle(color: Colors.grey[500])),
                ],
              ),
            );
          }

          return ListView.builder(
            itemCount: provider.notifications.length,
            itemBuilder: (context, index) {
              final notification = provider.notifications[index];
              final user = provider.getUser(notification.userid);
              final isUnread = notification.status == 0;
              final avatar = user?.avatar;
              final username = user?.displayName ?? user?.username ?? notification.username ?? 'Người dùng';

              return InkWell(
                onTap: () => _handleNotificationClick(notification),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isUnread ? Colors.blue[50] : Colors.white,
                    border: Border(
                      bottom: BorderSide(color: Colors.grey[200]!, width: 1),
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Avatar
                      Stack(
                        children: [
                          CircleAvatar(
                            radius: 24,
                            backgroundColor: Colors.grey[300],
                            backgroundImage: avatar != null && avatar.isNotEmpty
                                ? CachedNetworkImageProvider(ApiConfig.getImageUrl(avatar))
                                : null,
                            child: avatar == null || avatar.isEmpty
                                ? Text(
                                    username.isNotEmpty ? username[0].toUpperCase() : 'U',
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18,
                                    ),
                                  )
                                : null,
                          ),
                          Positioned(
                            bottom: -2,
                            right: -2,
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                              padding: const EdgeInsets.all(2),
                              child: _buildTypeIcon(notification.type),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 12),
                      
                      // Content
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            RichText(
                              text: TextSpan(
                                style: const TextStyle(
                                  color: Colors.black87,
                                  fontSize: 14,
                                  height: 1.3,
                                ),
                                children: [
                                  TextSpan(
                                    text: username,
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  const TextSpan(text: ' '),
                                  TextSpan(
                                    text: _getNotificationText(notification),
                                  ),
                                ],
                              ),
                            ),
                            if (notification.content.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                notification.content,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(color: Colors.grey[600], fontSize: 13),
                              ),
                            ],
                            const SizedBox(height: 4),
                            Text(
                              _formatRelativeTime(notification.createdAt),
                              style: TextStyle(
                                color: isUnread ? Colors.blue[600] : Colors.grey[500],
                                fontSize: 12,
                                fontWeight: isUnread ? FontWeight.w500 : FontWeight.normal,
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      // Unread Dot
                      if (isUnread)
                        Container(
                          margin: const EdgeInsets.only(left: 8, top: 12),
                          width: 10,
                          height: 10,
                          decoration: const BoxDecoration(
                            color: Colors.blue,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
