class NotificationModel {
  final int id;
  final int userid;
  final String? username;
  final int ownid;
  final String type;
  final String posttype;
  final int postid;
  final int? commentid;
  final String? roomName;
  final String content;
  final int status; // 0 = unread, 1 = read
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    required this.userid,
    this.username,
    required this.ownid,
    required this.type,
    required this.posttype,
    required this.postid,
    this.commentid,
    this.roomName,
    required this.content,
    required this.status,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] ?? 0,
      userid: json['userid'] ?? 0,
      username: json['username'],
      ownid: json['ownid'] ?? 0,
      type: json['type'] ?? '',
      posttype: json['posttype'] ?? '',
      postid: json['postid'] ?? 0,
      commentid: json['commentid'],
      roomName: json['room_name'],
      content: json['content'] ?? '',
      status: json['status'] ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userid': userid,
      'username': username,
      'ownid': ownid,
      'type': type,
      'posttype': posttype,
      'postid': postid,
      'commentid': commentid,
      'room_name': roomName,
      'content': content,
      'status': status,
      'created_at': createdAt.toIso8601String(),
    };
  }

  NotificationModel copyWith({
    int? id,
    int? userid,
    String? username,
    int? ownid,
    String? type,
    String? posttype,
    int? postid,
    int? commentid,
    String? roomName,
    String? content,
    int? status,
    DateTime? createdAt,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      userid: userid ?? this.userid,
      username: username ?? this.username,
      ownid: ownid ?? this.ownid,
      type: type ?? this.type,
      posttype: posttype ?? this.posttype,
      postid: postid ?? this.postid,
      commentid: commentid ?? this.commentid,
      roomName: roomName ?? this.roomName,
      content: content ?? this.content,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
