import 'user.dart';

class Shop {
  final int id;
  final int userId;
  final String name;
  final String slug;
  final String? description;
  final String? logo;
  final String? banner;
  final String? image1;
  final String? image2;
  final String? image3;
  final String? image4;
  final String? image5;
  final String? address;
  final String? city;
  final String? state;
  final String? country;
  final String? postalCode;
  final String? phone;
  final String? email;
  final String? website;
  final String? bankName;
  final String? bankAccount;
  final String? bankAccountName;
  final String status;
  final User? owner;
  final int postsCount;
  final String? createdAt;
  final String? updatedAt;

  Shop({
    required this.id,
    required this.userId,
    required this.name,
    required this.slug,
    this.description,
    this.logo,
    this.banner,
    this.image1,
    this.image2,
    this.image3,
    this.image4,
    this.image5,
    this.address,
    this.city,
    this.state,
    this.country,
    this.postalCode,
    this.phone,
    this.email,
    this.website,
    this.bankName,
    this.bankAccount,
    this.bankAccountName,
    required this.status,
    this.owner,
    this.postsCount = 0,
    this.createdAt,
    this.updatedAt,
  });

  factory Shop.fromJson(Map<String, dynamic> json) {
    User? owner;
    if (json['owner'] != null) {
      owner = User.fromJson(json['owner']);
    }

    return Shop(
      id: json['id'] as int,
      userId: json['user_id'] as int,
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      description: json['description'] as String?,
      logo: json['logo'] as String?,
      banner: json['banner'] as String?,
      image1: json['image_1'] as String?,
      image2: json['image_2'] as String?,
      image3: json['image_3'] as String?,
      image4: json['image_4'] as String?,
      image5: json['image_5'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      country: json['country'] as String?,
      postalCode: json['postal_code'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      website: json['website'] as String?,
      bankName: json['bank_name'] as String?,
      bankAccount: json['bank_account'] as String?,
      bankAccountName: json['bank_account_name'] as String?,
      status: json['status'] as String? ?? 'active',
      owner: owner,
      postsCount: json['posts_count'] as int? ?? 0,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'slug': slug,
      'description': description,
      'logo': logo,
      'banner': banner,
      if (image1 != null) 'image_1': image1,
      if (image2 != null) 'image_2': image2,
      if (image3 != null) 'image_3': image3,
      if (image4 != null) 'image_4': image4,
      if (image5 != null) 'image_5': image5,
      'address': address,
      'city': city,
      'state': state,
      'country': country,
      'postal_code': postalCode,
      'phone': phone,
      'email': email,
      'website': website,
      if (bankName != null) 'bank_name': bankName,
      if (bankAccount != null) 'bank_account': bankAccount,
      if (bankAccountName != null) 'bank_account_name': bankAccountName,
      'status': status,
      if (owner != null) 'owner': owner!.toJson(),
      'posts_count': postsCount,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  String get fullAddress {
    List<String> addressParts = [];
    if (address != null && address!.isNotEmpty) addressParts.add(address!);
    if (city != null && city!.isNotEmpty) addressParts.add(city!);
    if (state != null && state!.isNotEmpty) addressParts.add(state!);
    if (country != null && country!.isNotEmpty) addressParts.add(country!);
    if (postalCode != null && postalCode!.isNotEmpty) addressParts.add(postalCode!);
    return addressParts.isEmpty ? 'No address provided' : addressParts.join(', ');
  }

  bool get isActive => status.toLowerCase() == 'active';
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isSuspended => status.toLowerCase() == 'suspended';
}
