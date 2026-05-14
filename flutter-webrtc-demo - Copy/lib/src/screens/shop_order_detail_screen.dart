import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/shop.dart';
import '../models/shop_order.dart';
import '../models/shop_post.dart';
import '../services/shop_service.dart';
import 'shop_post_form_screen.dart';

class ShopOrderDetailScreen extends StatefulWidget {
  final Shop shop;
  final ShopOrder order;

  const ShopOrderDetailScreen({
    Key? key,
    required this.shop,
    required this.order,
  }) : super(key: key);

  @override
  State<ShopOrderDetailScreen> createState() => _ShopOrderDetailScreenState();
}

class _ShopOrderDetailScreenState extends State<ShopOrderDetailScreen> {
  late ShopOrder _order;
  late String _selectedStatus;
  bool _isUpdatingStatus = false;
  bool _hasChanges = false;
  bool _isLoadingProductDetails = false;

  final _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _order = widget.order;
    _selectedStatus = _order.status;
    _loadProductDetailsForDownloads();
  }

  Future<void> _loadProductDetailsForDownloads() async {
    // For completed orders with download products, fetch product details to get download_files and link_files
    if (_order.isCompleted) {
      final downloadItems = _order.items.where((item) => item.isDownload).toList();

      if (downloadItems.isNotEmpty) {
        setState(() => _isLoadingProductDetails = true);

        for (final item in downloadItems) {
          if (item.shopPostId != null) {
            try {
              final result = await ShopService.getShopPost(widget.shop.id, item.shopPostId!);
              if (result['success'] == true && result['post'] != null) {
                // Update item with fresh download files from product
                // This is handled through the product field in OrderItem
              }
            } catch (e) {
              print('Error fetching product details for download item: $e');
            }
          }
        }

        if (mounted) {
          setState(() => _isLoadingProductDetails = false);
        }
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return Colors.green;
      case 'processing':
        return Colors.blue;
      case 'pending':
        return Colors.orange;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Color _getProductTypeColor(String type) {
    switch (type) {
      case 'Đơn giản':
        return Colors.blue;
      case 'Biến thể':
        return Colors.purple;
      case 'Tải xuống':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  Future<void> _handleStatusUpdate() async {
    if (_selectedStatus == _order.status) return;

    setState(() {
      _isUpdatingStatus = true;
    });

    try {
      final result = await ShopService.updateOrderStatus(_order.id, _selectedStatus);

      if (mounted) {
        setState(() {
          _isUpdatingStatus = false;
        });

        if (result['success'] == true) {
          setState(() {
            _order = _order.copyWith(status: _selectedStatus);
            _hasChanges = true;
          });
          _showSnackBar('Đã cập nhật trạng thái đơn hàng thành công');

          // If status changed to completed, reload product details for downloads
          if (_selectedStatus == 'completed') {
            _loadProductDetailsForDownloads();
          }
        } else {
          setState(() {
            _selectedStatus = _order.status;
          });
          _showSnackBar(result['message'] ?? 'Cập nhật thất bại', isError: true);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isUpdatingStatus = false;
          _selectedStatus = _order.status;
        });
        _showSnackBar('Lỗi: ${e.toString()}', isError: true);
      }
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String _formatDateTime(String? dateTimeStr) {
    if (dateTimeStr == null) return '';
    try {
      final dateTime = DateTime.parse(dateTimeStr);
      return DateFormat('dd/MM/yyyy HH:mm').format(dateTime);
    } catch (e) {
      return dateTimeStr;
    }
  }

  String _formatDate(String? dateTimeStr) {
    if (dateTimeStr == null) return '';
    try {
      final dateTime = DateTime.parse(dateTimeStr);
      return DateFormat('dd/MM/yyyy').format(dateTime);
    } catch (e) {
      return dateTimeStr;
    }
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      _showSnackBar('Không thể mở liên kết', isError: true);
    }
  }

  Future<void> _downloadFile(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      _showSnackBar('Không thể tải xuống tệp', isError: true);
    }
  }

  Future<void> _navigateToEditProduct(int postId) async {
    // Fetch the post first
    final result = await ShopService.getShopPost(widget.shop.id, postId);
    if (result['success'] == true && result['post'] != null) {
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ShopPostFormScreen(
              shop: widget.shop,
              post: result['post'] as ShopPost,
            ),
          ),
        ).then((_) {
          // Reload product details after editing
          _loadProductDetailsForDownloads();
        });
      }
    } else {
      _showSnackBar('Không thể tải thông tin sản phẩm', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          Navigator.pop(context, _hasChanges);
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(_order.orderNumber),
          backgroundColor: Colors.blue.shade700,
          foregroundColor: Colors.white,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.pop(context, _hasChanges),
          ),
        ),
        body: RefreshIndicator(
          onRefresh: _loadProductDetailsForDownloads,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Back Link
                InkWell(
                  onTap: () => Navigator.pop(context, _hasChanges),
                  child: Row(
                    children: [
                      Icon(Icons.arrow_back, size: 18, color: Colors.blue.shade700),
                      const SizedBox(width: 8),
                      Text(
                        'Quay lại đơn hàng',
                        style: TextStyle(
                          color: Colors.blue.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Order Info Header
                _buildOrderHeader(),
                const SizedBox(height: 16),

                // Status Update Section
                _buildStatusSection(),
                const SizedBox(height: 16),

                // Order Items
                _buildOrderItemsSection(),
                const SizedBox(height: 16),

                // Shipping Address
                if (_order.shippingAddress != null) ...[
                  _buildShippingAddressSection(),
                  const SizedBox(height: 16),
                ],

                // Customer Info
                if (_order.customer != null) ...[
                  _buildCustomerSection(),
                  const SizedBox(height: 16),
                ],

                // Order Summary
                _buildOrderSummarySection(),
                const SizedBox(height: 16),

                // Order Timeline
                _buildTimelineSection(),
                const SizedBox(height: 24),

                // Notes
                if (_order.notes != null && _order.notes!.isNotEmpty) ...[
                  _buildNotesSection(),
                  const SizedBox(height: 24),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOrderHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade600, Colors.blue.shade800],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _order.orderNumber,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: _getStatusColor(_order.status),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _order.statusLabel,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.calendar_today, size: 14, color: Colors.white.withOpacity(0.8)),
              const SizedBox(width: 6),
              Text(
                'Ngày đặt hàng: ${_formatDateTime(_order.createdAt)}',
                style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 13),
              ),
            ],
          ),
          if (_order.itemCount > 0) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.shopping_bag, size: 14, color: Colors.white.withOpacity(0.8)),
                const SizedBox(width: 6),
                Text(
                  '${_order.itemCount} sản phẩm',
                  style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 13),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusSection() {
    return Container(
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
          Row(
            children: [
              Icon(Icons.sync, size: 20, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              const Text(
                'Trạng thái đơn hàng',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              // Current Status Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: _getStatusColor(_order.status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _getStatusColor(_order.status)),
                ),
                child: Text(
                  _order.statusLabel,
                  style: TextStyle(
                    color: _getStatusColor(_order.status),
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Icon(Icons.arrow_forward, size: 18, color: Colors.grey.shade400),
              const SizedBox(width: 12),

              // Status Dropdown
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedStatus,
                      isExpanded: true,
                      items: const [
                        DropdownMenuItem(value: 'pending', child: Text('Chờ xử lý')),
                        DropdownMenuItem(value: 'processing', child: Text('Đang xử lý')),
                        DropdownMenuItem(value: 'completed', child: Text('Hoàn thành')),
                        DropdownMenuItem(value: 'cancelled', child: Text('Đã hủy')),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _selectedStatus = value ?? _order.status;
                        });
                      },
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: (_isUpdatingStatus || _selectedStatus == _order.status)
                  ? null
                  : _handleStatusUpdate,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade600,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                disabledBackgroundColor: Colors.grey.shade300,
              ),
              child: _isUpdatingStatus
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      _selectedStatus == _order.status ? 'Không có thay đổi' : 'Cập nhật trạng thái',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderItemsSection() {
    return Container(
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
          Row(
            children: [
              Icon(Icons.shopping_cart, size: 20, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              const Text(
                'Sản phẩm trong đơn',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_order.items.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              child: const Center(
                child: Text('Không có sản phẩm trong đơn hàng này', style: TextStyle(color: Colors.grey)),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _order.items.length,
              separatorBuilder: (_, __) => const Divider(height: 32),
              itemBuilder: (context, index) => _buildOrderItemCard(_order.items[index]),
            ),
        ],
      ),
    );
  }

  Widget _buildOrderItemCard(OrderItem item) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Product Name & Type
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.productName,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Số lượng: ${item.quantity}',
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: _getProductTypeColor(item.productType).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  item.productType,
                  style: TextStyle(
                    fontSize: 11,
                    color: _getProductTypeColor(item.productType),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),

          // Variant Options
          if (item.isVariant && item.variantOptions != null && item.variantOptions!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tùy chọn đã chọn:',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade700),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 12,
                    runSpacing: 6,
                    children: item.variantOptions!.entries.map((entry) {
                      return Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${entry.key}:',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.grey.shade700),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${entry.value}',
                            style: const TextStyle(fontSize: 12),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ],

          // Download Files (for download products when order is completed)
          if (item.isDownload) ...[
            const SizedBox(height: 12),
            _buildDownloadSection(item),
          ],

          // Pricing
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  '${_currencyFormat.format(item.unitPrice)} × ${item.quantity} = ',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
                Text(
                  _currencyFormat.format(item.subtotal),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDownloadSection(OrderItem item) {
    if (!_order.isCompleted) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.yellow.shade50,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.yellow.shade300),
        ),
        child: Row(
          children: [
            Icon(Icons.info_outline, size: 18, color: Colors.yellow.shade800),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Tải xuống sẽ khả dụng sau khi đơn hàng hoàn thành.',
                style: TextStyle(fontSize: 12),
              ),
            ),
          ],
        ),
      );
    }

    final hasDownloadFiles = item.downloadFiles != null &&
        ((item.downloadFiles is List && (item.downloadFiles as List).isNotEmpty) ||
            (item.downloadFiles is Map && (item.downloadFiles as Map).isNotEmpty) ||
            (item.downloadFiles is String && (item.downloadFiles as String).isNotEmpty));

    final hasLinkFiles = item.linkFiles != null && item.linkFiles!.isNotEmpty;

    if (!hasDownloadFiles && !hasLinkFiles) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.info_outline, size: 18, color: Colors.grey),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Chưa có tệp tải xuống cho sản phẩm này.',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ),
              ],
            ),
            if (item.shopPostId != null) ...[
              const SizedBox(height: 10),
              InkWell(
                onTap: () => _navigateToEditProduct(item.shopPostId!),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.edit, size: 14, color: Colors.blue.shade600),
                    const SizedBox(width: 4),
                    Text(
                      'Sửa sản phẩm để thêm tệp',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.blue.shade600,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      );
    }

    return Column(
      children: [
        // Downloadable Files
        if (hasDownloadFiles)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green.shade300),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text('📁', style: TextStyle(fontSize: 16)),
                    const SizedBox(width: 8),
                    Text(
                      'Tệp tải xuống',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.green.shade800),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ..._buildDownloadFilesList(item.downloadFiles),
              ],
            ),
          ),

        // External Links
        if (hasLinkFiles) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue.shade300),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text('🔗', style: TextStyle(fontSize: 16)),
                    const SizedBox(width: 8),
                    Text(
                      'Liên kết ngoài',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.blue.shade800),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ...item.linkFiles!.map((link) => _buildLinkItem(link)).toList(),
              ],
            ),
          ),
        ],
      ],
    );
  }

  List<Widget> _buildDownloadFilesList(dynamic downloadFiles) {
    List<dynamic> files = [];
    if (downloadFiles is List) {
      files = downloadFiles;
    } else if (downloadFiles is Map) {
      files = [downloadFiles];
    } else if (downloadFiles is String && downloadFiles.isNotEmpty) {
      files = [downloadFiles];
    }

    return files.map((file) {
      String fileName;
      String fileUrl;
      String? fileSize;

      if (file is String) {
        fileName = file.split('/').last;
        fileUrl = file;
      } else if (file is Map) {
        fileName = file['name'] ?? file['title'] ?? 'File';
        fileUrl = file['url'] ?? file['path'] ?? '';
        if (file['size'] != null) {
          final size = file['size'];
          if (size is num) {
            fileSize = '${(size / 1024).toStringAsFixed(2)} KB';
          }
        }
      } else {
        fileName = 'File';
        fileUrl = '';
      }

      return Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: Colors.green.shade200),
        ),
        child: Row(
          children: [
            Icon(Icons.insert_drive_file, size: 18, color: Colors.green.shade600),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    fileName,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (fileSize != null)
                    Text(
                      fileSize,
                      style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                    ),
                ],
              ),
            ),
            if (fileUrl.isNotEmpty)
              InkWell(
                onTap: () => _downloadFile(fileUrl),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.green.shade600,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'Tải xuống',
                    style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
                  ),
                ),
              ),
          ],
        ),
      );
    }).toList();
  }

  Widget _buildLinkItem(dynamic link) {
    String linkTitle;
    String linkUrl;

    if (link is String) {
      linkTitle = link;
      linkUrl = link;
    } else if (link is Map) {
      linkTitle = link['title'] ?? link['label'] ?? 'Link';
      linkUrl = link['url'] ?? link['path'] ?? '';
    } else {
      linkTitle = 'Link';
      linkUrl = '';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.open_in_new, size: 18, color: Colors.blue.shade600),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  linkTitle,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                  overflow: TextOverflow.ellipsis,
                ),
                if (linkUrl.isNotEmpty && linkUrl != linkTitle)
                  Text(
                    linkUrl,
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          if (linkUrl.isNotEmpty)
            InkWell(
              onTap: () => _openUrl(linkUrl),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.blue.shade600,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'Mở',
                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCustomerSection() {
    final customer = _order.customer!;
    return Container(
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
          Row(
            children: [
              Icon(Icons.person, size: 20, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              const Text(
                'Khách hàng',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildLabelValueRow('Tên', customer.displayName ?? customer.username ?? ''),
          _buildLabelValueRow('Email', customer.email ?? ''),
          _buildLabelValueRow('Mã người dùng', '#${customer.id}'),
        ],
      ),
    );
  }

  Widget _buildShippingAddressSection() {
    final address = _order.shippingAddress!;
    return Container(
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
          Row(
            children: [
              Icon(Icons.local_shipping, size: 20, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              const Text(
                'Địa chỉ giao hàng',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (address.fullName != null && address.fullName!.isNotEmpty)
            Text(address.fullName!, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          if (address.address != null && address.address!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(address.address!, style: TextStyle(color: Colors.grey.shade700)),
            ),
          if (address.formattedAddress.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '${address.city ?? ''}, ${address.state ?? ''} ${address.postalCode ?? ''}'.trim(),
                style: TextStyle(color: Colors.grey.shade700),
              ),
            ),
          const SizedBox(height: 8),
          if (address.phone != null && address.phone!.isNotEmpty)
            Row(
              children: [
                Icon(Icons.phone, size: 14, color: Colors.grey.shade600),
                const SizedBox(width: 6),
                Text('Điện thoại: ${address.phone}', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
              ],
            ),
          if (address.email != null && address.email!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  Icon(Icons.email, size: 14, color: Colors.grey.shade600),
                  const SizedBox(width: 6),
                  Text('Email: ${address.email}', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOrderSummarySection() {
    return Container(
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
          Row(
            children: [
              Icon(Icons.receipt_long, size: 20, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              const Text(
                'Tổng kết đơn hàng',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildSummaryRow('Tạm tính:', _order.subtotal),
          if (_order.tax > 0) _buildSummaryRow('Thuế:', _order.tax),
          if (_order.shippingFee > 0) _buildSummaryRow('Phí vận chuyển:', _order.shippingFee),
          if (_order.discount > 0) _buildSummaryRow('Giảm giá:', -_order.discount, isDiscount: true),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Tổng cộng:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              Text(
                _currencyFormat.format(_order.totalAmount),
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                  color: Colors.blue.shade700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, double amount, {bool isDiscount = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
          Text(
            isDiscount ? '-${_currencyFormat.format(amount.abs())}' : _currencyFormat.format(amount),
            style: TextStyle(
              color: isDiscount ? Colors.red : null,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineSection() {
    return Container(
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
          Row(
            children: [
              Icon(Icons.history, size: 20, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              const Text(
                'Lịch sử',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildTimelineItem(
            'Đã đặt hàng',
            _formatDate(_order.createdAt),
            Colors.blue,
            isCompleted: true,
          ),
          if (!_order.isPending)
            _buildTimelineItem(
              'Đang xử lý',
              _formatDate(_order.updatedAt),
              Colors.blue,
              isCompleted: _order.isProcessing || _order.isCompleted,
            ),
          if (_order.isCompleted)
            _buildTimelineItem(
              'Hoàn thành',
              _formatDate(_order.updatedAt),
              Colors.green,
              isCompleted: true,
              isLast: true,
            ),
          if (_order.isCancelled)
            _buildTimelineItem(
              'Đã hủy',
              _formatDate(_order.updatedAt),
              Colors.red,
              isCompleted: true,
              isLast: true,
            ),
        ],
      ),
    );
  }

  Widget _buildTimelineItem(String title, String date, Color color, {bool isCompleted = false, bool isLast = false}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: isCompleted ? color : Colors.grey.shade300,
                shape: BoxShape.circle,
              ),
              child: Icon(
                isCompleted ? Icons.check : Icons.circle,
                color: Colors.white,
                size: 18,
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 28,
                color: Colors.grey.shade300,
              ),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                const SizedBox(height: 2),
                Text(date, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildNotesSection() {
    return Container(
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
          Row(
            children: [
              Icon(Icons.note, size: 20, color: Colors.blue.shade700),
              const SizedBox(width: 8),
              const Text(
                'Ghi chú',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _order.notes!,
            style: TextStyle(color: Colors.grey.shade700),
          ),
        ],
      ),
    );
  }

  Widget _buildLabelValueRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(fontSize: 10, color: Colors.grey.shade500, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
