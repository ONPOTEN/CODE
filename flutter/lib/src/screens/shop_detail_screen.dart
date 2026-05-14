import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/shop.dart';
import '../models/shop_post.dart';
import '../services/shop_service.dart';
import '../services/auth_storage.dart';
import 'shop_post_form_screen.dart';
import 'shop_wall_screen.dart';
import 'shop_payment_settings_screen.dart';
import 'shop_orders_screen.dart';

class ShopDetailScreen extends StatefulWidget {
  final Shop? shop;
  final int? shopId;

  const ShopDetailScreen({
    Key? key,
    this.shop,
    this.shopId,
  }) : super(key: key);

  @override
  State<ShopDetailScreen> createState() => _ShopDetailScreenState();
}

class _ShopDetailScreenState extends State<ShopDetailScreen> {
  bool _isLoading = true;
  String? _error;
  Shop? _shop;
  List<ShopPost> _posts = [];
  String _productTypeFilter = 'simple';
  int _carouselIndex = 0;
  int? _currentUserId;
  final _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  final _imageLabels = [
    'Giấy DKKD',
    'Giấy phép kinh doanh',
    'Chứng chỉ liên quan',
    'Hình ảnh cửa hàng',
    'Ảnh bổ sung',
  ];

  int get _effectiveShopId => widget.shop?.id ?? widget.shopId ?? 0;

