import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/conversation.dart';
import '../services/message_service.dart';
import '../services/socket_service.dart';
import '../services/api_config.dart';
import 'chat_screen.dart';

class ConversationsScreen extends StatefulWidget {
  const ConversationsScreen({Key? key}) : super(key: key);

  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  List<Conversation> _conversations = [];
  bool _isLoading = true;
  String? _errorMessage;
  final SocketService _socketService = SocketService();

  @override
  void initState() {
    super.initState();
    _loadConversations();
    _listenToNewMessages();
  }

  Future<void> _loadConversations() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await MessageService.getConversations();

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (result['success']) {
          _conversations = result['conversations'] ?? [];
        } else {
          _errorMessage = result['message'];
        }
      });
    }
  }

  void _listenToNewMessages() {
    _socketService.messageStream.listen((message) {
      // Reload conversations when new message is received
      _loadConversations();
    });
  }

  String _formatTime(String? timestamp) {
    if (timestamp == null) return '';

    try {
      final DateTime dateTime = DateTime.parse(timestamp);
      final DateTime now = DateTime.now();
      final Duration difference = now.difference(dateTime);

      if (difference.inDays == 0) {
        // Today - show time
        return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
      } else if (difference.inDays == 1) {
        return 'Hôm qua';
      } else if (difference.inDays < 7) {
        // This week - show day name in Vietnamese
        const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        return days[dateTime.weekday - 1];
      } else {
        // Older - show date
        return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
      }
    } catch (e) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tin nhắn'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Tìm kiếm - Sắp ra mắt'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text(
              'Đang tải tin nhắn...',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
              const SizedBox(height: 16),
              Text(
                'Không thể tải tin nhắn',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600]),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _loadConversations,
                icon: const Icon(Icons.refresh),
                label: const Text('Thử lại'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_conversations.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.chat_bubble_outline,
                  size: 48,
                  color: Colors.grey[400],
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Chưa có tin nhắn',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Chọn từ danh sách bạn bè để bắt đầu nhắn tin',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadConversations,
      child: ListView.separated(
        itemCount: _conversations.length,
        separatorBuilder: (context, index) => Divider(
          height: 1,
          indent: 76,
          color: Colors.grey[200],
        ),
        itemBuilder: (context, index) {
          final conversation = _conversations[index];
          return _buildConversationTile(conversation);
        },
      ),
    );
  }

  Widget _buildConversationTile(Conversation conversation) {
    final hasUnread = conversation.hasUnreadMessages();
    final lastMessageText = conversation.lastMessageText ?? 'Chưa có tin nhắn';
    final isLastMessageMine = conversation.isLastMessageMine ?? false;
    final otherUserAvatar = conversation.otherUser['avatar'] as String?;
    final firstLetter = conversation.otherUserName.isNotEmpty
        ? conversation.otherUserName[0].toUpperCase()
        : 'U';

    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => ChatScreen(conversation: conversation),
          ),
        ).then((_) {
          // Reload conversations when returning from chat
          _loadConversations();
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        color: hasUnread ? Colors.blue.withOpacity(0.05) : Colors.transparent,
        child: Row(
          children: [
            // Avatar
            Stack(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: hasUnread ? Colors.blue : Colors.grey[300]!,
                      width: hasUnread ? 2 : 1,
                    ),
                  ),
                  child: ClipOval(
                    child: otherUserAvatar != null && otherUserAvatar.isNotEmpty
                        ? CachedNetworkImage(
                            imageUrl: ApiConfig.getImageUrl(otherUserAvatar),
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: Colors.blue[100],
                              child: Center(
                                child: Text(
                                  firstLetter,
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.blue,
                                  ),
                                ),
                              ),
                            ),
                            errorWidget: (context, url, error) => Container(
                              color: Colors.blue[100],
                              child: Center(
                                child: Text(
                                  firstLetter,
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.blue,
                                  ),
                                ),
                              ),
                            ),
                          )
                        : Container(
                            color: Colors.blue[100],
                            child: Center(
                              child: Text(
                                firstLetter,
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue,
                                ),
                              ),
                            ),
                          ),
                  ),
                ),
                // Online indicator (placeholder - you can connect to real online status)
                Positioned(
                  bottom: 2,
                  right: 2,
                  child: Container(
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 12),

            // Conversation info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name and time row
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          conversation.otherUserName,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: hasUnread ? FontWeight.bold : FontWeight.w600,
                            color: Colors.grey[900],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _formatTime(conversation.lastMessageTime),
                        style: TextStyle(
                          fontSize: 12,
                          color: hasUnread ? Colors.blue : Colors.grey[500],
                          fontWeight: hasUnread ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),

                  // Last message row
                  Row(
                    children: [
                      if (isLastMessageMine) ...[
                        Icon(
                          Icons.done_all,
                          size: 16,
                          color: Colors.blue[400],
                        ),
                        const SizedBox(width: 4),
                      ],
                      Expanded(
                        child: Text(
                          isLastMessageMine ? 'Bạn: $lastMessageText' : lastMessageText,
                          style: TextStyle(
                            fontSize: 14,
                            color: hasUnread ? Colors.grey[800] : Colors.grey[600],
                            fontWeight: hasUnread ? FontWeight.w500 : FontWeight.normal,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Unread badge
            if (hasUnread) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  conversation.unreadCount > 99 ? '99+' : '${conversation.unreadCount}',
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
      ),
    );
  }
}
