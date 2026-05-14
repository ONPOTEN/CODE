import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/conversation.dart';
import '../models/message.dart';
import '../services/message_service.dart';
import '../services/socket_service.dart';
import '../services/auth_storage.dart';
import '../services/api_config.dart';
import '../widgets/html_content_widget.dart';
import 'video_room_screen.dart';
import 'package:flutter/services.dart';
import '../widgets/pinned_messages_bar.dart';

class ChatScreen extends StatefulWidget {
  final Conversation conversation;

  const ChatScreen({
    Key? key,
    required this.conversation,
  }) : super(key: key);

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final List<Message> _messages = [];
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final SocketService _socketService = SocketService();

  bool _isLoading = true;
  bool _isSending = false;
  String? _errorMessage;
  String? _roomName;
  int? _currentUserId;
  bool _isVideoCallActive = false;
  Message? _replyingToMessage;
  final FocusNode _messageFocusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _initializeChat();
  }

  Future<void> _initializeChat() async {
    // Get current user ID
    _currentUserId = await AuthStorage.getUserId();

    // Load messages
    await _loadMessages();

    // Join the chat room
    if (_roomName != null) {
      _socketService.joinChatRoom(_roomName!);
    }

    // Listen for new messages
    _socketService.messageStream.listen((message) {
      if (message.conversationId == widget.conversation.id) {
        setState(() {
          _messages.add(message);
        });
        _scrollToBottom();
      }
    });
  }

  Future<void> _loadMessages() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await MessageService.getMessages(widget.conversation.id);

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (result['success']) {
          _messages.clear();
          _messages.addAll(result['messages'] ?? []);
          _roomName = result['room_name'];
        } else {
          _errorMessage = result['message'];
        }
      });

      _scrollToBottom();
    }
  }

  Future<void> _sendMessage() async {
    final messageText = _messageController.text.trim();
    if (messageText.isEmpty || _isSending) return;

    setState(() {
      _isSending = true;
    });

    _messageController.clear();
    final currentReply = _replyingToMessage;
    setState(() {
      _replyingToMessage = null;
    });

    try {
      final result = await MessageService.sendMessage(
        conversationId: widget.conversation.id,
        message: messageText,
        replyToMessageId: _replyingToMessage?.id,
      );

      if (result['success']) {
        final sentMessage = result['message_object'] as Message;
        setState(() {
          _messages.add(sentMessage);
        });
        _scrollToBottom();
      } else {
        // Show error
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Failed to send message'),
              backgroundColor: Colors.red,
            ),
          );
        }
        // Restore message in input
        _messageController.text = messageText;
        setState(() {
          _replyingToMessage = currentReply;
        });
      }
    } catch (e) {
      print('Error sending message: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
      // Restore message in input
      _messageController.text = messageText;
    } finally {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
      }
    }
  }

  Future<void> _togglePin(Message message) async {
    final result = await MessageService.pinMessage(widget.conversation.id, message.id);
    if (result['success']) {
      setState(() {
        final index = _messages.indexWhere((m) => m.id == message.id);
        if (index != -1) {
          _messages[index] = _messages[index].copyWith(isPinned: !_messages[index].isPinned);
        }
      });
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result['message'] ?? 'Lỗi khi ghim tin nhắn')),
        );
      }
    }
  }

  void _scrollToMessage(int messageId) {
    // Basic implementation: scroll to bottom for now
    _scrollToBottom();
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

      print('ChatScreen - Starting video call with room: $_roomName');

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
      print('ChatScreen - Error starting video call: $e');
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

  /// Build video call button - GREEN color when not in call, RED when active
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
                  isInCall ? 'Kết thúc' : 'Gọi video',
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

  String _formatTime(String? timestamp) {
    if (timestamp == null) return '';

    try {
      final DateTime dateTime = DateTime.parse(timestamp);
      return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return '';
    }
  }

  @override
  void dispose() {
    // Leave the chat room
    if (_roomName != null) {
      _socketService.leaveChatRoom(_roomName!);
    }
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
            if (_socketService.isConnected)
              const Text(
                'Đang hoạt động',
                style: TextStyle(fontSize: 12, color: Colors.white70),
              )
            else
              const Text(
                'Đang kết nối...',
                style: TextStyle(fontSize: 12, color: Colors.white70),
              ),
          ],
        ),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
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
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadMessages,
              child: const Text('Thử lại'),
            ),
          ],
        ),
      );
    }

    return Column(
      
      children: [
        // Pinned messages bar
        if (_messages.where((m) => m.isPinned).isNotEmpty)
          PinnedMessagesBar(
            pinnedMessages: _messages.where((m) => m.isPinned).toList(),
            onScrollTo: _scrollToMessage,
            onUnpin: _togglePin,
          ),
        // Messages list
        Expanded(
          child: _messages.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.chat_bubble_outline,
                          size: 64, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text(
                        'Chưa có tin nhắn',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Bắt đầu cuộc trò chuyện!',
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
          child: Column(
            children: [
              if (_replyingToMessage != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    border: Border(top: BorderSide(color: Colors.grey.shade200)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.reply, size: 16, color: Colors.blue.shade600),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Đang trả lời ${_replyingToMessage!.senderName ?? "người dùng"}',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blue.shade600),
                            ),
                            Text(
                              _replyingToMessage!.message.replaceAll(RegExp(r'\[IMAGE\].*?\[\/IMAGE\]'), '📷 Hình ảnh'),
                              style: const TextStyle(fontSize: 12, color: Colors.black54),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 16),
                        onPressed: () {
                          setState(() {
                            _replyingToMessage = null;
                          });
                        },
                      ),
                    ],
                  ),
                ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        focusNode: _messageFocusNode,
                  decoration: InputDecoration(
                    hintText: 'Nhập tin nhắn...',
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
                  enabled: !_isSending,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.blue,
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
          ),
        ),
      ],
    );
  }

  // Check if message contains image tags [IMAGE]url[/IMAGE]
  bool _isImageMessage(String message) {
    return message.contains('[IMAGE]') && message.contains('[/IMAGE]');
  }

  // Parse message to extract text and images
  Map<String, dynamic> _parseMessageContent(String message) {
    final List<String> images = [];
    final imageRegex = RegExp(r'\[IMAGE\](.*?)\[\/IMAGE\]');

    final matches = imageRegex.allMatches(message);
    for (final match in matches) {
      if (match.group(1) != null) {
        images.add(match.group(1)!);
      }
    }

    final text = message.replaceAll(imageRegex, '').trim();

    return {'text': text, 'images': images};
  }

  // Check if message contains video URL
  bool _isVideoMessage(String message) {
    final videoPatterns = [
      RegExp(r'https?://(?:www\.)?youtube\.com/watch\?v=', caseSensitive: false),
      RegExp(r'https?://youtu\.be/', caseSensitive: false),
      RegExp(r'https?://(?:www\.)?vimeo\.com/', caseSensitive: false),
      RegExp(r'https?://.*\.(mp4|webm|mov)', caseSensitive: false),
    ];

    for (final pattern in videoPatterns) {
      if (pattern.hasMatch(message)) {
        return true;
      }
    }
    return false;
  }

  // Extract video URL from message
  String? _extractVideoUrl(String message) {
    final urlRegex = RegExp(
      r'https?://[^\s<>"{}|\\^`\[\]]+',
      caseSensitive: false,
    );
    final match = urlRegex.firstMatch(message);
    return match?.group(0);
  }

  // Check if message contains HTML tags
  bool _containsHtml(String message) {
    return RegExp(r'<[^>]+>').hasMatch(message);
  }

  // Build rich message content (HTML, images, videos)
  Widget _buildMessageContent(Message message, bool isMine) {
    final messageText = message.message;
    final textColor = Colors.black87;

    // Check for image message
    if (_isImageMessage(messageText)) {
      final parsed = _parseMessageContent(messageText);
      final text = parsed['text'] as String;
      final images = parsed['images'] as List<String>;

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (text.isNotEmpty) ...[
            Text(
              text,
              style: TextStyle(color: textColor, fontSize: 15),
            ),
            const SizedBox(height: 8),
          ],
          ...images.map((imageUrl) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: GestureDetector(
              onTap: () => _openImage(imageUrl),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: ApiConfig.getImageUrl(imageUrl),
                  placeholder: (context, url) => Container(
                    height: 150,
                    color: Colors.grey[300],
                    child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                  ),
                  errorWidget: (context, url, error) => Container(
                    height: 100,
                    color: Colors.grey[300],
                    child: const Icon(Icons.broken_image, color: Colors.grey),
                  ),
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: 200,
                ),
              ),
            ),
          )),
        ],
      );
    }

    // Check for video message
    if (_isVideoMessage(messageText)) {
      final videoUrl = _extractVideoUrl(messageText);
      final textWithoutUrl = messageText.replaceAll(RegExp(r'https?://[^\s]+'), '').trim();

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (textWithoutUrl.isNotEmpty) ...[
            Text(
              textWithoutUrl,
              style: TextStyle(color: textColor, fontSize: 15),
            ),
            const SizedBox(height: 8),
          ],
          if (videoUrl != null)
            _buildVideoPreview(videoUrl, isMine),
        ],
      );
    }

    // Check for file attachment
    if (message.hasFile()) {
      return _buildFileAttachment(message, isMine);
    }

    // Check for HTML content
    if (_containsHtml(messageText)) {
      return HtmlContentWidget(
        content: messageText,
        maxImageWidth: 250,
        maxImageHeight: 200,
        defaultTextStyle: TextStyle(
          color: textColor,
          fontSize: 15,
        ),
      );
    }

    // Plain text message
    return Text(
      messageText,
      style: TextStyle(color: textColor, fontSize: 15),
    );
  }

  // Build video preview widget
  Widget _buildVideoPreview(String videoUrl, bool isMine) {
    // Check if it's a YouTube video
    final youtubeMatch = RegExp(
      r'(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
    ).firstMatch(videoUrl);

    if (youtubeMatch != null) {
      final videoId = youtubeMatch.group(1);
      final thumbnailUrl = 'https://img.youtube.com/vi/$videoId/0.jpg';

      return GestureDetector(
        onTap: () => _launchUrl(videoUrl),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 250),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: CachedNetworkImage(
                      imageUrl: thumbnailUrl,
                      height: 140,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        height: 140,
                        color: Colors.grey[300],
                      ),
                      errorWidget: (context, url, error) => Container(
                        height: 140,
                        color: Colors.grey[300],
                        child: const Icon(Icons.video_library, size: 40),
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.play_arrow,
                      color: Colors.white,
                      size: 30,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.play_circle_outline,
                    size: 14,
                    color: isMine ? Colors.white70 : Colors.grey[600],
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'YouTube Video',
                    style: TextStyle(
                      fontSize: 12,
                      color: isMine ? Colors.white70 : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    // Generic video link
    return GestureDetector(
      onTap: () => _launchUrl(videoUrl),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isMine ? Colors.blue[700] : Colors.grey[300],
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.video_library,
              color: isMine ? Colors.white : Colors.grey[700],
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                'Xem video',
                style: TextStyle(
                  color: isMine ? Colors.white : Colors.grey[700],
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Build file attachment widget
  Widget _buildFileAttachment(Message message, bool isMine) {
    final isImage = message.isImageMessage();
    final isVideo = message.isVideoMessage();

    if (isImage && message.filePath != null) {
      return GestureDetector(
        onTap: () => _openImage(message.filePath!),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: CachedNetworkImage(
            imageUrl: ApiConfig.getImageUrl(message.filePath!),
            placeholder: (context, url) => Container(
              height: 150,
              color: Colors.grey[300],
              child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
            ),
            errorWidget: (context, url, error) => Container(
              height: 100,
              color: Colors.grey[300],
              child: const Icon(Icons.broken_image, color: Colors.grey),
            ),
            fit: BoxFit.cover,
            width: double.infinity,
            height: 200,
          ),
        ),
      );
    }

    if (isVideo && message.filePath != null) {
      return GestureDetector(
        onTap: () => _launchUrl(ApiConfig.getImageUrl(message.filePath!)),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isMine ? Colors.blue[700] : Colors.grey[300],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.videocam, color: isMine ? Colors.white : Colors.grey[700]),
              const SizedBox(width: 8),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      message.fileName ?? 'Video',
                      style: TextStyle(
                        color: isMine ? Colors.white : Colors.black87,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (message.formattedFileSize != null)
                      Text(
                        message.formattedFileSize!,
                        style: TextStyle(
                          fontSize: 12,
                          color: isMine ? Colors.white70 : Colors.grey[600],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Generic file attachment
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isMine ? Colors.blue[700] : Colors.grey[300],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.attach_file, color: isMine ? Colors.white : Colors.grey[700]),
          const SizedBox(width: 8),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message.fileName ?? 'File',
                  style: TextStyle(
                    color: isMine ? Colors.white : Colors.black87,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (message.formattedFileSize != null)
                  Text(
                    message.formattedFileSize!,
                    style: TextStyle(
                      fontSize: 12,
                      color: isMine ? Colors.white70 : Colors.grey[600],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Open image in full screen
  void _openImage(String imageUrl) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          body: Center(
            child: InteractiveViewer(
              child: CachedNetworkImage(
                imageUrl: ApiConfig.getImageUrl(imageUrl),
                fit: BoxFit.contain,
                placeholder: (context, url) => const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                ),
                errorWidget: (context, url, error) => const Icon(
                  Icons.broken_image,
                  color: Colors.white,
                  size: 64,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Launch URL
  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  
  void _showContextMenu(BuildContext context, Message message) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.reply, color: Colors.blue),
                title: const Text('Trả lời', style: TextStyle(fontWeight: FontWeight.bold)),
                onTap: () {
                  Navigator.pop(context);
                  setState(() {
                    _replyingToMessage = message;
                  });
                  _messageFocusNode.requestFocus();
                },
              ),
              ListTile(
                leading: const Icon(Icons.copy, color: Colors.black54),
                title: const Text('Copy tin nhắn', style: TextStyle(fontWeight: FontWeight.bold)),
                onTap: () {
                  final text = _parseMessageContent(message.message)['text'] as String;
                  Clipboard.setData(ClipboardData(text: text));
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã copy tin nhắn')));
                },
              ),
              ListTile(
                leading: Icon(message.isPinned ? Icons.push_pin_outlined : Icons.push_pin, color: Colors.indigo),
                title: Text(message.isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn', style: const TextStyle(fontWeight: FontWeight.bold)),
                onTap: () {
                  Navigator.pop(context);
                  _togglePin(message);
                },
              ),
              if (message.isMine)
                ListTile(
                  leading: const Icon(Icons.delete_outline, color: Colors.red),
                  title: const Text('Thu hồi', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
                  onTap: () {
                    // Implement delete later
                    Navigator.pop(context);
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMessageBubble(Message message) {
    final isMine = message.isMine;
    final senderName = message.senderName ?? 'Unknown';

    return GestureDetector(
      onLongPress: () => _showContextMenu(context, message),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          mainAxisAlignment: isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (!isMine) ...[
              CircleAvatar(
                radius: 16,
                backgroundColor: Colors.blue.shade600,
                child: Text(
                  senderName.isNotEmpty ? senderName[0].toUpperCase() : '?',
                  style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 8),
            ],
            Flexible(
              child: Column(
                crossAxisAlignment: isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  if (!isMine)
                    Padding(
                      padding: const EdgeInsets.only(left: 12, bottom: 4),
                      child: Text(
                        senderName,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey[600],
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  
                  if (message.replyTo != null)
                    GestureDetector(
                      onTap: () {
                        if (message.replyTo?['id'] != null) {
                          _scrollToMessage(message.replyTo!['id']);
                        }
                      },
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 2),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isMine ? const Color(0xFFCBDFFF) : Colors.grey.shade100,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                          border: isMine 
                              ? const Border(right: BorderSide(color: Color(0xFF0068FF), width: 3))
                              : Border(left: BorderSide(color: Colors.grey.shade400, width: 3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              message.replyTo?['sender_name'] ?? 'Unknown',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: isMine ? const Color(0xFF0068FF) : Colors.grey.shade700,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              (message.replyTo?['message'] as String? ?? '').replaceAll(RegExp(r'\[IMAGE\].*?\[\/IMAGE\]'), '📷 Hình ảnh'),
                              style: TextStyle(
                                fontSize: 12,
                                color: isMine ? Colors.blue.shade900 : Colors.black87,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ),

                  Container(
                    constraints: const BoxConstraints(maxWidth: 280),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: isMine ? const Color(0xFFE1EFFF) : Colors.white,
                      border: isMine ? null : Border.all(color: Colors.grey.shade200),
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(message.replyTo != null ? 4 : 18),
                        topRight: Radius.circular(message.replyTo != null ? 4 : 18),
                        bottomLeft: isMine ? const Radius.circular(18) : const Radius.circular(4),
                        bottomRight: isMine ? const Radius.circular(4) : const Radius.circular(18),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                      children: [
                        _buildMessageContent(message, isMine),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _formatTime(message.createdAt),
                              style: TextStyle(
                                color: Colors.grey.shade500,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (isMine) ...[
                              const SizedBox(width: 4),
                              Icon(
                                message.isRead ? Icons.done_all : Icons.check,
                                size: 12,
                                color: message.isRead ? const Color(0xFF0068FF) : Colors.grey.shade400,
                              ),
                            ],
                          ],
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
    );
  }
}