  @override
  void initState() {
    super.initState();
    if (widget.shop != null) {
      _shop = widget.shop;
    }
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Get current user ID
      _currentUserId = await AuthStorage.getUserId();

      // Load shop data if not provided or need refresh
      if (_shop == null || widget.shopId != null) {
        final shopResult = await ShopService.getShop(_effectiveShopId);
        if (shopResult['success'] == true && shopResult['shop'] != null) {
          _shop = shopResult['shop'] as Shop;
        } else if (_shop == null) {
          throw Exception(shopResult['message'] ?? 'Không thể tải thông tin cửa hàng');
        }
      }

      // Load posts
      await _loadPosts();

      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString();
        });
      }
    }
  }

  Future<void> _loadPosts() async {
    try {
      final postsResult = await ShopService.getShopPosts(
        _effectiveShopId,
        perPage: 100,
        productType: _productTypeFilter == 'all' ? null : _getProductTypeValue(_productTypeFilter),
        status: _isOwner ? null : 'published',
      );

      if (postsResult['success'] == true) {
        setState(() {
          _posts = postsResult['posts'] as List<ShopPost>? ?? [];
        });
      }
    } catch (e) {
      print('Error loading posts: $e');
    }
  }

  String _getProductTypeValue(String filter) {
    switch (filter) {
      case 'simple':
        return 'Đơn giản';
      case 'variant':
        return 'Biến thể';
      case 'download':
        return 'Tải xuống';
      default:
        return '';
    }
  }

  bool get _isOwner => _currentUserId != null && _shop != null && _shop!.userId == _currentUserId;

  List<String?> get _shopImages => [
    _shop?.image1,
    _shop?.image2,
    _shop?.image3,
    _shop?.image4,
    _shop?.image5,
  ];

  bool get _hasShopImages => _shopImages.any((img) => img != null && img.isNotEmpty);

  void _handleShare() async {
    if (_shop == null) return;
    try {
      await Share.share(
        'Xem ${_shop!.name} trên nền tảng của chúng tôi!',
        subject: _shop!.name,
      );
    } catch (e) {
      _showSnackBar('Không thể chia sẻ', isError: true);
    }
  }

  void _handleCall() async {
    if (_shop?.phone == null || _shop!.phone!.isEmpty) {
      _showSnackBar('Không có số điện thoại', isError: true);
      return;
    }
    final uri = Uri.parse('tel:${_shop!.phone}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _handleFindPath() async {
    if (_shop?.address == null || _shop!.address!.isEmpty) {
      _showSnackBar('Không có địa chỉ', isError: true);
      return;
    }
    final query = Uri.encodeComponent(_shop!.fullAddress);
    final uri = Uri.parse('https://www.google.com/maps/search/$query');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _handleMessage() {
    // TODO: Implement messaging functionality
    _showSnackBar('Tính năng nhắn tin sẽ được cập nhật');
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
      ),
    );
  }

  void _openImage(String? imageUrl) {
    if (imageUrl == null || imageUrl.isEmpty) return;
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Stack(
          children: [
            InteractiveViewer(
              child: Image.network(
                imageUrl,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Icon(Icons.error, color: Colors.white, size: 64),
              ),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white, size: 32),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : _buildContent(),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            const Text(
              'Không tìm thấy cửa hàng',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(_error ?? 'Cửa hàng bạn đang tìm kiếm không tồn tại.', textAlign: TextAlign.center),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Quay lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: CustomScrollView(
        slivers: [
          // Banner Section with AppBar
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: Colors.blue.shade700,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: _shop?.banner != null && _shop!.banner!.isNotEmpty
                  ? Image.network(
                      _shop!.banner!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildGradientBanner(),
                    )
                  : _buildGradientBanner(),
            ),
            actions: [
              if (_isOwner)
                IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () {
                    // TODO: Navigate to edit shop screen
                    _showSnackBar('Tính năng sửa cửa hàng sẽ được cập nhật');
                  },
                ),
            ],
          ),

          // Content
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Hero Section with Logo and Info
                _buildHeroSection(),

                // Action Buttons
                _buildActionButtons(),

                // Shop Info Images Carousel
                if (_hasShopImages) _buildShopImagesCarousel(),

                // Contact Information
                _buildContactSection(),

                // Quick Actions for Owner
                if (_isOwner) _buildQuickActions(),

                // Product Type Tabs and Posts
                _buildProductsSection(),

                const SizedBox(height: 32),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGradientBanner() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.blue.shade600, Colors.blue.shade800],
        ),
      ),
    );
  }

  Widget _buildHeroSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Logo
          if (_shop?.logo != null && _shop!.logo!.isNotEmpty)
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(9),
                child: Image.network(
                  _shop!.logo!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: Colors.grey.shade300,
                    child: const Icon(Icons.store, size: 40, color: Colors.grey),
                  ),
                ),
              ),
            ),
          const SizedBox(width: 16),

          // Shop Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name and Status
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _shop?.name ?? '',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    if (_shop?.status != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getStatusColor(_shop!.status).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _shop!.status.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: _getStatusColor(_shop!.status),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),

                // Description
                if (_shop?.description != null && _shop!.description!.isNotEmpty)
                  Text(
                    _shop!.description!,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return Colors.green;
      case 'inactive':
        return Colors.grey;
      case 'pending':
        return Colors.orange;
      case 'suspended':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Widget _buildActionButtons() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildActionButton(
              icon: Icons.share,
              label: 'Chia sẻ',
              color: Colors.blue,
              onTap: _handleShare,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildActionButton(
              icon: Icons.phone,
              label: 'Gọi',
              color: Colors.green,
              onTap: _handleCall,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildActionButton(
              icon: Icons.map,
              label: 'Tìm đường',
              color: Colors.purple,
              onTap: _handleFindPath,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildActionButton(
              icon: Icons.message,
              label: 'Nhắn tin',
              color: Colors.blue,
              onTap: _handleMessage,
              filled: true,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
    bool filled = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: filled ? color : Colors.grey.shade200,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 20,
              color: filled ? Colors.white : color,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: filled ? Colors.white : color,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShopImagesCarousel() {
    final availableImages = <MapEntry<int, String>>[];
    for (int i = 0; i < _shopImages.length; i++) {
      if (_shopImages[i] != null && _shopImages[i]!.isNotEmpty) {
        availableImages.add(MapEntry(i, _shopImages[i]!));
      }
    }

    if (availableImages.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Thông Tin Cửa Hàng',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          const SizedBox(height: 12),

          // Carousel
          SizedBox(
            height: 140,
            child: PageView.builder(
              itemCount: availableImages.length,
              onPageChanged: (index) {
                setState(() => _carouselIndex = index);
              },
              itemBuilder: (context, index) {
                final entry = availableImages[index];
                return GestureDetector(
                  onTap: () => _openImage(entry.value),
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    child: Column(
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              entry.value,
                              fit: BoxFit.cover,
                              width: double.infinity,
                              errorBuilder: (_, __, ___) => Container(
                                color: Colors.grey.shade300,
                                child: const Icon(Icons.image, size: 40, color: Colors.grey),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _imageLabels[entry.key],
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Indicators
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              availableImages.length,
              (index) => Container(
                width: _carouselIndex == index ? 16 : 6,
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: _carouselIndex == index ? Colors.blue.shade900 : Colors.blue.shade200,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactSection() {
    final hasContact = (_shop?.address != null && _shop!.address!.isNotEmpty) ||
        (_shop?.phone != null && _shop!.phone!.isNotEmpty) ||
        (_shop?.email != null && _shop!.email!.isNotEmpty) ||
        (_shop?.website != null && _shop!.website!.isNotEmpty);

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.shade200,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Thông tin liên hệ',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),

          if (!hasContact)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Chưa có thông tin liên hệ',
                  style: TextStyle(color: Colors.grey.shade500),
                ),
              ),
            )
          else ...[
            // Address
            if (_shop?.address != null && _shop!.address!.isNotEmpty)
              _buildContactRow(
                icon: Icons.location_on,
                label: 'Địa chỉ',
                value: _shop!.fullAddress,
              ),

            // Phone
            if (_shop?.phone != null && _shop!.phone!.isNotEmpty)
              _buildContactRow(
                icon: Icons.phone,
                label: 'Điện thoại',
                value: _shop!.phone!,
                isLink: true,
                onTap: _handleCall,
              ),

            // Email
            if (_shop?.email != null && _shop!.email!.isNotEmpty)
              _buildContactRow(
                icon: Icons.email,
                label: 'Email',
                value: _shop!.email!,
                isLink: true,
                onTap: () async {
                  final uri = Uri.parse('mailto:${_shop!.email}');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri);
                  }
                },
              ),

            // Website
            if (_shop?.website != null && _shop!.website!.isNotEmpty)
              _buildContactRow(
                icon: Icons.language,
                label: 'Trang web',
                value: _shop!.website!,
                isLink: true,
                onTap: () async {
                  final uri = Uri.parse(_shop!.website!);
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
              ),
          ],

          // Shop Owner
          if (_shop?.owner != null) ...[
            Divider(color: Colors.grey.shade300, height: 24),
            const Text(
              'Chủ cửa hàng',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                // Avatar
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: _shop!.owner!.avatar != null && _shop!.owner!.avatar!.isNotEmpty
                      ? ClipOval(
                          child: Image.network(
                            _shop!.owner!.avatar!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _buildOwnerInitial(),
                          ),
                        )
                      : _buildOwnerInitial(),
                ),
                const SizedBox(width: 12),
                // Name
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _shop!.owner!.displayName.isNotEmpty
                            ? _shop!.owner!.displayName
                            : _shop!.owner!.username,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        '@${_shop!.owner!.username}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildOwnerInitial() {
    final name = _shop?.owner?.displayName ?? _shop?.owner?.username ?? 'U';
    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [Colors.blue.shade500, Colors.purple.shade600],
        ),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : 'U',
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
    );
  }

  Widget _buildContactRow({
    required IconData icon,
    required String label,
    required String value,
    bool isLink = false,
    VoidCallback? onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.grey.shade600),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$label:',
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 2),
                InkWell(
                  onTap: isLink ? onTap : null,
                  child: Text(
                    value,
                    style: TextStyle(
                      fontSize: 13,
                      color: isLink ? Colors.blue.shade600 : Colors.grey.shade600,
                      decoration: isLink ? TextDecoration.underline : null,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.shade200,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Thao tác nhanh',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildQuickActionButton(
                  icon: Icons.add,
                  label: 'Tạo mới',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ShopPostFormScreen(shop: _shop!),
                      ),
                    ).then((_) => _loadPosts());
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildQuickActionButton(
                  icon: Icons.description,
                  label: 'Sản phẩm',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ShopWallScreen(shopId: _shop!.id),
                      ),
                    ).then((_) => _loadPosts());
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildQuickActionButton(
                  icon: Icons.payment,
                  label: 'Thanh toán',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ShopPaymentSettingsScreen(shop: _shop!),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildQuickActionButton(
                  icon: Icons.receipt_long,
                  label: 'Đơn hàng',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ShopOrdersScreen(shop: _shop!),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Colors.blue.shade500,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 20, color: Colors.white),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                fontSize: 10,
                color: Colors.white,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductsSection() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.shade200,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with Manage Link
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Sản phẩm',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              if (_isOwner)
                TextButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ShopWallScreen(shopId: _shop!.id),
                      ),
                    ).then((_) => _loadPosts());
                  },
                  child: const Text('Quản lý →'),
                ),
            ],
          ),
          const SizedBox(height: 12),

          // Product Type Filter Tabs
          Row(
            children: [
              Expanded(
                child: _buildProductTypeTab(
                  icon: '🛍️',
                  label: 'Simple',
                  value: 'simple',
                  color: Colors.blue,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildProductTypeTab(
                  icon: '🎨',
                  label: 'Variant',
                  value: 'variant',
                  color: Colors.purple,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildProductTypeTab(
                  icon: '📥',
                  label: 'Download',
                  value: 'download',
                  color: Colors.green,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Posts List
          _posts.isEmpty
              ? _buildEmptyProducts()
              : ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _posts.length,
                  separatorBuilder: (_, __) => Divider(color: Colors.grey.shade200, height: 24),
                  itemBuilder: (context, index) => _buildPostItem(_posts[index]),
                ),
        ],
      ),
    );
  }

  Widget _buildProductTypeTab({
    required String icon,
    required String label,
    required String value,
    required Color color,
  }) {
    final isSelected = _productTypeFilter == value;
    return InkWell(
      onTap: () {
        setState(() => _productTypeFilter = value);
        _loadPosts();
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.1) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? color : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(icon, style: const TextStyle(fontSize: 14)),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isSelected ? color : Colors.grey.shade700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyProducts() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            Icon(Icons.description_outlined, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              'Chưa có sản phẩm nào',
              style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
            ),
            if (_isOwner) ...[
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ShopPostFormScreen(shop: _shop!),
                    ),
                  ).then((_) => _loadPosts());
                },
                icon: const Icon(Icons.add),
                label: const Text('Tạo sản phẩm đầu tiên'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue.shade500,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPostItem(ShopPost post) {
    return InkWell(
      onTap: () {
        // TODO: Navigate to post detail screen
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title and Stats
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  post.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (_isOwner)
                IconButton(
                  icon: const Icon(Icons.edit, size: 20),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ShopPostFormScreen(
                          shop: _shop!,
                          post: post,
                        ),
                      ),
                    ).then((_) => _loadPosts());
                  },
                ),
            ],
          ),

          // Stats Row
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Icon(Icons.visibility, size: 14, color: Colors.grey.shade500),
                const SizedBox(width: 4),
                Text(
                  '${post.viewCount} lượt xem',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                ),
                const SizedBox(width: 16),
                Icon(Icons.calendar_today, size: 14, color: Colors.grey.shade500),
                const SizedBox(width: 4),
                Text(
                  _formatDate(post.createdAt),
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                ),
              ],
            ),
          ),

          // Main Image
          if (post.mainImage != null && post.mainImage!.isNotEmpty) ...[
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () => _openImage(post.mainImage),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  post.mainImage!,
                  height: 180,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 180,
                    color: Colors.grey.shade200,
                    child: const Center(child: Icon(Icons.image, size: 48, color: Colors.grey)),
                  ),
                ),
              ),
            ),
          ],

          // Other Images Gallery
          if (post.otherImages.isNotEmpty) ...[
            const SizedBox(height: 8),
            SizedBox(
              height: 80,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: post.otherImages.length,
                itemBuilder: (context, index) {
                  return GestureDetector(
                    onTap: () => _openImage(post.otherImages[index]),
                    child: Container(
                      width: 80,
                      margin: const EdgeInsets.only(right: 8),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          post.otherImages[index],
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: Colors.grey.shade200,
                            child: const Icon(Icons.image, color: Colors.grey),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],

          // Video indicator
          if (post.video != null && post.video!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.play_circle, size: 16, color: Colors.blue.shade700),
                  const SizedBox(width: 4),
                  Text(
                    'Video sản phẩm',
                    style: TextStyle(fontSize: 12, color: Colors.blue.shade700),
                  ),
                ],
              ),
            ),
          ],

          // Price Range
          if (post.priceRange != null && post.priceRange!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.attach_money, size: 18, color: Colors.green.shade700),
                  const SizedBox(width: 4),
                  Text(
                    post.priceRange!,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Colors.green.shade800,
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Content Preview
          if (post.content != null && post.content!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              post.content!,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade700,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ],

          // View Details Button
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () {
              // TODO: Navigate to post detail screen
            },
            icon: const Icon(Icons.open_in_new, size: 16),
            label: const Text('Xem chi tiết'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.blue.shade700,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('dd/MM/yyyy').format(date);
    } catch (e) {
      return dateStr;
    }
  }
}
