import 'user.dart';

class Friend {
  final int id;
  final int userId;
  final int friendId;
  final String status;
  final String? createdAt;
  final String? updatedAt;

  // Friend user info (if loaded)
  final User? friendUser;
  final User? user;

  // Status constants
  static const String statusPending = 'pending';
  static const String statusAccepted = 'accepted';
  static const String statusBlocked = 'blocked';

  Friend({
    required this.id,
    required this.userId,
    required this.friendId,
    required this.status,
    this.createdAt,
    this.updatedAt,
    this.friendUser,
    this.user,
  });

  factory Friend.fromJson(Map<String, dynamic> json) {
    User? friendUser;
    User? user;

    // Check for friend user data
    if (json['friend'] != null) {
      friendUser = User.fromJson(json['friend']);
    } else if (json['friend_user'] != null) {
      friendUser = User.fromJson(json['friend_user']);
    }

    // Check for sender user data
    if (json['user'] != null) {
      user = User.fromJson(json['user']);
    } else if (json['sender'] != null) {
      user = User.fromJson(json['sender']);
    }

    return Friend(
      id: json['id'] as int,
      userId: json['user_id'] as int? ?? json['sender_id'] as int,
      friendId: json['friend_id'] as int? ?? json['receiver_id'] as int,
      status: json['status'] as String,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
      friendUser: friendUser,
      user: user,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'friend_id': friendId,
      'status': status,
      'created_at': createdAt,
      'updated_at': updatedAt,
      if (friendUser != null) 'friend': friendUser!.toJson(),
      if (user != null) 'user': user!.toJson(),
    };
  }

  bool isPending() => status == statusPending;
  bool isAccepted() => status == statusAccepted;
  bool isBlocked() => status == statusBlocked;

  // Get the display name for the friend
  String? get friendName => friendUser?.displayName ?? user?.displayName;
  String? get friendUsername => friendUser?.username ?? user?.username;
  String? get friendAvatar => friendUser?.avatar ?? user?.avatar;

  Friend copyWith({
    int? id,
    int? userId,
    int? friendId,
    String? status,
    String? createdAt,
    String? updatedAt,
    User? friendUser,
    User? user,
  }) {
    return Friend(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      friendId: friendId ?? this.friendId,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      friendUser: friendUser ?? this.friendUser,
      user: user ?? this.user,
    );
  }
}
