import 'user.dart';

class Post {
  final int id;
  final int authorId;
  final String title;
  final String content;
  final String excerpt;
  final String status;
  final String type;
  final String? visibility;
  final String? featuredImage;
  final List<String> images;
  final String? video;
  final String createdAt;
  final String? updatedAt;

  // Related data
  final User? author;
  final int commentCount;

  // Status constants
  static const String statusPublish = 'publish';
  static const String statusDraft = 'draft';
  static const String statusPending = 'pending';

  // Type constants
  static const String typePost = 'post';
  static const String typePage = 'page';
  static const String typeProduct = 'product';

  // Visibility constants
  static const String visibilityPublic = 'public';
  static const String visibilityPrivate = 'private';

  Post({
    required this.id,
    required this.authorId,
    required this.title,
    required this.content,
    required this.excerpt,
    required this.status,
    required this.type,
    this.visibility,
    this.featuredImage,
    this.images = const [],
    this.video,
    required this.createdAt,
    this.updatedAt,
    this.author,
    this.commentCount = 0,
  });

  factory Post.fromJson(Map<String, dynamic> json) {
    User? author;
    if (json['author'] != null) {
      author = User.fromJson(json['author']);
    }

    List<String> imagesList = [];
    if (json['images'] != null) {
      if (json['images'] is List) {
        imagesList = (json['images'] as List).map((img) => img.toString()).toList();
      }
    }

    return Post(
      id: json['id'] as int,
      authorId: json['author_id'] as int,
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      excerpt: json['excerpt'] as String? ?? '',
      status: json['status'] as String? ?? statusDraft,
      type: json['type'] as String? ?? typePost,
      visibility: json['visibility'] as String?,
      featuredImage: json['featured_image'] as String?,
      images: imagesList,
      video: json['video'] as String?,
      createdAt: json['created_at'] as String? ?? '',
      updatedAt: json['updated_at'] as String?,
      author: author,
      commentCount: json['comment_count'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'author_id': authorId,
      'title': title,
      'content': content,
      'excerpt': excerpt,
      'status': status,
      'type': type,
      if (visibility != null) 'visibility': visibility,
      if (featuredImage != null) 'featured_image': featuredImage,
      'images': images,
      if (video != null) 'video': video,
      'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (author != null) 'author': author!.toJson(),
      'comment_count': commentCount,
    };
  }

  bool isPublished() => status == statusPublish;
  bool isDraft() => status == statusDraft;
  bool isPending() => status == statusPending;
  bool isPublic() => visibility == visibilityPublic || visibility == null;
  bool isPrivate() => visibility == visibilityPrivate;

  Post copyWith({
    int? id,
    int? authorId,
    String? title,
    String? content,
    String? excerpt,
    String? status,
    String? type,
    String? visibility,
    String? featuredImage,
    List<String>? images,
    String? video,
    String? createdAt,
    String? updatedAt,
    User? author,
    int? commentCount,
  }) {
    return Post(
      id: id ?? this.id,
      authorId: authorId ?? this.authorId,
      title: title ?? this.title,
      content: content ?? this.content,
      excerpt: excerpt ?? this.excerpt,
      status: status ?? this.status,
      type: type ?? this.type,
      visibility: visibility ?? this.visibility,
      featuredImage: featuredImage ?? this.featuredImage,
      images: images ?? this.images,
      video: video ?? this.video,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      author: author ?? this.author,
      commentCount: commentCount ?? this.commentCount,
    );
  }
}
