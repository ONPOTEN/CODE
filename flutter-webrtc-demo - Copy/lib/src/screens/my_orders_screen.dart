import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/shop_service.dart';
import 'my_order_detail_screen.dart';

class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({Key? key}) : super(key: key);

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  bool _isLoading = true;
  String? _error;
  List<dynamic> _orders = [];
  String _filterStatus = '';

  final _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  final List<Map<String, String>> _statusOptions = [
    {'value': '', 'label': 'Tất cả trạng thái'},
    {'value': 'pending', 'label': 'Chờ xử lý'},
    {'value': 'processing', 'label': 'Đang xử lý'},
    {'value': 'completed', 'label': 'Hoàn thành'},
    {'value': 'cancelled', 'label': 'Đã hủy'},
  ];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final result = await ShopService.getMyOrders(
        status: _filterStatus.isNotEmpty ? _filterStatus : null,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (result['success'] == true) {
            _orders = result['data'] is List ? result['data'] : [];
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
      return DateFormat('dd/MM/yyyy').format(date);
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

  void _navigateToOrderDetail(dynamic order) {
    final orderId = order['id'];
    if (orderId != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => MyOrderDetailScreen(orderId: orderId),
        ),
      ).then((_) => _loadOrders());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Đơn hàng của tôi'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Filter Section
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey.shade100,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Lọc theo trạng thái',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Colors.grey.shade700,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: DropdownButton<String>(
                    value: _filterStatus,
                    isExpanded: true,
                    underline: const SizedBox(),
                    items: _statusOptions.map((option) {
                      return DropdownMenuItem<String>(
                        value: option['value'],
                        child: Text(option['label']!),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _filterStatus = value ?? '';
                      });
                      _loadOrders();
                    },
                  ),
                ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? _buildErrorView()
                    : _orders.isEmpty
                        ? _buildEmptyView()
                        : RefreshIndicator(
                            onRefresh: _loadOrders,
                            child: _buildOrdersList(),
                          ),
          ),

          // Footer
          if (!_isLoading && _error == null)
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.grey.shade100,
              child: Center(
                child: Text(
                  'Tổng cộng: ${_orders.length} đơn hàng',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                  ),
                ),
              ),
            ),
        ],
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
              onPressed: _loadOrders,
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shopping_bag_outlined, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              'Bạn chưa có đơn hàng nào.',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                // Navigate to product feed or shops
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade600,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
              child: const Text('Bắt đầu mua sắm'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrdersList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _orders.length,
      itemBuilder: (context, index) {
        final order = _orders[index];
        return _buildOrderCard(order);
      },
    );
  }

  Widget _buildOrderCard(dynamic order) {
    final orderNumber = order['order_number'] ?? '#${order['id']}';
    final itemsCount = order['items_count'] ?? order['items']?.length ?? 0;
    final totalAmount = order['total_amount'];
    final status = order['status'];
    final createdAt = order['created_at'];

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: () => _navigateToOrderDetail(order),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Order Number and Status
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    orderNumber,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(status).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getStatusLabel(status),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _getStatusColor(status),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Order Info Row
              Row(
                children: [
                  // Products Count
                  Expanded(
                    child: Row(
                      children: [
                        Icon(Icons.shopping_cart_outlined, size: 16, color: Colors.grey.shade500),
                        const SizedBox(width: 4),
                        Text(
                          '$itemsCount sản phẩm',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Total Amount
                  Text(
                    _formatPrice(totalAmount),
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue.shade700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Date and Action Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.calendar_today_outlined, size: 14, color: Colors.grey.shade400),
                      const SizedBox(width: 4),
                      Text(
                        _formatDate(createdAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Text(
                        'Xem chi tiết',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.blue.shade600,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Icon(Icons.chevron_right, size: 18, color: Colors.blue.shade600),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
