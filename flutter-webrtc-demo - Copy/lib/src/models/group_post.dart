import 'user.dart';
import 'group.dart';

class GroupPost {
  final int id;
  final int groupId;
  final int postAuthor;
  final String postTitle;
  final String postContent;
  final String? postExcerpt;
  final String postStatus;
  final String postType;
  final String postDate;
  final String? postModified;
  final String commentStatus;
  final String pingStatus;
  final String visibility;
  final String? featuredImage;
  final int commentCount;
  final User? author;
  final Group? group;
  final List<String> images;
  final String? video;
  final int likesCount;
  final int dislikesCount;
  final int commentsCount;

  // Status constants
  static const String statusDraft = 'draft';
  static const String statusPublish = 'publish';
  static const String statusPending = 'pending';
  static const String statusTrash = 'trash';

  GroupPost({
    required this.id,
    required this.groupId,
    required this.postAuthor,
    required this.postTitle,
    required this.postContent,
    this.postExcerpt,
    required this.postStatus,
    required this.postType,
    required this.postDate,
    this.postModified,
    required this.commentStatus,
    required this.pingStatus,
    required this.visibility,
    this.featuredImage,
    this.commentCount = 0,
    this.author,
    this.group,
    this.images = const [],
    this.video,
    this.likesCount = 0,
    this.dislikesCount = 0,
    this.commentsCount = 0,
  });

  factory GroupPost.fromJson(Map<String, dynamic> json) {
    User? author;
    if (json['author'] != null) {
      author = User.fromJson(json['author']);
    }

    Group? group;
    if (json['group'] != null) {
      group = Group.fromJson(json['group']);
    }

    // Parse images array
    List<String> imagesList = [];
    if (json['images'] != null) {
      if (json['images'] is List) {
        imagesList = (json['images'] as List).map((img) {
          if (img is String) return img;
          if (img is Map && img['url'] != null) return img['url'] as String;
          return '';
        }).where((url) => url.isNotEmpty).toList();
      }
    }

    return GroupPost(
      id: json['id'] as int,
      groupId: json['group_id'] as int,
      postAuthor: json['post_author'] as int,
      postTitle: json['post_title'] as String? ?? '',
      postContent: json['post_content'] as String? ?? '',
      postExcerpt: json['post_excerpt'] as String?,
      postStatus: json['post_status'] as String? ?? statusDraft,
      postType: json['post_type'] as String? ?? 'post',
      postDate: json['post_date'] as String? ?? '',
      postModified: json['post_modified'] as String?,
      commentStatus: json['comment_status'] as String? ?? 'open',
      pingStatus: json['ping_status'] as String? ?? 'open',
      visibility: json['visibility'] as String? ?? 'public',
      featuredImage: json['featured_image'] as String?,
      commentCount: json['comment_count'] as int? ?? 0,
      author: author,
      group: group,
      images: imagesList,
      video: json['video'] as String?,
      likesCount: json['likes_count'] as int? ?? 0,
      dislikesCount: json['dislikes_count'] as int? ?? 0,
      commentsCount: json['comments_count'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'group_id': groupId,
      'post_author': postAuthor,
      'post_title': postTitle,
      'post_content': postContent,
      if (postExcerpt != null) 'post_excerpt': postExcerpt,
      'post_status': postStatus,
      'post_type': postType,
      'post_date': postDate,
      if (postModified != null) 'post_modified': postModified,
      'comment_status': commentStatus,
      'ping_status': pingStatus,
      'visibility': visibility,
      if (featuredImage != null) 'featured_image': featuredImage,
      'comment_count': commentCount,
      if (author != null) 'author': author!.toJson(),
      if (group != null) 'group': group!.toJson(),
      'images': images,
      if (video != null) 'video': video,
      'likes_count': likesCount,
      'dislikes_count': dislikesCount,
      'comments_count': commentsCount,
    };
  }

  bool isPublished() => postStatus == statusPublish;
  bool isDraft() => postStatus == statusDraft;
  bool isPending() => postStatus == statusPending;

  GroupPost copyWith({
    int? id,
    int? groupId,
    int? postAuthor,
    String? postTitle,
    String? postContent,
    String? postExcerpt,
    String? postStatus,
    String? postType,
    String? postDate,
    String? postModified,
    String? commentStatus,
    String? pingStatus,
    String? visibility,
    String? featuredImage,
    int? commentCount,
    User? author,
    Group? group,
    List<String>? images,
    String? video,
    int? likesCount,
    int? dislikesCount,
    int? commentsCount,
  }) {
    return GroupPost(
      id: id ?? this.id,
      groupId: groupId ?? this.groupId,
      postAuthor: postAuthor ?? this.postAuthor,
      postTitle: postTitle ?? this.postTitle,
      postContent: postContent ?? this.postContent,
      postExcerpt: postExcerpt ?? this.postExcerpt,
      postStatus: postStatus ?? this.postStatus,
      postType: postType ?? this.postType,
      postDate: postDate ?? this.postDate,
      postModified: postModified ?? this.postModified,
      commentStatus: commentStatus ?? this.commentStatus,
      pingStatus: pingStatus ?? this.pingStatus,
      visibility: visibility ?? this.visibility,
      featuredImage: featuredImage ?? this.featuredImage,
      commentCount: commentCount ?? this.commentCount,
      author: author ?? this.author,
      group: group ?? this.group,
      images: images ?? this.images,
      video: video ?? this.video,
      likesCount: likesCount ?? this.likesCount,
      dislikesCount: dislikesCount ?? this.dislikesCount,
      commentsCount: commentsCount ?? this.commentsCount,
    );
  }
}
