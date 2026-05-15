class Message {
  final int id;
  final int conversationId;
  final int senderId;
  final int? replyToMessageId;
  final String message;
  final String type;
  final String status;
  final String? filePath;
  final String? fileName;
  final String? fileType;
  final int? fileSize;
  final bool isRead;
  final bool isEdited;
  final bool isPinned;
  final String? editedAt;
  final String? deliveredAt;
  final String? readAt;
  final String? createdAt;
  final String? updatedAt;

  // Sender info (matching Laravel API response)
  final Map<String, dynamic>? sender;

  // Whether this message is from the current user
  final bool isMine;

  // Reply to message (if loaded)
  final Map<String, dynamic>? replyTo;

  // Reactions
  final int reactionsCount;
  final List<String>? reactions;
  final String? myReaction;


  // Message types
  static const String typeText = 'text';
  static const String typeImage = 'image';
  static const String typeFile = 'file';
  static const String typeVideo = 'video';
  static const String typeAudio = 'audio';
  static const String typeSystem = 'system';

  // Message statuses
  static const String statusSent = 'sent';
  static const String statusDelivered = 'delivered';
  static const String statusRead = 'read';
  static const String statusFailed = 'failed';

  Message({
    required this.id,
    required this.conversationId,
    required this.senderId,
    this.replyToMessageId,
    required this.message,
    this.type = typeText,
    this.status = statusSent,
    this.filePath,
    this.fileName,
    this.fileType,
    this.fileSize,
    this.isRead = false,
    this.isEdited = false,
    this.isPinned = false,
    this.editedAt,
    this.deliveredAt,
    this.readAt,
    this.createdAt,
    this.updatedAt,
    this.sender,
    this.isMine = false,
    this.replyTo,
    this.reactionsCount = 0,
    this.reactions,
    this.myReaction,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    try {
      // Helper function to parse int from string or int
      int? _parseInt(dynamic value) {
        if (value == null) return null;
        if (value is int) return value;
        if (value is String) return int.tryParse(value);
        return null;
      }

      // Get senderId from either sender_id field or sender object
      int senderId = 0;
      if (json['sender_id'] != null) {
        senderId = _parseInt(json['sender_id']) ?? 0;
      } else if (json['sender'] != null && json['sender'] is Map) {
        final senderMap = json['sender'] as Map<String, dynamic>;
        if (senderMap['id'] != null) {
          senderId = _parseInt(senderMap['id']) ?? 0;
        }
      }

      // Safe parse sender map
      Map<String, dynamic>? senderMap;
      if (json['sender'] != null && json['sender'] is Map) {
        senderMap = Map<String, dynamic>.from(json['sender']);
      }

      // Safe parse replyTo map
      Map<String, dynamic>? replyToMap;
      if (json['reply_to'] != null && json['reply_to'] is Map) {
        replyToMap = Map<String, dynamic>.from(json['reply_to']);
      }

      // Safe parse reactions list
      List<String>? reactionsList;
      if (json['reactions'] != null && json['reactions'] is List) {
        reactionsList = (json['reactions'] as List).map((e) => e.toString()).toList();
      }

      return Message(
        id: _parseInt(json['id']) ?? 0,
        conversationId: _parseInt(json['conversation_id']) ?? 0,
        senderId: senderId,
        replyToMessageId: _parseInt(json['reply_to_message_id']),
        message: json['message'] as String? ?? '',
        type: json['type'] as String? ?? typeText,
        status: json['status'] as String? ?? statusSent,
        filePath: json['file_path'] as String?,
        fileName: json['file_name'] as String?,
        fileType: json['file_type'] as String?,
        fileSize: _parseInt(json['file_size']),
        isRead: json['is_read'] == true || json['is_read'] == 1 || json['is_read'] == '1',
        isEdited: json['is_edited'] == true || json['is_edited'] == 1 || json['is_edited'] == '1',
        isPinned: json['is_pinned'] == true || json['is_pinned'] == 1 || json['is_pinned'] == '1',
        editedAt: json['edited_at'] as String?,
        deliveredAt: json['delivered_at'] as String?,
        readAt: json['read_at'] as String?,
        createdAt: json['created_at'] as String?,
        updatedAt: json['updated_at'] as String?,
        sender: senderMap,
        isMine: json['is_mine'] == true || json['is_mine'] == 1 || json['is_mine'] == '1',
        replyTo: replyToMap,
        reactionsCount: _parseInt(json['reactions_count']) ?? 0,
        reactions: reactionsList,
        myReaction: json['my_reaction'] as String?,
      );
    } catch (e, stackTrace) {
      print('Message.fromJson - Error parsing: $e');
      print('Message.fromJson - JSON data: $json');
      print('Message.fromJson - Stack trace: $stackTrace');
      rethrow;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'conversation_id': conversationId,
      'sender_id': senderId,
      'reply_to_message_id': replyToMessageId,
      'message': message,
      'type': type,
      'status': status,
      'file_path': filePath,
      'file_name': fileName,
      'file_type': fileType,
      'file_size': fileSize,
      'is_read': isRead,
      'is_edited': isEdited,
      'is_pinned': isPinned,
      'edited_at': editedAt,
      'delivered_at': deliveredAt,
      'read_at': readAt,
      'created_at': createdAt,
      'updated_at': updatedAt,
      if (sender != null) 'sender': sender,
      'is_mine': isMine,
      if (replyTo != null) 'reply_to': replyTo,
      'reactions_count': reactionsCount,
      if (reactions != null) 'reactions': reactions,
      if (myReaction != null) 'my_reaction': myReaction,
    };
  }

  bool isTextMessage() => type == typeText;
  bool isImageMessage() => type == typeImage;
  bool isFileMessage() => type == typeFile;
  bool isVideoMessage() => type == typeVideo;
  bool isAudioMessage() => type == typeAudio;
  bool isSystemMessage() => type == typeSystem;

  bool hasFile() => filePath != null && filePath!.isNotEmpty;
  bool isReply() => replyToMessageId != null;

  String? get formattedFileSize {
    if (fileSize == null) return null;

    const units = ['B', 'KB', 'MB', 'GB'];
    double size = fileSize!.toDouble();
    int unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return '${size.toStringAsFixed(2)} ${units[unitIndex]}';
  }

  Message copyWith({
    int? id,
    int? conversationId,
    int? senderId,
    int? replyToMessageId,
    String? message,
    String? type,
    String? status,
    String? filePath,
    String? fileName,
    String? fileType,
    int? fileSize,
    bool? isRead,
    bool? isEdited,
    bool? isPinned,
    String? editedAt,
    String? deliveredAt,
    String? readAt,
    String? createdAt,
    String? updatedAt,
    Map<String, dynamic>? sender,
    bool? isMine,
    Map<String, dynamic>? replyTo,
    int? reactionsCount,
    List<String>? reactions,
    String? myReaction,
  }) {
    return Message(
      id: id ?? this.id,
      conversationId: conversationId ?? this.conversationId,
      senderId: senderId ?? this.senderId,
      replyToMessageId: replyToMessageId ?? this.replyToMessageId,
      message: message ?? this.message,
      type: type ?? this.type,
      status: status ?? this.status,
      filePath: filePath ?? this.filePath,
      fileName: fileName ?? this.fileName,
      fileType: fileType ?? this.fileType,
      fileSize: fileSize ?? this.fileSize,
      isRead: isRead ?? this.isRead,
      isEdited: isEdited ?? this.isEdited,
      isPinned: isPinned ?? this.isPinned,
      editedAt: editedAt ?? this.editedAt,
      deliveredAt: deliveredAt ?? this.deliveredAt,
      readAt: readAt ?? this.readAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      sender: sender ?? this.sender,
      isMine: isMine ?? this.isMine,
      replyTo: replyTo ?? this.replyTo,
      reactionsCount: reactionsCount ?? this.reactionsCount,
      reactions: reactions ?? this.reactions,
      myReaction: myReaction ?? this.myReaction,
    );
  }

  // Convenience getters for sender info
  String? get senderName => sender?['name'] as String?;
  int? get senderIdFromMap => sender?['id'] as int?;
}
