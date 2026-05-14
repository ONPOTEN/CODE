import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/shop.dart';
import '../models/shop_order.dart';
import '../services/shop_service.dart';
import 'shop_order_detail_screen.dart';

class ShopOrdersScreen extends StatefulWidget {
  final Shop shop;

  const ShopOrdersScreen({
    Key? key,
    required this.shop,
  }) : super(key: key);

  @override
  State<ShopOrdersScreen> createState() => _ShopOrdersScreenState();
}

class _ShopOrdersScreenState extends State<ShopOrdersScreen> {
  bool _isLoading = true;
  String? _error;
  List<ShopOrder> _orders = [];
  String _filterStatus = '';
  Set<int> _selectedOrders = {};
  bool _isBulkUpdating = false;

  final _currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

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
      final result = await ShopService.getShopOrders(
        shopId: widget.shop.id,
        status: _filterStatus.isEmpty ? null : _filterStatus,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (result['success'] == true) {
            final ordersData = result['data'] as List? ?? [];
            _orders = ordersData
                .map((json) => ShopOrder.fromJson(json as Map<String, dynamic>))
                .toList();
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

  void _handleSelectOrder(int orderId) {
    setState(() {
      if (_selectedOrders.contains(orderId)) {
        _selectedOrders.remove(orderId);
      } else {
        _selectedOrders.add(orderId);
      }
    });
  }

  void _handleSelectAll() {
    setState(() {
      if (_selectedOrders.length == _orders.length) {
        _selectedOrders.clear();
      } else {
        _selectedOrders = _orders.map((o) => o.id).toSet();
      }
    });
  }

  Future<void> _handleBulkStatusUpdate(String newStatus) async {
    if (_selectedOrders.isEmpty) {
      _showSnackBar('Vui lòng chọn ít nhất một đơn hàng', isError: true);
      return;
    }

    final statusLabel = _getStatusLabel(newStatus);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xác nhận cập nhật'),
        content: Text('Cập nhật ${_selectedOrders.length} đơn hàng sang trạng thái "$statusLabel"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
            child: const Text('Cập nhật', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() {
      _isBulkUpdating = true;
    });

    try {
      int successCount = 0;
      for (final orderId in _selectedOrders) {
        final result = await ShopService.updateOrderStatus(orderId, newStatus);
        if (result['success'] == true) {
          successCount++;
        }
      }

      _showSnackBar('Đã cập nhật $successCount/${_selectedOrders.length} đơn hàng');
      _selectedOrders.clear();
      await _loadOrders();
    } catch (e) {
      _showSnackBar('Lỗi cập nhật: ${e.toString()}', isError: true);
    } finally {
      if (mounted) {
        setState(() {
          _isBulkUpdating = false;
        });
      }
    }
  }

  String _getStatusLabel(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Hoàn thành';
      case 'processing':
        return 'Đang xử lý';
      case 'pending':
        return 'Chờ xử lý';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
      ),
    );
  }

  String _formatDateTime(String? dateTimeStr) {
    if (dateTimeStr == null) return '';
    try {
      final dateTime = DateTime.parse(dateTimeStr);
      return DateFormat('dd/MM/yyyy').format(dateTime);
    } catch (e) {
      return dateTimeStr;
    }
  }

  // Stats getters
  int get _totalOrders => _orders.length;
  int get _pendingOrders => _orders.where((o) => o.isPending).length;
  int get _processingOrders => _orders.where((o) => o.isProcessing).length;
  int get _completedOrders => _orders.where((o) => o.isCompleted).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Đơn hàng - ${widget.shop.name}'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorView()
              : RefreshIndicator(
                  onRefresh: _loadOrders,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Filters and Actions
                        _buildFiltersSection(),
                        const SizedBox(height: 16),

                        // Bulk Actions (when orders selected)
                        if (_selectedOrders.isNotEmpty) ...[
                          _buildBulkActionsSection(),
                          const SizedBox(height: 16),
                        ],

                        // Orders List
                        _orders.isEmpty
                            ? _buildEmptyView()
                            : _buildOrdersList(),

                        // Stats Summary
                        if (_orders.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          _buildStatsSection(),
                        ],
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
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            const Text(
              'Lỗi',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(_error ?? 'Đã xảy ra lỗi', textAlign: TextAlign.center),
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
            Icon(Icons.inbox_outlined, size: 80, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            const Text(
              'Chưa có đơn hàng',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Cửa hàng của bạn chưa có đơn hàng nào.',
              style: TextStyle(color: Colors.grey.shade600),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFiltersSection() {
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
          const Text(
            'Lọc theo trạng thái',
            style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _filterStatus,
            decoration: InputDecoration(
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            items: const [
              DropdownMenuItem(value: '', child: Text('Tất cả đơn hàng')),
              DropdownMenuItem(value: 'pending', child: Text('Chờ xử lý')),
              DropdownMenuItem(value: 'processing', child: Text('Đang xử lý')),
              DropdownMenuItem(value: 'completed', child: Text('Hoàn thành')),
              DropdownMenuItem(value: 'cancelled', child: Text('Đã hủy')),
            ],
            onChanged: (value) {
              setState(() {
                _filterStatus = value ?? '';
                _selectedOrders.clear();
              });
              _loadOrders();
            },
          ),
        ],
      ),
    );
  }

  Widget _buildBulkActionsSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Đã chọn ${_selectedOrders.length} đơn hàng',
            style: TextStyle(fontWeight: FontWeight.w500, color: Colors.blue.shade800),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildBulkActionButton('Đang xử lý', 'processing', Colors.blue),
              _buildBulkActionButton('Hoàn thành', 'completed', Colors.green),
              _buildBulkActionButton('Đã hủy', 'cancelled', Colors.red),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBulkActionButton(String label, String status, Color color) {
    return ElevatedButton(
      onPressed: _isBulkUpdating ? null : () => _handleBulkStatusUpdate(status),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      ),
      child: Text(label, style: const TextStyle(fontSize: 12)),
    );
  }

  Widget _buildOrdersList() {
    return Column(
      children: [
        // Select All Row
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
          ),
          child: Row(
            children: [
              Checkbox(
                value: _selectedOrders.length == _orders.length && _orders.isNotEmpty,
                onChanged: (_) => _handleSelectAll(),
              ),
              const Text('Chọn tất cả', style: TextStyle(fontWeight: FontWeight.w500)),
            ],
          ),
        ),

        // Orders
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.shade200,
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _orders.length,
            separatorBuilder: (_, __) => Divider(height: 1, color: Colors.grey.shade200),
            itemBuilder: (context, index) => _buildOrderItem(_orders[index]),
          ),
        ),
      ],
    );
  }

  Widget _buildOrderItem(ShopOrder order) {
    final isSelected = _selectedOrders.contains(order.id);
    final statusColor = _getStatusColor(order.status);

    return InkWell(
      onTap: () async {
        final result = await Navigator.push<bool>(
          context,
          MaterialPageRoute(
            builder: (context) => ShopOrderDetailScreen(
              shop: widget.shop,
              order: order,
            ),
          ),
        );
        if (result == true) {
          _loadOrders();
        }
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        color: isSelected ? Colors.blue.shade50 : null,
        child: Row(
          children: [
            // Checkbox
            Checkbox(
              value: isSelected,
              onChanged: (_) => _handleSelectOrder(order.id),
            ),

            // Order Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Order Number & Status
                  Row(
                    children: [
                      Text(
                        order.orderNumber,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          order.statusLabel,
                          style: TextStyle(fontSize: 10, color: statusColor, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),

                  // Customer
                  Text(
                    order.customer?.displayName ?? order.customer?.username ?? 'Khách hàng',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),

                  // Items count & Date
                  Row(
                    children: [
                      Text(
                        '${order.itemCount} sản phẩm',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '• ${_formatDateTime(order.createdAt)}',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Total Amount
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _currencyFormat.format(order.totalAmount),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 4),
                const Icon(Icons.chevron_right, color: Colors.grey, size: 20),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsSection() {
    return Row(
      children: [
        Expanded(child: _buildStatCard('Tổng', _totalOrders, Colors.grey)),
        const SizedBox(width: 8),
        Expanded(child: _buildStatCard('Chờ', _pendingOrders, Colors.orange)),
        const SizedBox(width: 8),
        Expanded(child: _buildStatCard('Xử lý', _processingOrders, Colors.blue)),
        const SizedBox(width: 8),
        Expanded(child: _buildStatCard('Xong', _completedOrders, Colors.green)),
      ],
    );
  }

  Widget _buildStatCard(String label, int count, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.shade200,
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            count.toString(),
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color),
          ),
          Text(
            label,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }
}
