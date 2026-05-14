import 'package:flutter/material.dart';
import 'dart:async';
import '../models/conversation.dart';
import '../services/chat_service.dart';
import '../services/socket_service.dart';
import '../services/auth_storage.dart';
import 'video_room_screen.dart';

/// Enhanced chat screen with video call integration
/// Room name is in format: "{host roomid} - {remote roomid}" (e.g., "123 - 456")
class ChatWindowScreen extends StatefulWidget {
  final Conversation conversation;
  final VoidCallback? onMessageSent;

  const ChatWindowScreen({
    Key? key,
    required this.conversation,
    this.onMessageSent,
  }) : super(key: key);

  @override
  State<ChatWindowScreen> createState() => _ChatWindowScreenState();
}

class _ChatWindowScreenState extends State<ChatWindowScreen> {
  late ChatService _chatService;
  late SocketService _socketService;

  final List<ChatMessage> _messages = [];
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  bool _isLoading = true;
  bool _isSending = false;
  String? _errorMessage;
  String? _roomName;
  int? _currentUserId;
  bool _isVideoCallActive = false;

  // Real-time features
  bool _remoteUserIsTyping = false;
  bool _remoteUserIsOnline = false;
  late StreamSubscription _typingSubscription;
  late Timer _typingDebounceTimer;
  bool _isLocalUserTyping = false;
  Map<int, bool> _messageReadStatus = {}; // Track read status by message ID

  @override
  void initState() {
    super.initState();
    _chatService = ChatService();
    _socketService = SocketService();
    _initializeChat();
  }

