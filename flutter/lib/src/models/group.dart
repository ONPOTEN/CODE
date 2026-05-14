import 'user.dart';

class Group {
  final int groupId;
  final String groupName;
  final String? description;
  final int groupOwnerId;
  final String status;
  final String visibility;
  final String? avatar;
  final String? coverImage;
  final bool? requiresApproval;
  final bool? requiresApprovalPosts;
  final User? owner;
  final int postsCount;
  final int membersCount;
  final String createdAt;
  final String? updatedAt;

  // Status constants
  static const String statusActive = 'active';
  static const String statusInactive = 'inactive';

  // Visibility constants
  static const String visibilityPublic = 'public';
  static const String visibilityPrivate = 'private';

  Group({
    required this.groupId,
    required this.groupName,
    this.description,
    required this.groupOwnerId,
    required this.status,
    required this.visibility,
    this.avatar,
    this.coverImage,
    this.requiresApproval,
    this.requiresApprovalPosts,
    this.owner,
    this.postsCount = 0,
    this.membersCount = 0,
    required this.createdAt,
    this.updatedAt,
  });

  factory Group.fromJson(Map<String, dynamic> json) {
    User? owner;
    if (json['owner'] != null) {
      owner = User.fromJson(json['owner']);
    }

    return Group(
      groupId: json['group_id'] as int,
      groupName: json['group_name'] as String? ?? '',
      description: json['description'] as String?,
      groupOwnerId: json['group_owner_id'] as int,
      status: json['status'] as String? ?? statusActive,
      visibility: json['visibility'] as String? ?? visibilityPublic,
      avatar: json['avatar'] as String?,
      coverImage: json['cover_image'] as String?,
      requiresApproval: json['requires_approval'] as bool?,
      requiresApprovalPosts: json['requires_approval_posts'] as bool?,
      owner: owner,
      postsCount: json['posts_count'] as int? ?? 0,
      membersCount: json['members_count'] as int? ?? 0,
      createdAt: json['created_at'] as String? ?? '',
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'group_id': groupId,
      'group_name': groupName,
      if (description != null) 'description': description,
      'group_owner_id': groupOwnerId,
      'status': status,
      'visibility': visibility,
      if (avatar != null) 'avatar': avatar,
      if (coverImage != null) 'cover_image': coverImage,
      if (requiresApproval != null) 'requires_approval': requiresApproval,
      if (requiresApprovalPosts != null) 'requires_approval_posts': requiresApprovalPosts,
      if (owner != null) 'owner': owner!.toJson(),
      'posts_count': postsCount,
      'members_count': membersCount,
      'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    };
  }

  bool isPublic() => visibility == visibilityPublic;
  bool isActive() => status == statusActive;

  Group copyWith({
    int? groupId,
    String? groupName,
    String? description,
    int? groupOwnerId,
    String? status,
    String? visibility,
    String? avatar,
    String? coverImage,
    bool? requiresApproval,
    bool? requiresApprovalPosts,
    User? owner,
    int? postsCount,
    int? membersCount,
    String? createdAt,
    String? updatedAt,
  }) {
    return Group(
      groupId: groupId ?? this.groupId,
      groupName: groupName ?? this.groupName,
      description: description ?? this.description,
      groupOwnerId: groupOwnerId ?? this.groupOwnerId,
      status: status ?? this.status,
      visibility: visibility ?? this.visibility,
      avatar: avatar ?? this.avatar,
      coverImage: coverImage ?? this.coverImage,
      requiresApproval: requiresApproval ?? this.requiresApproval,
      requiresApprovalPosts: requiresApprovalPosts ?? this.requiresApprovalPosts,
      owner: owner ?? this.owner,
      postsCount: postsCount ?? this.postsCount,
      membersCount: membersCount ?? this.membersCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
