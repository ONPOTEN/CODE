import 'user.dart';

class OrderItem {
  final int id;
  final int? shopPostId;
  final String productName;
  final String productType;
  final int quantity;
  final double unitPrice;
  final double subtotal;
  final Map<String, dynamic>? variantOptions;
  final dynamic downloadFiles;
  final List<dynamic>? linkFiles;
  final Map<String, dynamic>? product;

  OrderItem({
    required this.id,
    this.shopPostId,
    required this.productName,
    required this.productType,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
    this.variantOptions,
    this.downloadFiles,
    this.linkFiles,
    this.product,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] as int,
      shopPostId: json['shop_post_id'] as int?,
      productName: json['product_name'] as String? ?? 'Unknown Product',
      productType: json['product_type'] as String? ?? 'Đơn giản',
      quantity: json['quantity'] as int? ?? 1,
      unitPrice: (json['unit_price'] as num?)?.toDouble() ?? 0.0,
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      variantOptions: json['variant_options'] as Map<String, dynamic>?,
      downloadFiles: json['download_files'],
      linkFiles: json['link_files'] as List<dynamic>?,
      product: json['product'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'shop_post_id': shopPostId,
      'product_name': productName,
      'product_type': productType,
      'quantity': quantity,
      'unit_price': unitPrice,
      'subtotal': subtotal,
      if (variantOptions != null) 'variant_options': variantOptions,
      if (downloadFiles != null) 'download_files': downloadFiles,
      if (linkFiles != null) 'link_files': linkFiles,
      if (product != null) 'product': product,
    };
  }

  // Product type constants
  static const String typeSimple = 'Đơn giản';
  static const String typeVariant = 'Biến thể';
  static const String typeDownload = 'Tải xuống';

  bool get isSimple => productType == typeSimple;
  bool get isVariant => productType == typeVariant;
  bool get isDownload => productType == typeDownload;
}

class ShippingAddress {
  final String? fullName;
  final String? address;
  final String? city;
  final String? state;
  final String? postalCode;
  final String? phone;
  final String? email;

  ShippingAddress({
    this.fullName,
    this.address,
    this.city,
    this.state,
    this.postalCode,
    this.phone,
    this.email,
  });

  factory ShippingAddress.fromJson(Map<String, dynamic> json) {
    return ShippingAddress(
      fullName: json['full_name'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      postalCode: json['postal_code'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'full_name': fullName,
      'address': address,
      'city': city,
      'state': state,
      'postal_code': postalCode,
      'phone': phone,
      'email': email,
    };
  }

  String get formattedAddress {
    final parts = <String>[];
    if (address != null && address!.isNotEmpty) parts.add(address!);
    if (city != null && city!.isNotEmpty) parts.add(city!);
    if (state != null && state!.isNotEmpty) parts.add(state!);
    if (postalCode != null && postalCode!.isNotEmpty) parts.add(postalCode!);
    return parts.join(', ');
  }
}

class ShopOrder {
  final int id;
  final String orderNumber;
  final int? shopId;
  final String status;
  final double subtotal;
  final double tax;
  final double shippingFee;
  final double discount;
  final double totalAmount;
  final String? notes;
  final ShippingAddress? shippingAddress;
  final ShippingAddress? billingAddress;
  final User? customer;
  final List<OrderItem> items;
  final String? createdAt;
  final String? updatedAt;

  ShopOrder({
    required this.id,
    required this.orderNumber,
    this.shopId,
    required this.status,
    this.subtotal = 0.0,
    this.tax = 0.0,
    this.shippingFee = 0.0,
    this.discount = 0.0,
    required this.totalAmount,
    this.notes,
    this.shippingAddress,
    this.billingAddress,
    this.customer,
    this.items = const [],
    this.createdAt,
    this.updatedAt,
  });

  factory ShopOrder.fromJson(Map<String, dynamic> json) {
    // Parse items
    List<OrderItem> items = [];
    if (json['items'] != null && json['items'] is List) {
      items = (json['items'] as List)
          .map((item) => OrderItem.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    // Parse customer
    User? customer;
    if (json['customer'] != null) {
      customer = User.fromJson(json['customer'] as Map<String, dynamic>);
    }

    // Parse shipping address
    ShippingAddress? shippingAddress;
    if (json['shipping_address'] != null) {
      shippingAddress = ShippingAddress.fromJson(json['shipping_address'] as Map<String, dynamic>);
    }

    // Parse billing address
    ShippingAddress? billingAddress;
    if (json['billing_address'] != null) {
      billingAddress = ShippingAddress.fromJson(json['billing_address'] as Map<String, dynamic>);
    }

    return ShopOrder(
      id: json['id'] as int,
      orderNumber: json['order_number'] as String? ?? '#${json['id']}',
      shopId: json['shop_id'] as int?,
      status: json['status'] as String? ?? 'pending',
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      tax: (json['tax'] as num?)?.toDouble() ?? 0.0,
      shippingFee: (json['shipping_fee'] as num?)?.toDouble() ?? 0.0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      notes: json['notes'] as String?,
      shippingAddress: shippingAddress,
      billingAddress: billingAddress,
      customer: customer,
      items: items,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'order_number': orderNumber,
      'shop_id': shopId,
      'status': status,
      'subtotal': subtotal,
      'tax': tax,
      'shipping_fee': shippingFee,
      'discount': discount,
      'total_amount': totalAmount,
      'notes': notes,
      if (shippingAddress != null) 'shipping_address': shippingAddress!.toJson(),
      if (billingAddress != null) 'billing_address': billingAddress!.toJson(),
      if (customer != null) 'customer': customer!.toJson(),
      'items': items.map((item) => item.toJson()).toList(),
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  // Status constants
  static const String statusPending = 'pending';
  static const String statusProcessing = 'processing';
  static const String statusCompleted = 'completed';
  static const String statusCancelled = 'cancelled';

  bool get isPending => status.toLowerCase() == statusPending;
  bool get isProcessing => status.toLowerCase() == statusProcessing;
  bool get isCompleted => status.toLowerCase() == statusCompleted;
  bool get isCancelled => status.toLowerCase() == statusCancelled;

  int get itemCount => items.length;

  String get statusLabel {
    switch (status.toLowerCase()) {
      case statusCompleted:
        return 'Hoàn thành';
      case statusProcessing:
        return 'Đang xử lý';
      case statusPending:
        return 'Chờ xử lý';
      case statusCancelled:
        return 'Đã hủy';
      default:
        return status;
    }
  }

  ShopOrder copyWith({
    int? id,
    String? orderNumber,
    int? shopId,
    String? status,
    double? subtotal,
    double? tax,
    double? shippingFee,
    double? discount,
    double? totalAmount,
    String? notes,
    ShippingAddress? shippingAddress,
    ShippingAddress? billingAddress,
    User? customer,
    List<OrderItem>? items,
    String? createdAt,
    String? updatedAt,
  }) {
    return ShopOrder(
      id: id ?? this.id,
      orderNumber: orderNumber ?? this.orderNumber,
      shopId: shopId ?? this.shopId,
      status: status ?? this.status,
      subtotal: subtotal ?? this.subtotal,
      tax: tax ?? this.tax,
      shippingFee: shippingFee ?? this.shippingFee,
      discount: discount ?? this.discount,
      totalAmount: totalAmount ?? this.totalAmount,
      notes: notes ?? this.notes,
      shippingAddress: shippingAddress ?? this.shippingAddress,
      billingAddress: billingAddress ?? this.billingAddress,
      customer: customer ?? this.customer,
      items: items ?? this.items,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