  Future<void> _initializeChat() async {
    try {
      // Get current user ID
      _currentUserId = await AuthStorage.getUserId();
      print('ChatWindowScreen - Current user ID: $_currentUserId');

      // Load messages
      await _loadMessages();

      // Ensure Socket.IO is connected before joining room
      if (!_socketService.isConnected) {
        print('ChatWindowScreen - Socket not connected, attempting to connect...');
        try {
          await _socketService.connect('https://socket.centimet2.com');
          print('ChatWindowScreen - Socket connected successfully');

          // Wait a bit for socket to fully initialize
          await Future.delayed(const Duration(milliseconds: 500));
        } catch (e) {
          print('ChatWindowScreen - Failed to connect socket: $e');
          if (mounted) {
            setState(() {
              _errorMessage = 'Failed to connect to chat server: $e';
              _isLoading = false;
            });
          }
          return;
        }
      }

      // Verify socket is actually connected before joining room
      if (!_socketService.isConnected) {
        print('ChatWindowScreen - Socket connection failed, not joining room');
        if (mounted) {
          setState(() {
            _errorMessage = 'Socket is not connected. Please check your internet connection.';
            _isLoading = false;
          });
        }
        return;
      }

      // Join the chat room on Socket.IO (socket is definitely connected now)
      if (_roomName != null) {
        _socketService.joinChatRoom(_roomName!);
        print('ChatWindowScreen - Joined room: $_roomName');
      } else {
        print('ChatWindowScreen - Room name is null, cannot join room');
      }

      // Notify backend that user is online
      _socketService.updateOnlineStatus(isOnline: true);

      // Listen for new messages from Socket.IO
      _socketService.messageStream.listen((message) {
        if (mounted) {
          _loadMessages(); // Reload to stay in sync
        }
      });

      // Listen for typing indicators and status updates
      _typingSubscription = _socketService.typingStream.listen((data) {
        if (mounted) {
          _handleTypingEvent(data);
        }
      });
    } catch (e) {
      print('ChatWindowScreen - Error initializing: $e');
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to initialize chat: $e';
          _isLoading = false;
        });
      }
    }
  }

  /// Handle typing and status events from socket
  void _handleTypingEvent(Map<String, dynamic> data) {
    final type = data['type'] ?? '';

    if (type == 'message-read') {
      final messageId = data['messageId'];
      if (messageId != null && mounted) {
        setState(() {
          _messageReadStatus[messageId] = true;
        });
      }
    } else if (type == 'online-status') {
      final isOnline = data['isOnline'] ?? false;
      if (mounted) {
        setState(() {
          _remoteUserIsOnline = isOnline;
        });
      }
    } else {
      // Regular typing indicator
      final isTyping = data['isTyping'] ?? false;
      if (mounted) {
        setState(() {
          _remoteUserIsTyping = isTyping;
        });
      }
    }
  }

  Future<void> _loadMessages() async {
    try {
      if (mounted) {
        setState(() {
          _isLoading = true;
          _errorMessage = null;
        });
      }

      final result =
          await _chatService.getMessages(widget.conversation.id);

      if (mounted) {
        setState(() {
          _isLoading = false;
          _messages.clear();
          _messages.addAll(result['messages'] ?? []);
          _roomName = result['room_name'] as String?;
          print('ChatWindowScreen - Loaded ${_messages.length} messages');
          print('ChatWindowScreen - Room name: $_roomName');
        });

        _scrollToBottom();
      }
    } catch (e) {
      print('ChatWindowScreen - Error loading messages: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Failed to load messages: $e';
        });
      }
    }
  }

  /// Send typing indicator with debounce
  void _sendTypingIndicator(bool isTyping) {
    // Clear previous timer
    _typingDebounceTimer.cancel();

    if (_roomName == null || _currentUserId == null) return;

    if (isTyping && !_isLocalUserTyping) {
      _isLocalUserTyping = true;
      _socketService.sendTyping(
        roomName: _roomName!,
        userId: _currentUserId!,
        isTyping: true,
      );

      // Auto-stop typing after 3 seconds of no input
      _typingDebounceTimer = Timer(const Duration(seconds: 3), () {
        _stopTypingIndicator();
      });
    }
  }

  /// Stop typing indicator
  void _stopTypingIndicator() {
    if (!_isLocalUserTyping) return;

    _isLocalUserTyping = false;
    if (_roomName != null && _currentUserId != null) {
      _socketService.sendTyping(
        roomName: _roomName!,
        userId: _currentUserId!,
        isTyping: false,
      );
    }
  }

  /// Mark all unread messages as read
  void _markMessagesAsRead() {
    if (_roomName == null) return;

    for (final message in _messages) {
      if (!message.isRead && !message.isMine) {
        _socketService.markMessageAsRead(
          roomName: _roomName!,
          messageId: message.id,
        );
      }
    }
  }

  Future<void> _sendMessage() async {
    final messageText = _messageController.text.trim();
    if (messageText.isEmpty || _isSending) return;

    if (mounted) {
      setState(() {
        _isSending = true;
      });
    }

    _messageController.clear();
    _stopTypingIndicator(); // Stop typing when sending

    try {
      final message =
          await _chatService.sendMessage(widget.conversation.id, messageText);

      if (mounted) {
        setState(() {
          _messages.add(message);
          _isSending = false;
        });
        _scrollToBottom();

        widget.onMessageSent?.call();
      }
    } catch (e) {
      print('ChatWindowScreen - Error sending message: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send message: $e'),
            backgroundColor: Colors.red,
          ),
        );

        setState(() {
          _isSending = false;
        });

        // Restore message
        _messageController.text = messageText;
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _startVideoCall() async {
    try {
      if (_roomName == null || _roomName!.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Room not initialized. Please refresh.'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      print(
          'ChatWindowScreen - Starting video call with room: $_roomName');

      if (mounted) {
        setState(() {
          _isVideoCallActive = true;
        });

        // Navigate to video room screen
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => VideoRoomScreen(
              roomId: _roomName!,
              serverUrl: 'https://socket.centimet2.com',
            ),
          ),
        );

        if (mounted) {
          setState(() {
            _isVideoCallActive = false;
          });
        }
      }
    } catch (e) {
      print('ChatWindowScreen - Error starting video call: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to start video call: $e'),
            backgroundColor: Colors.red,
          ),
        );

        setState(() {
          _isVideoCallActive = false;
        });
      }
    }
  }

  /// Build video call button - GREEN color
  /// Shows call icon + text when not in call, red animated when in call
  Widget _buildVideoCallButton() {
    final isInCall = _isVideoCallActive;

    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isInCall ? null : _startVideoCall,
          borderRadius: BorderRadius.circular(10),
          splashColor: Colors.white.withValues(alpha: 0.3),
          hoverColor: Colors.white.withValues(alpha: 0.1),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              // GREEN when not in call, RED when in call
              color: isInCall ? Colors.red.shade600 : Colors.green.shade600,
              borderRadius: BorderRadius.circular(10),
              boxShadow: isInCall
                  ? [
                      BoxShadow(
                        color: Colors.red.withValues(alpha: 0.6),
                        blurRadius: 10,
                        spreadRadius: 2,
                        offset: const Offset(0, 2),
                      ),
                    ]
                  : [
                      BoxShadow(
                        color: Colors.green.withValues(alpha: 0.3),
                        blurRadius: 6,
                        spreadRadius: 1,
                        offset: const Offset(0, 2),
                      ),
                    ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Video camera icon
                Icon(
                  isInCall ? Icons.videocam_off : Icons.videocam,
                  color: Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                // Text label
                Text(
                  isInCall ? 'End Call' : 'Video Call',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    // Stop typing indicator
    _stopTypingIndicator();
    _typingDebounceTimer.cancel();

    // Leave the chat room
    if (_roomName != null) {
      _socketService.leaveChatRoom(_roomName!);
      print('ChatWindowScreen - Left room: $_roomName');
    }

    // Notify that user is offline
    _socketService.updateOnlineStatus(isOnline: false);

    // Cancel subscriptions
    _typingSubscription.cancel();

    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.conversation.otherUserName),
            Row(
              children: [
                // Socket connection status
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _socketService.isConnected ? Colors.green : Colors.yellow,
                  ),
                  margin: const EdgeInsets.only(right: 6),
                ),
                // Status text - shows typing or online status
                Expanded(
                  child: Text(
                    _remoteUserIsTyping
                        ? 'typing...'
                        : _remoteUserIsOnline
                            ? 'Online'
                            : _socketService.isConnected
                                ? 'Offline'
                                : 'Connecting...',
                    style: TextStyle(
                      fontSize: 12,
                      color: _remoteUserIsTyping
                          ? Colors.lightBlue[200]
                          : Colors.white70,
                      fontStyle: _remoteUserIsTyping
                          ? FontStyle.italic
                          : FontStyle.normal,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
        elevation: 2,
        actions: [
          // Video call button - matching Next.js style
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: _buildVideoCallButton(),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 48,
              color: Colors.red[300],
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.red,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadMessages,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Messages list
        Expanded(
          child: _messages.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.chat_bubble_outline,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No messages yet',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[600],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Start the conversation!',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    return _buildMessageBubble(_messages[index]);
                  },
                ),
        ),

        // Message input
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 5,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  decoration: InputDecoration(
                    hintText: 'Type a message...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                    filled: true,
                    fillColor: Colors.grey[100],
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 10,
                    ),
                  ),
                  maxLines: null,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _sendMessage(),
                  onChanged: (_) => _sendTypingIndicator(true),
                  enabled: !_isSending,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.indigo,
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  icon: _isSending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Icon(Icons.send, color: Colors.white),
                  onPressed: _isSending ? null : _sendMessage,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Build message status icon (for sent messages)
  Widget _buildMessageStatusIcon(ChatMessage message) {
    if (!message.isMine) return const SizedBox.shrink();

    final isRead = _messageReadStatus[message.id] ?? message.isRead;

    if (isRead) {
      return Tooltip(
        message: 'Read',
        child: Icon(
          Icons.done_all,
          size: 16,
          color: Colors.lightBlue[200],
        ),
      );
    } else {
      return Tooltip(
        message: 'Sent',
        child: Icon(
          Icons.done,
          size: 16,
          color: Colors.white70,
        ),
      );
    }
  }

  Widget _buildMessageBubble(ChatMessage message) {
    final isMine = message.isMine;
    final senderName = message.senderName;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment:
            isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMine) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: Colors.indigo.shade200,
              child: Text(
                senderName.isNotEmpty ? senderName[0].toUpperCase() : '?',
                style: const TextStyle(fontSize: 12, color: Colors.white),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isMine)
                  Padding(
                    padding: const EdgeInsets.only(left: 12, bottom: 4),
                    child: Text(
                      senderName,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: isMine ? Colors.indigo : Colors.grey[200],
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(18),
                      topRight: const Radius.circular(18),
                      bottomLeft: isMine
                          ? const Radius.circular(18)
                          : const Radius.circular(4),
                      bottomRight: isMine
                          ? const Radius.circular(4)
                          : const Radius.circular(18),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        message.message,
                        style: TextStyle(
                          color: isMine ? Colors.white : Colors.black87,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            ChatService.formatTime(message.createdAt),
                            style: TextStyle(
                              color:
                                  isMine ? Colors.white70 : Colors.grey[600],
                              fontSize: 11,
                            ),
                          ),
                          if (isMine) ...[
                            const SizedBox(width: 4),
                            _buildMessageStatusIcon(message),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (isMine) const SizedBox(width: 8),
          if (isMine)
            CircleAvatar(
              radius: 16,
              backgroundColor: Colors.indigo[300],
              child: const Text(
                'Me',
                style: TextStyle(fontSize: 10, color: Colors.white),
              ),
            ),
        ],
      ),
    );
  }
}
