import 'package:flutter/material.dart';
import '../models/shop.dart';
import '../models/shop_post.dart';
import '../services/shop_service.dart';
import 'shop_detail_screen.dart';
import 'shop_post_form_screen.dart';
import 'shop_messages_screen.dart';

class MyShopScreen extends StatefulWidget {
  const MyShopScreen({Key? key}) : super(key: key);

  @override
  State<MyShopScreen> createState() => _MyShopScreenState();
}

class _MyShopScreenState extends State<MyShopScreen> {
  List<Shop> _shops = [];
  Map<int, List<ShopPost>> _shopPosts = {};
  Map<int, bool> _expandedPosts = {};
  Map<int, Map<String, dynamic>> _shopMessageStats = {};
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadShops();
  }

  Future<void> _loadShops() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final result = await ShopService.getMyShops();

      if (result['success'] == true) {
        final shops = result['shops'] as List<Shop>;
        setState(() {
          _shops = shops;
          _isLoading = false;
        });

        // Load posts and message stats for each shop
        for (var shop in shops) {
          _loadShopPosts(shop.id);
          _loadShopMessageStats(shop.id);
        }
      } else {
        setState(() {
          _errorMessage = result['message'] ?? 'Không thể tải danh sách cửa hàng';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Lỗi: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  Future<void> _loadShopPosts(int shopId) async {
    try {
      final result = await ShopService.getShopPosts(shopId);

      if (result['success'] == true && mounted) {
        setState(() {
          _shopPosts[shopId] = result['posts'] as List<ShopPost>;
        });
      }
    } catch (e) {
      debugPrint('Error loading posts for shop $shopId: $e');
    }
  }

  Future<void> _loadShopMessageStats(int shopId) async {
    try {
      final result = await ShopService.getShopMessageStats(shopId);

      if (result['success'] == true && mounted) {
        setState(() {
          _shopMessageStats[shopId] = {
            'total_messages': result['total_messages'] ?? 0,
            'unread_count': result['unread_count'] ?? 0,
          };
        });
      }
    } catch (e) {
      debugPrint('Error loading message stats for shop $shopId: $e');
    }
  }

  Future<void> _showCreateShopDialog() async {
    final nameController = TextEditingController();
    final slugController = TextEditingController();
    final descriptionController = TextEditingController();
    final addressController = TextEditingController();
    final cityController = TextEditingController();
    final phoneController = TextEditingController();
    final emailController = TextEditingController();

    await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Tạo cửa hàng mới'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Tên cửa hàng *',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: slugController,
                decoration: const InputDecoration(
                  labelText: 'Đường dẫn (slug) *',
                  hintText: 'ten-cua-hang',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Mô tả',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: addressController,
                decoration: const InputDecoration(
                  labelText: 'Địa chỉ',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: cityController,
                decoration: const InputDecoration(
                  labelText: 'Thành phố',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                decoration: const InputDecoration(
                  labelText: 'Số điện thoại',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.trim().isEmpty ||
                  slugController.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Tên và đường dẫn là bắt buộc'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }

              Navigator.pop(context, true);

              final createResult = await ShopService.createShop(
                name: nameController.text.trim(),
                slug: slugController.text.trim(),
                description: descriptionController.text.trim().isNotEmpty
                    ? descriptionController.text.trim()
                    : null,
                address: addressController.text.trim().isNotEmpty
                    ? addressController.text.trim()
                    : null,
                city: cityController.text.trim().isNotEmpty
                    ? cityController.text.trim()
                    : null,
                phone: phoneController.text.trim().isNotEmpty
                    ? phoneController.text.trim()
                    : null,
                email: emailController.text.trim().isNotEmpty
                    ? emailController.text.trim()
                    : null,
              );

              if (mounted) {
                if (createResult['success'] == true) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(createResult['message'] ?? 'Đã tạo cửa hàng'),
                      backgroundColor: Colors.green,
                    ),
                  );
                  _loadShops();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(createResult['message'] ?? 'Tạo thất bại'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Tạo'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteShop(Shop shop) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xác nhận xóa'),
        content: Text('Bạn có chắc muốn xóa cửa hàng "${shop.name}"?\n\nHành động này không thể hoàn tác.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final result = await ShopService.deleteShop(shop.id);
        if (mounted) {
          if (result['success'] == true) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Đã xóa cửa hàng'),
                backgroundColor: Colors.green,
              ),
            );
            _loadShops();
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(result['message'] ?? 'Xóa thất bại'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Lỗi: ${e.toString()}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Future<void> _deletePost(ShopPost post) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xác nhận xóa'),
        content: Text('Bạn có chắc muốn xóa sản phẩm "${post.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final result = await ShopService.deleteShopPost(post.shopId, post.id);
        if (mounted) {
          if (result['success'] == true) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Đã xóa sản phẩm'),
                backgroundColor: Colors.green,
              ),
            );
            _loadShopPosts(post.shopId);
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(result['message'] ?? 'Xóa thất bại'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Lỗi: ${e.toString()}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  void _showPaymentSettings(Shop shop) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Column(
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Title
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  const Icon(Icons.payment, color: Colors.blue),
                  const SizedBox(width: 12),
                  Text(
                    'Cài đặt thanh toán - ${shop.name}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 24),
            // Content
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.all(20),
                children: [
                  // Bank info section
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.blue.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.account_balance, color: Colors.blue.shade700),
                            const SizedBox(width: 8),
                            Text(
                              'Thông tin ngân hàng',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue.shade700,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _buildPaymentInfoRow('Ngân hàng', shop.bankName ?? 'Chưa cập nhật'),
                        _buildPaymentInfoRow('Số tài khoản', shop.bankAccount ?? 'Chưa cập nhật'),
                        _buildPaymentInfoRow('Chủ tài khoản', shop.bankAccountName ?? 'Chưa cập nhật'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  // VietQR section placeholder
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        Icon(
                          Icons.qr_code_2,
                          size: 100,
                          color: Colors.grey.shade400,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Mã VietQR',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Cập nhật thông tin ngân hàng để tạo mã QR thanh toán',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  // Edit button
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Chức năng đang được phát triển'),
                        ),
                      );
                    },
                    icon: const Icon(Icons.edit),
                    label: const Text('Chỉnh sửa thông tin thanh toán'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShopCard(Shop shop) {
    final posts = _shopPosts[shop.id] ?? [];
    final isExpanded = _expandedPosts[shop.id] ?? false;
    final messageStats = _shopMessageStats[shop.id];
    final unreadCount = messageStats?['unread_count'] ?? 0;
    final totalMessages = messageStats?['total_messages'] ?? 0;

    final statusColor = shop.isActive
        ? Colors.green
        : shop.isPending
            ? Colors.orange
            : Colors.red;

    final statusText = shop.isActive
        ? 'Đang hoạt động'
        : shop.isPending
            ? 'Chờ duyệt'
            : 'Tạm dừng';

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 3,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Pending notification banner
          if (shop.isPending)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.orange.shade100,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(12),
                ),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.orange.shade700, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Cửa hàng đang chờ duyệt. Vui lòng chờ quản trị viên phê duyệt.',
                      style: TextStyle(
                        color: Colors.orange.shade800,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Shop header with gradient
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.blue.shade600, Colors.blue.shade400],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.only(
                topLeft: shop.isPending ? Radius.zero : const Radius.circular(12),
                topRight: shop.isPending ? Radius.zero : const Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                // Shop logo
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: shop.logo != null
                        ? Image.network(
                            shop.logo!,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                const Icon(Icons.store, size: 30, color: Colors.blue),
                          )
                        : const Icon(Icons.store, size: 30, color: Colors.blue),
                  ),
                ),
                const SizedBox(width: 12),
                // Shop info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        shop.name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '@${shop.slug}',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                // Status badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    statusText,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Description
                if (shop.description != null) ...[
                  Text(
                    shop.description!,
                    style: TextStyle(
                      color: Colors.grey[700],
                      fontSize: 14,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                ],

                // Stats row
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatItem(Icons.inventory_2, '${posts.length}', 'Sản phẩm'),
                      Container(width: 1, height: 30, color: Colors.grey.shade300),
                      _buildStatItem(
                        Icons.message,
                        '$totalMessages',
                        'Tin nhắn',
                        badgeCount: unreadCount,
                      ),
                      Container(width: 1, height: 30, color: Colors.grey.shade300),
                      _buildStatItem(Icons.shopping_cart, '0', 'Đơn hàng'),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Shop Info
                if (shop.address != null || shop.city != null) ...[
                  _buildInfoRow(Icons.location_on, shop.fullAddress),
                  const SizedBox(height: 8),
                ],
                if (shop.phone != null) ...[
                  _buildInfoRow(Icons.phone, shop.phone!),
                  const SizedBox(height: 8),
                ],
                if (shop.email != null) ...[
                  _buildInfoRow(Icons.email, shop.email!),
                  const SizedBox(height: 8),
                ],

                const SizedBox(height: 12),

                // Action Buttons - Row 1
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => ShopDetailScreen(shop: shop),
                            ),
                          );
                          _loadShops();
                        },
                        icon: const Icon(Icons.visibility, size: 18),
                        label: const Text('Xem'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ShopMessagesScreen(shop: shop),
                            ),
                          );
                        },
                        icon: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            const Icon(Icons.message, size: 18),
                            if (unreadCount > 0)
                              Positioned(
                                right: -8,
                                top: -8,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Colors.red,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Text(
                                    unreadCount > 99 ? '99+' : '$unreadCount',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        label: const Text('Tin nhắn'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Đơn hàng - Đang phát triển')),
                          );
                        },
                        icon: const Icon(Icons.shopping_bag, size: 18),
                        label: const Text('Đơn hàng'),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 8),

                // Action Buttons - Row 2
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Chỉnh sửa - Đang phát triển')),
                          );
                        },
                        icon: const Icon(Icons.edit, size: 18),
                        label: const Text('Sửa'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _showPaymentSettings(shop),
                        icon: const Icon(Icons.payment, size: 18),
                        label: const Text('Thanh toán'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _deleteShop(shop),
                        icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                        label: const Text('Xóa', style: TextStyle(color: Colors.red)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.red),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 8),

                // Add Product button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      await Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => ShopPostFormScreen(shop: shop),
                        ),
                      );
                      _loadShops();
                    },
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Thêm sản phẩm'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),

                // Expandable Posts Section
                if (posts.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Divider(),
                  InkWell(
                    onTap: () {
                      setState(() {
                        _expandedPosts[shop.id] = !isExpanded;
                      });
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Sản phẩm (${posts.length})',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Icon(
                            isExpanded ? Icons.expand_less : Icons.expand_more,
                            color: Colors.grey,
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (isExpanded)
                    Column(
                      children: posts.map((post) => _buildPostItem(post)).toList(),
                    ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String value, String label, {int badgeCount = 0}) {
    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Icon(icon, color: Colors.blue, size: 24),
            if (badgeCount > 0)
              Positioned(
                right: -8,
                top: -8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    badgeCount > 99 ? '99+' : '$badgeCount',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildPostItem(ShopPost post) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          // Post image
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              color: Colors.grey.shade200,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: post.hasImages
                  ? Image.network(
                      post.firstImage,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          const Icon(Icons.image, color: Colors.grey),
                    )
                  : const Icon(Icons.image, color: Colors.grey),
            ),
          ),
          const SizedBox(width: 12),
          // Post info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  post.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                if (post.price != null && post.price!.isNotEmpty)
                  Text(
                    '${_formatPriceString(post.price!)} đ',
                    style: TextStyle(
                      color: Colors.green.shade700,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
              ],
            ),
          ),
          // Actions
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.edit, size: 20),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Sửa sản phẩm - Đang phát triển')),
                  );
                },
                color: Colors.blue,
                constraints: const BoxConstraints(),
                padding: const EdgeInsets.all(8),
              ),
              IconButton(
                icon: const Icon(Icons.delete, size: 20),
                onPressed: () => _deletePost(post),
                color: Colors.red,
                constraints: const BoxConstraints(),
                padding: const EdgeInsets.all(8),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatPriceString(String priceStr) {
    // Try to parse the price string
    final price = double.tryParse(priceStr);
    if (price == null) return priceStr;

    return price.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey[600]),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              color: Colors.grey[700],
              fontSize: 13,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.store_mall_directory_outlined,
            size: 100,
            color: Colors.grey[300],
          ),
          const SizedBox(height: 16),
          Text(
            'Chưa có cửa hàng',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Tạo cửa hàng đầu tiên để bắt đầu bán hàng',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[500],
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _showCreateShopDialog,
            icon: const Icon(Icons.add),
            label: const Text('Tạo cửa hàng'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(
                horizontal: 32,
                vertical: 16,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cửa hàng của tôi'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          if (_shops.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: _showCreateShopDialog,
              tooltip: 'Tạo cửa hàng',
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadShops,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _errorMessage != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 60,
                          color: Colors.red[300],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _errorMessage!,
                          style: TextStyle(
                            color: Colors.red[700],
                            fontSize: 16,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadShops,
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  )
                : _shops.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _shops.length,
                        itemBuilder: (context, index) {
                          return _buildShopCard(_shops[index]);
                        },
                      ),
      ),
    );
  }
}
