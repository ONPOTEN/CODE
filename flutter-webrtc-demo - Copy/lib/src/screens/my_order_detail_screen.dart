import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/shop_service.dart';

class MyOrderDetailScreen extends StatefulWidget {
  final int orderId;

  const MyOrderDetailScreen({
    Key? key,
    required this.orderId,
  }) : super(key: key);

  @override
  State<MyOrderDetailScreen> createState() => _MyOrderDetailScreenState();
}

class _MyOrderDetailScreenState extends State<MyOrderDetailScreen> {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _order;

  final _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final result = await ShopService.getOrderById(widget.orderId);

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (result['success'] == true) {
            _order = result['data'];
          } else {
            _error = result['message'] ?? 'Không thể tải đơn hàng';
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

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('dd/MM/yyyy HH:mm').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  String _formatDateOnly(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('dd \'tháng\' MM, yyyy').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  String _formatPrice(dynamic amount) {
    if (amount == null) return '₫0';
    final numAmount = amount is String ? double.tryParse(amount) ?? 0 : amount.toDouble();
    return _currencyFormat.format(numAmount);
  }

  Color _getStatusColor(String? status) {
    switch (status) {
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

  String _getStatusLabel(String? status) {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'processing':
        return 'Đang xử lý';
      case 'pending':
        return 'Chờ xử lý';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status ?? 'N/A';
    }
  }

  String _getPaymentMethodLabel(String? method) {
    switch (method) {
      case 'cod':
        return 'Thanh toán khi nhận hàng (COD)';
      case 'qr':
        return 'Thanh toán QR Code';
      case 'bank_transfer':
        return 'Chuyển khoản ngân hàng';
      default:
        return method ?? 'N/A';
    }
  }

  String _getProductTypeLabel(String? type) {
    switch (type) {
      case 'Đơn giản':
        return 'Sản phẩm đơn giản';
      case 'Biến thể':
        return 'Sản phẩm biến thể';
      case 'Tải xuống':
        return 'Sản phẩm tải xuống';
      default:
        return type ?? 'N/A';
    }
  }

  Color _getProductTypeColor(String? type) {
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

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_order != null ? _order!['order_number'] ?? 'Chi tiết đơn hàng' : 'Chi tiết đơn hàng'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : _order == null
                  ? _buildNotFoundView()
                  : RefreshIndicator(
                      onRefresh: _loadOrder,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        child: _buildOrderContent(),
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
              'Lỗi khi tải đơn hàng',
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
              onPressed: _loadOrder,
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotFoundView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            const Text(
              'Không tìm thấy đơn hàng',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Đơn hàng bạn đang tìm kiếm không tồn tại.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Quay lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderContent() {
    final status = _order!['status'];
    final orderNumber = _order!['order_number'] ?? '#${_order!['id']}';
    final orderReference = _order!['order_reference'];
    final paymentMethod = _order!['payment_method'];
    final createdAt = _order!['created_at'];
    final items = _order!['items'] as List<dynamic>? ?? [];
    final shippingAddress = _order!['shipping_address'];
    final subtotal = _order!['subtotal'];
    final tax = _order!['tax'];
    final shippingFee = _order!['shipping_fee'];
    final discount = _order!['discount'];
    final totalAmount = _order!['total_amount'];

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Section
          _buildHeaderSection(orderNumber, status, createdAt),

          // Order Reference & Payment Method
          if (orderReference != null || paymentMethod != null)
            _buildReferenceSection(orderReference, paymentMethod),

          const SizedBox(height: 16),

          // Order Summary Card
          _buildSummaryCard(subtotal, tax, shippingFee, discount, totalAmount),

          const SizedBox(height: 16),

          // Order Items
          _buildItemsSection(items, status),

          // Shipping Address
          if (shippingAddress != null) ...[
            const SizedBox(height: 16),
            _buildShippingAddressCard(shippingAddress),
          ],

          const SizedBox(height: 16),

          // Order Timeline
          _buildTimelineSection(status, createdAt),

          const SizedBox(height: 24),

          // Action Buttons
          _buildActionButtons(status),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildHeaderSection(String orderNumber, String? status, String? createdAt) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade700, Colors.blue.shade500],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                orderNumber,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  _getStatusLabel(status),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: _getStatusColor(status),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.calendar_today, size: 14, color: Colors.white70),
              const SizedBox(width: 4),
              Text(
                'Đặt hàng ngày ${_formatDateOnly(createdAt)}',
                style: const TextStyle(
                  fontSize: 13,
                  color: Colors.white70,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildReferenceSection(String? orderReference, String? paymentMethod) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (orderReference != null) ...[
            Row(
              children: [
                Icon(Icons.tag, size: 16, color: Colors.amber.shade700),
                const SizedBox(width: 8),
                const Text('Mã đơn hàng: ', style: TextStyle(fontWeight: FontWeight.w500)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade100,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    orderReference,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.amber.shade800,
                    ),
                  ),
                ),
              ],
            ),
          ],
          if (paymentMethod != null) ...[
            if (orderReference != null) const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.payment, size: 16, color: Colors.blue.shade700),
                const SizedBox(width: 8),
                const Text('Thanh toán: ', style: TextStyle(fontWeight: FontWeight.w500)),
                Text(
                  _getPaymentMethodLabel(paymentMethod),
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.blue.shade800,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSummaryCard(dynamic subtotal, dynamic tax, dynamic shippingFee, dynamic discount, dynamic totalAmount) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tóm tắt đơn hàng',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _buildSummaryRow('Tạm tính:', _formatPrice(subtotal)),
            if (tax != null && (tax is num ? tax > 0 : double.tryParse(tax.toString()) != null && double.parse(tax.toString()) > 0))
              _buildSummaryRow('Thuế:', _formatPrice(tax)),
            if (shippingFee != null && (shippingFee is num ? shippingFee > 0 : double.tryParse(shippingFee.toString()) != null && double.parse(shippingFee.toString()) > 0))
              _buildSummaryRow('Phí vận chuyển:', _formatPrice(shippingFee)),
            if (discount != null && (discount is num ? discount > 0 : double.tryParse(discount.toString()) != null && double.parse(discount.toString()) > 0))
              _buildSummaryRow('Giảm giá:', '-${_formatPrice(discount)}', isDiscount: true),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Tổng cộng:',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Text(
                  _formatPrice(totalAmount),
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.green.shade700,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isDiscount = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600)),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w500,
              color: isDiscount ? Colors.green.shade700 : null,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemsSection(List<dynamic> items, String? orderStatus) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Sản phẩm trong đơn hàng',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (items.isEmpty)
              const Text('Không có sản phẩm trong đơn hàng này')
            else
              ...items.map((item) => _buildItemCard(item, orderStatus)).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildItemCard(dynamic item, String? orderStatus) {
    final productName = item['product_name'] ?? 'Sản phẩm';
    final productType = item['product_type'];
    final quantity = item['quantity'] ?? 1;
    final unitPrice = item['unit_price'];
    final subtotal = item['subtotal'];
    final variantOptions = item['variant_options'] as Map<String, dynamic>?;
    final downloadFiles = item['download_files'];
    final linkFiles = item['link_files'] as List<dynamic>?;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade200),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Product Header
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      productName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: _getProductTypeColor(productType).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        _getProductTypeLabel(productType),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: _getProductTypeColor(productType),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    _formatPrice(subtotal),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${_formatPrice(unitPrice)} × $quantity',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Variant Options
          if (variantOptions != null && variantOptions.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tùy chọn đã chọn:',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey.shade700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 16,
                    runSpacing: 4,
                    children: variantOptions.entries.map((entry) {
                      return Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${entry.key}: ',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                          Text(
                            entry.value.toString(),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ],

          // Download Section for Digital Products
          if (productType == 'Tải xuống') ...[
            const SizedBox(height: 12),
            _buildDownloadSection(downloadFiles, linkFiles, orderStatus),
          ],
        ],
      ),
    );
  }

  Widget _buildDownloadSection(dynamic downloadFiles, List<dynamic>? linkFiles, String? orderStatus) {
    if (orderStatus != 'completed') {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.amber.shade50,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.amber.shade200),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.amber.shade700, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tệp tải xuống chưa khả dụng',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Colors.amber.shade800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Tệp tải xuống sẽ khả dụng khi đơn hàng được đánh dấu là Hoàn thành.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.amber.shade700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Trạng thái hiện tại: ${_getStatusLabel(orderStatus)}',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.amber.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final hasDownloadFiles = downloadFiles != null && (
      (downloadFiles is List && downloadFiles.isNotEmpty) ||
      (downloadFiles is Map && downloadFiles.isNotEmpty) ||
      (downloadFiles is String && downloadFiles.isNotEmpty)
    );
    final hasLinkFiles = linkFiles != null && linkFiles.isNotEmpty;

    if (!hasDownloadFiles && !hasLinkFiles) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.info_outline, color: Colors.grey.shade600, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Chưa có tệp tải xuống',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Colors.grey.shade700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Sản phẩm này chưa có tệp tải xuống. Vui lòng liên hệ người bán.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Download Files
        if (hasDownloadFiles)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text('📁 ', style: TextStyle(fontSize: 16)),
                    Text(
                      'Tệp tải xuống',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ..._buildDownloadFilesList(downloadFiles),
              ],
            ),
          ),

        // Link Files
        if (hasLinkFiles) ...[
          if (hasDownloadFiles) const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text('🔗 ', style: TextStyle(fontSize: 16)),
                    Text(
                      'Liên kết bên ngoài',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ...linkFiles!.asMap().entries.map((entry) {
                  final link = entry.value;
                  final title = link is Map ? (link['title'] ?? link['label'] ?? 'Link ${entry.key + 1}') : 'Link ${entry.key + 1}';
                  final url = link is Map ? (link['url'] ?? link.toString()) : link.toString();
                  return _buildLinkItem(title, url);
                }).toList(),
              ],
            ),
          ),
        ],
      ],
    );
  }

  List<Widget> _buildDownloadFilesList(dynamic downloadFiles) {
    final List<dynamic> files;
    if (downloadFiles is List) {
      files = downloadFiles;
    } else if (downloadFiles is String) {
      files = [downloadFiles];
    } else if (downloadFiles is Map) {
      files = [downloadFiles];
    } else {
      return [];
    }

    return files.asMap().entries.map((entry) {
      final file = entry.value;
      final fileName = file is String
          ? file.split('/').last
          : (file is Map ? (file['name'] ?? 'File ${entry.key + 1}') : 'File ${entry.key + 1}');
      final fileUrl = file is String ? file : (file is Map ? file['url'] : null);
      final fileSize = file is Map && file['size'] != null
          ? '${(file['size'] / 1024).toStringAsFixed(2)} KB'
          : null;

      return Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: Colors.green.shade100),
        ),
        child: Row(
          children: [
            Icon(Icons.insert_drive_file, color: Colors.green.shade600, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    fileName,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                  if (fileSize != null)
                    Text(
                      'Kích thước: $fileSize',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade500,
                      ),
                    ),
                ],
              ),
            ),
            if (fileUrl != null)
              ElevatedButton.icon(
                onPressed: () => _launchUrl(fileUrl),
                icon: const Icon(Icons.download, size: 16),
                label: const Text('Tải'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green.shade500,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  textStyle: const TextStyle(fontSize: 12),
                ),
              ),
          ],
        ),
      );
    }).toList();
  }

  Widget _buildLinkItem(String title, String url) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Row(
        children: [
          Icon(Icons.open_in_new, color: Colors.blue.shade600, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                Text(
                  url,
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey.shade500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          ElevatedButton.icon(
            onPressed: () => _launchUrl(url),
            icon: const Icon(Icons.open_in_new, size: 16),
            label: const Text('Mở'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue.shade500,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              textStyle: const TextStyle(fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShippingAddressCard(dynamic address) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Địa chỉ giao hàng',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (address['full_name'] != null)
              Text(
                address['full_name'],
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            if (address['address'] != null)
              Text(address['address']),
            Text([
              address['city'],
              address['state'],
              address['postal_code'],
            ].where((e) => e != null && e.isNotEmpty).join(', ')),
            const SizedBox(height: 8),
            if (address['email'] != null)
              InkWell(
                onTap: () => _launchUrl('mailto:${address['email']}'),
                child: Row(
                  children: [
                    Icon(Icons.email, size: 14, color: Colors.blue.shade600),
                    const SizedBox(width: 4),
                    Text(
                      address['email'],
                      style: TextStyle(color: Colors.blue.shade600),
                    ),
                  ],
                ),
              ),
            if (address['phone'] != null)
              InkWell(
                onTap: () => _launchUrl('tel:${address['phone']}'),
                child: Row(
                  children: [
                    Icon(Icons.phone, size: 14, color: Colors.blue.shade600),
                    const SizedBox(width: 4),
                    Text(
                      address['phone'],
                      style: TextStyle(color: Colors.blue.shade600),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineSection(String? status, String? createdAt) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tiến trình đơn hàng',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildTimelineItem(
              'Đã đặt hàng',
              _formatDate(createdAt),
              true,
              false,
            ),
            _buildTimelineItem(
              'Đang xử lý',
              status != 'pending' ? 'Đang thực hiện' : 'Chờ xử lý',
              status != 'pending' && status != 'cancelled',
              true,
            ),
            _buildTimelineItem(
              'Đã giao hàng',
              status == 'completed' ? 'Đơn hàng hoàn thành' : 'Chờ giao hàng',
              status == 'completed',
              true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineItem(String title, String subtitle, bool isCompleted, bool showLine) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isCompleted ? Colors.green.shade500 : Colors.grey.shade300,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.check,
                size: 18,
                color: Colors.white,
              ),
            ),
            if (showLine)
              Container(
                width: 2,
                height: 32,
                color: Colors.grey.shade300,
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
                if (showLine) const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(String? status) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.grey.shade200,
              foregroundColor: Colors.grey.shade800,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: const Text('Quay lại danh sách đơn hàng'),
          ),
        ),
        if (status == 'pending') ...[
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                // TODO: Implement cancel order
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Chức năng đang được phát triển')),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade500,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const Text('Hủy đơn hàng'),
            ),
          ),
        ],
      ],
    );
  }
}
