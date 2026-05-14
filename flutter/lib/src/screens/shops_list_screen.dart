import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/shop.dart';
import '../services/shop_service.dart';
import '../services/api_config.dart';
import 'shop_wall_screen.dart';

class ShopsListScreen extends StatefulWidget {
  const ShopsListScreen({Key? key}) : super(key: key);

  @override
  State<ShopsListScreen> createState() => _ShopsListScreenState();
}

class _ShopsListScreenState extends State<ShopsListScreen> {
  List<Shop> _shops = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  String? _errorMessage;
  int _currentPage = 1;
  bool _hasMoreShops = true;

  String _searchTerm = '';
  String _filterStatus = 'active';

  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadShops();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoadingMore && _hasMoreShops) {
        _loadMoreShops();
      }
    }
  }

  Future<void> _loadShops({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _currentPage = 1;
        _shops = [];
        _hasMoreShops = true;
        _isLoading = true;
        _errorMessage = null;
      });
    } else {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final result = await ShopService.getShops(
        page: _currentPage,
        perPage: 12,
        search: _searchTerm.isEmpty ? null : _searchTerm,
        status: _filterStatus,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (result['success'] == true) {
            final newShops = result['shops'] as List<Shop>;
            if (refresh) {
              _shops = newShops;
            } else {
              _shops.addAll(newShops);
            }
            _hasMoreShops = newShops.length >= 12;
          } else {
            _errorMessage = result['message'] ?? 'Không thể tải danh sách cửa hàng';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Lỗi: ${e.toString()}';
        });
      }
    }
  }

  Future<void> _loadMoreShops() async {
    if (_isLoadingMore || !_hasMoreShops) return;

    setState(() {
      _isLoadingMore = true;
    });

    _currentPage++;

    try {
      final result = await ShopService.getShops(
        page: _currentPage,
        perPage: 12,
        search: _searchTerm.isEmpty ? null : _searchTerm,
        status: _filterStatus,
      );

      if (mounted) {
        setState(() {
          _isLoadingMore = false;
          if (result['success'] == true) {
            final newShops = result['shops'] as List<Shop>;
            _shops.addAll(newShops);
            _hasMoreShops = newShops.length >= 12;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingMore = false;
          _currentPage--;
        });
      }
    }
  }

  void _onSearchSubmit() {
    _searchTerm = _searchController.text.trim();
    _loadShops(refresh: true);
  }

  void _onStatusChanged(String? value) {
    if (value != null) {
      setState(() {
        _filterStatus = value;
      });
      _loadShops(refresh: true);
    }
  }

  Widget _buildShopCard(Shop shop) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => ShopWallScreen(shopId: shop.id),
          ),
        );
      },
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Banner Image
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              child: Container(
                height: 100,
                color: Colors.orange[100],
                child: shop.banner != null && shop.banner!.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: ApiConfig.getImageUrl(shop.banner!),
                        fit: BoxFit.cover,
                        width: double.infinity,
                        height: 100,
                        placeholder: (context, url) => Container(
                          color: Colors.orange[100],
                          child: const Center(
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        ),
                        errorWidget: (context, url, error) => Container(
                          color: Colors.orange[100],
                          child: Icon(Icons.store, size: 40, color: Colors.orange[300]),
                        ),
                      )
                    : Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.orange[300]!, Colors.orange[600]!],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Icon(Icons.store, size: 40, color: Colors.white.withOpacity(0.5)),
                      ),
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Logo and Name Row
                  Row(
                    children: [
                      // Shop Logo
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: Colors.orange[200],
                        backgroundImage: shop.logo != null && shop.logo!.isNotEmpty
                            ? CachedNetworkImageProvider(ApiConfig.getImageUrl(shop.logo!))
                            : null,
                        child: shop.logo == null || shop.logo!.isEmpty
                            ? Text(
                                shop.name.isNotEmpty
                                    ? shop.name[0].toUpperCase()
                                    : 'S',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              )
                            : null,
                      ),
                      const SizedBox(width: 10),
                      // Shop Name
                      Expanded(
                        child: Text(
                          shop.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Description
                  if (shop.description != null && shop.description!.isNotEmpty)
                    Text(
                      shop.description!,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  const SizedBox(height: 10),
                  // Stats Row
                  Row(
                    children: [
                      // Posts
                      Icon(Icons.article, size: 16, color: Colors.grey[500]),
                      const SizedBox(width: 4),
                      Text(
                        '${shop.postsCount}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Location
                      if (shop.city != null && shop.city!.isNotEmpty) ...[
                        Icon(Icons.location_on, size: 16, color: Colors.grey[500]),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            shop.city!,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                      // Status Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: shop.isActive ? Colors.green[100] : Colors.grey[100],
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          shop.isActive ? 'Hoạt động' : shop.status,
                          style: TextStyle(
                            fontSize: 10,
                            color: shop.isActive ? Colors.green[800] : Colors.grey[800],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
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
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: const Text('Cửa hàng'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: Colors.grey[200], height: 1),
        ),
      ),
      body: Column(
        children: [
          // Search and Filters
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Search Bar
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Tìm kiếm cửa hàng...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        if (_searchTerm.isNotEmpty) {
                          _searchTerm = '';
                          _loadShops(refresh: true);
                        }
                      },
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: Colors.grey[300]!),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  textInputAction: TextInputAction.search,
                  onSubmitted: (_) => _onSearchSubmit(),
                ),
                const SizedBox(height: 12),
                // Filters Row
                Row(
                  children: [
                    // Status Filter
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _filterStatus,
                        decoration: InputDecoration(
                          labelText: 'Trạng thái',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'all', child: Text('Tất cả')),
                          DropdownMenuItem(value: 'active', child: Text('Hoạt động')),
                          DropdownMenuItem(value: 'pending', child: Text('Chờ duyệt')),
                          DropdownMenuItem(value: 'suspended', child: Text('Tạm dừng')),
                        ],
                        onChanged: _onStatusChanged,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Shops Grid
          Expanded(
            child: _isLoading && _shops.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null && _shops.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                            const SizedBox(height: 16),
                            const Text(
                              'Lỗi',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _errorMessage!,
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _loadShops(refresh: true),
                              icon: const Icon(Icons.refresh),
                              label: const Text('Thử lại'),
                            ),
                          ],
                        ),
                      )
                    : _shops.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.store_mall_directory, size: 64, color: Colors.grey[400]),
                                const SizedBox(height: 16),
                                const Text(
                                  'Không tìm thấy cửa hàng nào',
                                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm',
                                  style: TextStyle(color: Colors.grey[600]),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => _loadShops(refresh: true),
                            child: GridView.builder(
                              controller: _scrollController,
                              padding: const EdgeInsets.all(16),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                                childAspectRatio: 0.75,
                              ),
                              itemCount: _shops.length + (_isLoadingMore ? 2 : 0),
                              itemBuilder: (context, index) {
                                if (index >= _shops.length) {
                                  return const Center(
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  );
                                }
                                return _buildShopCard(_shops[index]);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
