import 'package:flutter/material.dart';

/// Widget for displaying user online/offline status with typing indicator
class ChatStatusIndicator extends StatelessWidget {
  final bool isOnline;
  final bool isTyping;
  final bool isConnected;

  const ChatStatusIndicator({
    Key? key,
    required this.isOnline,
    required this.isTyping,
    required this.isConnected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Connection status dot
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isConnected ? Colors.green : Colors.yellow,
          ),
          margin: const EdgeInsets.only(right: 6),
        ),
        // Status text
        Expanded(
          child: Text(
            _getStatusText(),
            style: TextStyle(
              fontSize: 12,
              color: isTyping ? Colors.lightBlue[200] : Colors.white70,
              fontStyle: isTyping ? FontStyle.italic : FontStyle.normal,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  String _getStatusText() {
    if (isTyping) {
      return 'typing...';
    } else if (isOnline) {
      return 'Online';
    } else if (isConnected) {
      return 'Offline';
    } else {
      return 'Connecting...';
    }
  }
}

/// Widget for displaying message delivery status
class MessageStatusBadge extends StatelessWidget {
  final bool isSent;
  final bool isDelivered;
  final bool isRead;

  const MessageStatusBadge({
    Key? key,
    required this.isSent,
    this.isDelivered = false,
    this.isRead = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (!isSent) return const SizedBox.shrink();

    if (isRead) {
      return Tooltip(
        message: 'Read',
        child: Icon(
          Icons.done_all,
          size: 16,
          color: Colors.lightBlue[200],
        ),
      );
    } else if (isDelivered) {
      return Tooltip(
        message: 'Delivered',
        child: Icon(
          Icons.done_all,
          size: 16,
          color: Colors.white70,
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
}

/// Widget for displaying typing indicator animation
class TypingIndicator extends StatefulWidget {
  final bool isVisible;
  final String userName;

  const TypingIndicator({
    Key? key,
    required this.isVisible,
    required this.userName,
  }) : super(key: key);

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    if (widget.isVisible) {
      _animationController.repeat();
    }
  }

  @override
  void didUpdateWidget(TypingIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isVisible && !_animationController.isAnimating) {
      _animationController.repeat();
    } else if (!widget.isVisible && _animationController.isAnimating) {
      _animationController.stop();
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isVisible) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          const SizedBox(width: 8),
          CircleAvatar(
            radius: 16,
            backgroundColor: Colors.grey[300],
            child: Text(
              widget.userName.isNotEmpty ? widget.userName[0].toUpperCase() : '?',
              style: const TextStyle(fontSize: 12, color: Colors.white),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
                bottomLeft: Radius.circular(4),
                bottomRight: Radius.circular(18),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildDot(0),
                const SizedBox(width: 4),
                _buildDot(1),
                const SizedBox(width: 4),
                _buildDot(2),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDot(int index) {
    return ScaleTransition(
      scale: Tween<double>(begin: 0.5, end: 1.0).animate(
        CurvedAnimation(
          parent: _animationController,
          curve: Interval(
            index * 0.2,
            0.6 + index * 0.2,
            curve: Curves.easeInOut,
          ),
        ),
      ),
      child: Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.grey[600],
        ),
      ),
    );
  }
}

/// Widget for displaying read receipts
class ReadReceipt extends StatelessWidget {
  final int readByCount;
  final List<String> readerNames;

  const ReadReceipt({
    Key? key,
    required this.readByCount,
    this.readerNames = const [],
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (readByCount == 0) return const SizedBox.shrink();

    final tooltip = readerNames.isNotEmpty
        ? 'Read by: ${readerNames.join(", ")}'
        : 'Read by $readByCount user${readByCount > 1 ? 's' : ''}';

    return Tooltip(
      message: tooltip,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.lightBlue[100],
          borderRadius: BorderRadius.circular(4),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.visibility,
              size: 12,
              color: Colors.blue[600],
            ),
            const SizedBox(width: 4),
            Text(
              'Read',
              style: TextStyle(
                fontSize: 10,
                color: Colors.blue[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Widget for displaying online presence indicator with animation
class OnlinePresenceIndicator extends StatefulWidget {
  final bool isOnline;
  final double size;

  const OnlinePresenceIndicator({
    Key? key,
    required this.isOnline,
    this.size = 12,
  }) : super(key: key);

  @override
  State<OnlinePresenceIndicator> createState() =>
      _OnlinePresenceIndicatorState();
}

class _OnlinePresenceIndicatorState extends State<OnlinePresenceIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    if (widget.isOnline) {
      _animationController.repeat();
    }
  }

  @override
  void didUpdateWidget(OnlinePresenceIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isOnline && !_animationController.isAnimating) {
      _animationController.repeat();
    } else if (!widget.isOnline && _animationController.isAnimating) {
      _animationController.stop();
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: widget.isOnline
          ? Tween<double>(begin: 1.0, end: 1.3).animate(
              CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
            )
          : AlwaysStoppedAnimation(1.0),
      child: Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: widget.isOnline ? Colors.green : Colors.grey,
          border: Border.all(
            color: Colors.white,
            width: 2,
          ),
        ),
      ),
    );
  }
}
