import 'dart:convert';
import 'user.dart';
import 'shop.dart';

class ShopPost {
  final int id;
  final int shopId;
  final int userId;
  final String title;
  final String slug;
  final String? content;
  final String? priceRange;
  final String type;
  final String status;
  final String? productType;
  final String? price;
  final String? salePrice;
  final String? shortDescription;
  final String? detailDescription;
  final String? categories;
  final String? mainImage;
  final List<String> featuredImages;
  final List<String> otherImages;
  final String? video;
  final int viewCount;
  final int likesCount;
  final int dislikesCount;
  final int commentsCount;
  final int sharesCount;
  final User? author;
  final Shop? shop;
  final String? createdAt;
  final String? updatedAt;

  // Status constants
  static const String statusDraft = 'draft';
  static const String statusPublished = 'published';

  // Type constants
  static const String typePost = 'post';
  static const String typePage = 'page';

  // Product type constants
  static const String productTypeSimple = 'Đơn giản';
  static const String productTypeVariant = 'Biến thể';
  static const String productTypeDownload = 'Tải xuống';

  ShopPost({
    required this.id,
    required this.shopId,
    required this.userId,
    required this.title,
    required this.slug,
    this.content,
    this.priceRange,
    required this.type,
    required this.status,
    this.productType,
    this.price,
    this.salePrice,
    this.shortDescription,
    this.detailDescription,
    this.categories,
    this.mainImage,
    required this.featuredImages,
    this.otherImages = const [],
    this.video,
    required this.viewCount,
    this.likesCount = 0,
    this.dislikesCount = 0,
    this.commentsCount = 0,
    this.sharesCount = 0,
    this.author,
    this.shop,
    this.createdAt,
    this.updatedAt,
  });

  factory ShopPost.fromJson(Map<String, dynamic> json) {
    // Parse featured_images
    List<String> images = _parseImageList(json['featured_images']);

    // Parse other_images
    List<String> otherImgs = _parseImageList(json['other_images']);

    // Parse author
    User? author;
    if (json['author'] != null) {
      author = User.fromJson(json['author']);
    }

    // Parse shop
    Shop? shop;
    if (json['shop'] != null) {
      shop = Shop.fromJson(json['shop']);
    }

    return ShopPost(
      id: json['id'] as int,
      shopId: json['shop_id'] as int,
      userId: json['user_id'] as int,
      title: json['title'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      content: json['content'] as String?,
      priceRange: json['price_range'] as String?,
      type: json['type'] as String? ?? typePost,
      status: json['status'] as String? ?? statusDraft,
      productType: json['product_type'] as String?,
      price: json['price']?.toString(),
      salePrice: json['sale_price']?.toString(),
      shortDescription: json['short_description'] as String?,
      detailDescription: json['detail_description'] as String?,
      categories: json['categories'] as String?,
      mainImage: json['main_image'] as String?,
      featuredImages: images,
      otherImages: otherImgs,
      video: json['video'] as String?,
      viewCount: json['view_count'] as int? ?? 0,
      likesCount: json['likes_count'] as int? ?? 0,
      dislikesCount: json['dislikes_count'] as int? ?? 0,
      commentsCount: json['comments_count'] as int? ?? 0,
      sharesCount: json['shares_count'] as int? ?? 0,
      author: author,
      shop: shop,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  static List<String> _parseImageList(dynamic data) {
    if (data == null) return [];

    List<String> images = [];
    if (data is List) {
      images = data.map((e) => e.toString()).toList();
    } else if (data is String) {
      try {
        final decoded = jsonDecode(data);
        if (decoded is List) {
          images = decoded.map((e) => e.toString()).toList();
        } else if (decoded is String && decoded.isNotEmpty) {
          images = [decoded];
        }
      } catch (e) {
        if (data.isNotEmpty) {
          images = [data];
        }
      }
    }
    return images.where((img) => img.isNotEmpty).toList();
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'shop_id': shopId,
      'user_id': userId,
      'title': title,
      'slug': slug,
      'content': content,
      'price_range': priceRange,
      'type': type,
      'status': status,
      if (productType != null) 'product_type': productType,
      if (price != null) 'price': price,
      if (salePrice != null) 'sale_price': salePrice,
      if (shortDescription != null) 'short_description': shortDescription,
      if (detailDescription != null) 'detail_description': detailDescription,
      if (categories != null) 'categories': categories,
      if (mainImage != null) 'main_image': mainImage,
      'featured_images': featuredImages,
      'other_images': otherImages,
      if (video != null) 'video': video,
      'view_count': viewCount,
      'likes_count': likesCount,
      'dislikes_count': dislikesCount,
      'comments_count': commentsCount,
      'shares_count': sharesCount,
      if (author != null) 'author': author!.toJson(),
      if (shop != null) 'shop': shop!.toJson(),
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  bool get isPublished => status.toLowerCase() == 'published';
  bool get isDraft => status.toLowerCase() == 'draft';
  bool get isPost => type.toLowerCase() == 'post';
  bool get isPage => type.toLowerCase() == 'page';

  bool get hasVideo => video != null && video!.isNotEmpty;
  bool get hasImages => featuredImages.isNotEmpty || otherImages.isNotEmpty || (mainImage != null && mainImage!.isNotEmpty);

  String get firstImage {
    if (mainImage != null && mainImage!.isNotEmpty) return mainImage!;
    if (featuredImages.isNotEmpty) return featuredImages.first;
    if (otherImages.isNotEmpty) return otherImages.first;
    return '';
  }

  List<String> get allImages {
    final images = <String>[];
    if (mainImage != null && mainImage!.isNotEmpty) images.add(mainImage!);
    images.addAll(featuredImages);
    images.addAll(otherImages);
    return images;
  }

  ShopPost copyWith({
    int? id,
    int? shopId,
    int? userId,
    String? title,
    String? slug,
    String? content,
    String? priceRange,
    String? type,
    String? status,
    String? productType,
    String? price,
    String? salePrice,
    String? shortDescription,
    String? detailDescription,
    String? categories,
    String? mainImage,
    List<String>? featuredImages,
    List<String>? otherImages,
    String? video,
    int? viewCount,
    int? likesCount,
    int? dislikesCount,
    int? commentsCount,
    int? sharesCount,
    User? author,
    Shop? shop,
    String? createdAt,
    String? updatedAt,
  }) {
    return ShopPost(
      id: id ?? this.id,
      shopId: shopId ?? this.shopId,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      slug: slug ?? this.slug,
      content: content ?? this.content,
      priceRange: priceRange ?? this.priceRange,
      type: type ?? this.type,
      status: status ?? this.status,
      productType: productType ?? this.productType,
      price: price ?? this.price,
      salePrice: salePrice ?? this.salePrice,
      shortDescription: shortDescription ?? this.shortDescription,
      detailDescription: detailDescription ?? this.detailDescription,
      categories: categories ?? this.categories,
      mainImage: mainImage ?? this.mainImage,
      featuredImages: featuredImages ?? this.featuredImages,
      otherImages: otherImages ?? this.otherImages,
      video: video ?? this.video,
      viewCount: viewCount ?? this.viewCount,
      likesCount: likesCount ?? this.likesCount,
      dislikesCount: dislikesCount ?? this.dislikesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      sharesCount: sharesCount ?? this.sharesCount,
      author: author ?? this.author,
      shop: shop ?? this.shop,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
