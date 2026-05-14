/// Engagement Models for Facebook-like features
/// Includes Like, Dislike, Comment, Share functionality

class Engagement {
  final int postId;
  final int likeCount;
  final int dislikeCount;
  final int commentCount;
  final int shareCount;
  final bool userLiked;
  final bool userDisliked;

  Engagement({
    required this.postId,
    this.likeCount = 0,
    this.dislikeCount = 0,
    this.commentCount = 0,
    this.shareCount = 0,
    this.userLiked = false,
    this.userDisliked = false,
  });

  factory Engagement.fromJson(Map<String, dynamic> json) {
    // Helper function to convert value to int (handles both int and String)
    int toInt(dynamic value) {
      if (value == null) return 0;
      if (value is int) return value;
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    // Helper function to convert value to bool
    bool toBool(dynamic value) {
      if (value == null) return false;
      if (value is bool) return value;
      if (value is int) return value != 0;
      if (value is String) return value.toLowerCase() == 'true' || value == '1';
      return false;
    }

    return Engagement(
      postId: toInt(json['post_id']),
      likeCount: toInt(json['likes']?['count']),
      dislikeCount: toInt(json['dislikes']?['count']),
      commentCount: toInt(json['comments']?['count']),
      shareCount: toInt(json['shares']?['count']),
      userLiked: toBool(json['likes']?['user_liked']),
      userDisliked: toBool(json['dislikes']?['user_disliked']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'post_id': postId,
      'likes': {'count': likeCount, 'user_liked': userLiked},
      'dislikes': {'count': dislikeCount, 'user_disliked': userDisliked},
      'comments': {'count': commentCount},
      'shares': {'count': shareCount},
    };
  }

  Engagement copyWith({
    int? postId,
    int? likeCount,
    int? dislikeCount,
    int? commentCount,
    int? shareCount,
    bool? userLiked,
    bool? userDisliked,
  }) {
    return Engagement(
      postId: postId ?? this.postId,
      likeCount: likeCount ?? this.likeCount,
      dislikeCount: dislikeCount ?? this.dislikeCount,
      commentCount: commentCount ?? this.commentCount,
      shareCount: shareCount ?? this.shareCount,
      // For booleans, we need to handle false correctly (not treat it as null)
      // If a boolean is explicitly provided (even as false), use it
      userLiked: userLiked != null ? userLiked : this.userLiked,
      userDisliked: userDisliked != null ? userDisliked : this.userDisliked,
    );
  }
}

class PostComment {
  final int id;
  final int postId;
  final int userId;
  final String content;
  final String authorName;
  final String? authorEmail;
  final String? authorImage;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final bool approved;
  final int parentId;

  PostComment({
    required this.id,
    required this.postId,
    required this.userId,
    required this.content,
    required this.authorName,
    this.authorEmail,
    this.authorImage,
    required this.createdAt,
    this.updatedAt,
    this.approved = true,
    this.parentId = 0,
  });

  factory PostComment.fromJson(Map<String, dynamic> json) {
    // Helper function to convert value to int (handles both int and String)
    int toInt(dynamic value) {
      if (value == null) return 0;
      if (value is int) return value;
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    // Helper function to convert value to bool
    bool toBool(dynamic value) {
      if (value == null) return true;
      if (value is bool) return value;
      if (value is int) return value != 0;
      if (value is String) return value.toLowerCase() == 'true' || value == '1';
      return true;
    }

    return PostComment(
      id: toInt(json['id']),
      postId: toInt(json['post_id']),
      userId: toInt(json['user_id']),
      content: json['content'] ?? '',
      authorName: json['author']?['name'] ?? json['author_name'] ?? 'Unknown',
      authorEmail: json['author']?['email'] ?? json['author_email'],
      authorImage: json['author']?['avatar'],
      createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at']) : null,
      approved: toBool(json['approved']),
      parentId: toInt(json['parent_id']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'post_id': postId,
      'user_id': userId,
      'content': content,
      'author_name': authorName,
      'author_email': authorEmail,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'approved': approved,
      'parent_id': parentId,
    };
  }

  PostComment copyWith({
    int? id,
    int? postId,
    int? userId,
    String? content,
    String? authorName,
    String? authorEmail,
    String? authorImage,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? approved,
    int? parentId,
  }) {
    return PostComment(
      id: id ?? this.id,
      postId: postId ?? this.postId,
      userId: userId ?? this.userId,
      content: content ?? this.content,
      authorName: authorName ?? this.authorName,
      authorEmail: authorEmail ?? this.authorEmail,
      authorImage: authorImage ?? this.authorImage,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      approved: approved ?? this.approved,
      parentId: parentId ?? this.parentId,
    );
  }
}

class PostShare {
  final int id;
  final int postId;
  final int userId;
  final String sharedVia;
  final String userName;
  final DateTime sharedAt;

  PostShare({
    required this.id,
    required this.postId,
    required this.userId,
    required this.sharedVia,
    required this.userName,
    required this.sharedAt,
  });

  factory PostShare.fromJson(Map<String, dynamic> json) {
    // Helper function to convert value to int (handles both int and String)
    int toInt(dynamic value) {
      if (value == null) return 0;
      if (value is int) return value;
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    return PostShare(
      id: toInt(json['id']),
      postId: toInt(json['post_id']),
      userId: toInt(json['user_id']),
      sharedVia: json['shared_via'] ?? 'direct',
      userName: json['user_name'] ?? 'Unknown',
      sharedAt: DateTime.parse(json['shared_at'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'post_id': postId,
      'user_id': userId,
      'shared_via': sharedVia,
      'user_name': userName,
      'shared_at': sharedAt.toIso8601String(),
    };
  }
}

class PostLike {
  final int id;
  final int postId;
  final int userId;
  final String userName;
  final String? userEmail;
  final DateTime likedAt;

  PostLike({
    required this.id,
    required this.postId,
    required this.userId,
    required this.userName,
    this.userEmail,
    required this.likedAt,
  });

  factory PostLike.fromJson(Map<String, dynamic> json) {
    // Helper function to convert value to int (handles both int and String)
    int toInt(dynamic value) {
      if (value == null) return 0;
      if (value is int) return value;
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    return PostLike(
      id: toInt(json['id']),
      postId: toInt(json['post_id']),
      userId: toInt(json['user_id']),
      userName: json['user_name'] ?? 'Unknown',
      userEmail: json['user_email'],
      likedAt: DateTime.parse(json['liked_at'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'post_id': postId,
      'user_id': userId,
      'user_name': userName,
      'user_email': userEmail,
      'liked_at': likedAt.toIso8601String(),
    };
  }
}
