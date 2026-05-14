import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/shop_post.dart';
import '../services/shop_service.dart';
import 'shop_detail_screen.dart';
import 'shops_list_screen.dart';

class ProductFeedScreen extends StatefulWidget {
  const ProductFeedScreen({Key? key}) : super(key: key);

  @override
  State<ProductFeedScreen> createState() => _ProductFeedScreenState();
}

class _ProductFeedScreenState extends State<ProductFeedScreen> {
  bool _isLoading = true;
  String? _error;
  List<ShopPost> _latestProducts = [];
  List<ShopPost> _trendingProducts = [];

  final _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Fetch both latest and trending products in parallel
      final results = await Future.wait([
        ShopService.getProductFeed(perPage: 10),
        ShopService.getTrendingProducts(perPage: 10),
      ]);

      final latestResult = results[0];
      final trendingResult = results[1];

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (latestResult['success'] == true) {
            _latestProducts = latestResult['posts'] as List<ShopPost>? ?? [];
          }
          if (trendingResult['success'] == true) {
            _trendingProducts = trendingResult['posts'] as List<ShopPost>? ?? [];
          }
          if (latestResult['success'] != true && trendingResult['success'] != true) {
            _error = latestResult['message'] ?? trendingResult['message'] ?? 'Không thể tải sản phẩm';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'Lỗi: ${e.toString()}';
        });
      }
    }
  }

  String _getRelativeTime(String? dateTimeStr) {
    if (dateTimeStr == null) return '';
    try {
      final dateTime = DateTime.parse(dateTimeStr);
      final now = DateTime.now();
      final secondsAgo = now.difference(dateTime).inSeconds;

      if (secondsAgo < 60) return 'vừa xong';
      if (secondsAgo < 3600) return '${(secondsAgo / 60).floor()} phút trước';
      if (secondsAgo < 86400) return '${(secondsAgo / 3600).floor()} giờ trước';
      if (secondsAgo < 604800) return '${(secondsAgo / 86400).floor()} ngày trước';
      if (secondsAgo < 2592000) return '${(secondsAgo / 604800).floor()} tuần trước';
      return '${(secondsAgo / 2592000).floor()} tháng trước';
    } catch (e) {
      return '';
    }
  }

  String _formatPrice(dynamic price) {
    if (price == null) return '';
    final numPrice = price is String ? double.tryParse(price) : price.toDouble();
    if (numPrice == null) return '';
    return _currencyFormat.format(numPrice);
  }

  bool _hasDiscount(ShopPost product) {
    if (product.salePrice == null || product.price == null) return false;
    final salePrice = double.tryParse(product.salePrice!) ?? 0;
    final originalPrice = double.tryParse(product.price!) ?? 0;
    return salePrice > 0 && originalPrice > 0 && salePrice < originalPrice;
  }

  int _getDiscountPercent(ShopPost product) {
    if (!_hasDiscount(product)) return 0;
    final salePrice = double.tryParse(product.salePrice!) ?? 0;
    final originalPrice = double.tryParse(product.price!) ?? 0;
    return ((1 - salePrice / originalPrice) * 100).round();
  }

  void _navigateToShop(ShopPost product) {
    if (product.shop != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ShopDetailScreen(shop: product.shop),
        ),
      );
    } else if (product.shopId > 0) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ShopDetailScreen(shopId: product.shopId),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sản phẩm'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          TextButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ShopsListScreen()),
              );
            },
            icon: const Icon(Icons.store, color: Colors.white, size: 18),
            label: const Text(
              'Xem Shops',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Latest Products Section
                        _buildSectionHeader(
                          icon: Icons.access_time,
                          iconColor: Colors.blue,
                          title: 'Sản phẩm mới nhất',
                        ),
                        const SizedBox(height: 12),
                        _latestProducts.isEmpty
                            ? _buildEmptySection('Chưa có sản phẩm mới.')
                            : _buildProductGrid(_latestProducts),

                        const SizedBox(height: 24),

                        // Trending Products Section
                        _buildSectionHeader(
                          icon: Icons.local_fire_department,
                          iconColor: Colors.orange,
                          title: 'Sản phẩm thịnh hành',
                        ),
                        const SizedBox(height: 12),
                        _trendingProducts.isEmpty
                            ? _buildEmptySection('Chưa có sản phẩm thịnh hành.')
                            : _buildProductGrid(_trendingProducts),

                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
            const SizedBox(height: 16),
            const Text(
              'Lỗi khi tải sản phẩm',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? 'Đã xảy ra lỗi',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loadData,
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader({
    required IconData icon,
    required Color iconColor,
    required String title,
  }) {
    return Row(
      children: [
        Icon(icon, size: 20, color: iconColor),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildEmptySection(String message) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Center(
        child: Text(
          message,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey.shade600,
          ),
        ),
      ),
    );
  }

  Widget _buildProductGrid(List<ShopPost> products) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.65,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) => _buildProductCard(products[index]),
    );
  }

  Widget _buildProductCard(ShopPost product) {
    final hasDiscount = _hasDiscount(product);
    final discountPercent = _getDiscountPercent(product);
    final imageUrl = product.firstImage;

    return GestureDetector(
      onTap: () => _navigateToShop(product),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Image
            Expanded(
              flex: 3,
              child: Stack(
                children: [
                  // Image
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                    ),
                    child: imageUrl.isNotEmpty
                        ? ClipRRect(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                            child: Image.network(
                              imageUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => _buildImagePlaceholder(),
                            ),
                          )
                        : _buildImagePlaceholder(),
                  ),

                  // Discount Badge
                  if (hasDiscount)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '-$discountPercent%',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),

                  // Product Type Badge (for Digital products)
                  if (product.productType == 'Tải xuống')
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.purple,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'Digital',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Product Info
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Shop Info
                    _buildShopInfo(product),
                    const SizedBox(height: 4),

                    // Title
                    Expanded(
                      child: Text(
                        product.title,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),

                    // Price
                    _buildPriceRow(product, hasDiscount),

                    // Time
                    const SizedBox(height: 4),
                    Text(
                      _getRelativeTime(product.createdAt),
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    return Center(
      child: Icon(
        Icons.image_outlined,
        size: 40,
        color: Colors.grey.shade300,
      ),
    );
  }

  Widget _buildShopInfo(ShopPost product) {
    final shopName = product.shop?.name ?? 'Shop';
    final shopLogo = product.shop?.logo;

    return Row(
      children: [
        // Shop Logo
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.blue.shade500,
          ),
          child: shopLogo != null && shopLogo.isNotEmpty
              ? ClipOval(
                  child: Image.network(
                    shopLogo,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _buildShopInitial(shopName),
                  ),
                )
              : _buildShopInitial(shopName),
        ),
        const SizedBox(width: 4),
        // Shop Name
        Expanded(
          child: Text(
            shopName,
            style: TextStyle(
              fontSize: 10,
              color: Colors.grey.shade600,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildShopInitial(String name) {
    return Center(
      child: Text(
        name.isNotEmpty ? name[0].toUpperCase() : 'S',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 9,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildPriceRow(ShopPost product, bool hasDiscount) {
    if (hasDiscount) {
      return Row(
        children: [
          Text(
            _formatPrice(product.salePrice),
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.red,
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Text(
              _formatPrice(product.price),
              style: TextStyle(
                fontSize: 10,
                color: Colors.grey.shade400,
                decoration: TextDecoration.lineThrough,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      );
    }

    if (product.price != null && product.price!.isNotEmpty) {
      return Text(
        _formatPrice(product.price),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      );
    }

    if (product.priceRange != null && product.priceRange!.isNotEmpty) {
      return Text(
        product.priceRange!,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      );
    }

    return Text(
      'Liên hệ để biết giá',
      style: TextStyle(
        fontSize: 11,
        color: Colors.grey.shade600,
      ),
    );
  }
}
