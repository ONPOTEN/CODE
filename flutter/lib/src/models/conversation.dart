/// Represents a conversation between two users
/// Room name format: "{host roomid} - {remote roomid}" (e.g., "user123 - user456")
class Conversation {
  final int id;
  final String roomName;
  final Map<String, dynamic> otherUser;
  final Map<String, dynamic>? lastMessage;
  final int unreadCount;
  final String? updatedAt;

  Conversation({
    required this.id,
    required this.roomName,
    required this.otherUser,
    this.lastMessage,
    this.unreadCount = 0,
    this.updatedAt,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    // Helper function to parse int from string or int
    int _parseInt(dynamic value, {int defaultValue = 0}) {
      if (value == null) return defaultValue;
      if (value is int) return value;
      if (value is String) return int.tryParse(value) ?? defaultValue;
      return defaultValue;
    }

    // Safe parsing with null checks
    Map<String, dynamic> otherUserMap = {};
    if (json['other_user'] != null) {
      otherUserMap = Map<String, dynamic>.from(json['other_user']);
    }

    Map<String, dynamic>? lastMessageMap;
    if (json['last_message'] != null && json['last_message'] is Map) {
      lastMessageMap = Map<String, dynamic>.from(json['last_message']);
    }

    return Conversation(
      id: _parseInt(json['id']),
      roomName: json['room_name'] as String? ?? '',
      otherUser: otherUserMap,
      lastMessage: lastMessageMap,
      unreadCount: _parseInt(json['unread_count']),
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'room_name': roomName,
      'other_user': otherUser,
      'last_message': lastMessage,
      'unread_count': unreadCount,
      'updated_at': updatedAt,
    };
  }

  bool hasUnreadMessages() => unreadCount > 0;

  // Convenience getters for other user info with safe null handling
  int get otherUserId {
    final id = otherUser['id'];
    if (id is int) return id;
    if (id is String) return int.tryParse(id) ?? 0;
    return 0;
  }

  String get otherUserName => otherUser['name'] as String? ?? 'Unknown';
  String? get otherUserEmail => otherUser['email'] as String?;

  // Convenience getters for last message with safe null handling
  String? get lastMessageText => lastMessage?['message'] as String?;
  String? get lastMessageTime => lastMessage?['created_at'] as String?;
  bool? get isLastMessageMine {
    final isMine = lastMessage?['is_mine'];
    if (isMine == true || isMine == 1 || isMine == '1') return true;
    if (isMine == false || isMine == 0 || isMine == '0') return false;
    return null;
  }
}

/// Represents a single chat message
class ChatMessage {
  final int id;
  final String message;
  final Map<String, dynamic> sender;
  final bool isMine;
  final bool isRead;
  final String createdAt;
  final int? conversationId;

  ChatMessage({
    required this.id,
    required this.message,
    required this.sender,
    required this.isMine,
    required this.isRead,
    required this.createdAt,
    this.conversationId,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    int _parseInt(dynamic value, {int defaultValue = 0}) {
      if (value == null) return defaultValue;
      if (value is int) return value;
      if (value is String) return int.tryParse(value) ?? defaultValue;
      return defaultValue;
    }

    bool _parseBool(dynamic value) {
      if (value == null) return false;
      if (value is bool) return value;
      if (value == 1 || value == '1') return true;
      if (value == 0 || value == '0') return false;
      return false;
    }

    Map<String, dynamic> senderMap = {};
    if (json['sender'] != null) {
      senderMap = Map<String, dynamic>.from(json['sender']);
    }

    return ChatMessage(
      id: _parseInt(json['id']),
      message: json['message'] as String? ?? '',
      sender: senderMap,
      isMine: _parseBool(json['is_mine']),
      isRead: _parseBool(json['is_read']),
      createdAt: json['created_at'] as String? ?? '',
      conversationId: json['conversation_id'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'message': message,
      'sender': sender,
      'is_mine': isMine,
      'is_read': isRead,
      'created_at': createdAt,
      'conversation_id': conversationId,
    };
  }

  int get senderId {
    final id = sender['id'];
    if (id is int) return id;
    if (id is String) return int.tryParse(id) ?? 0;
    return 0;
  }

  String get senderName => sender['name'] as String? ?? 'Unknown';
}
