import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/shop.dart';
import '../models/shop_post.dart';
import '../services/shop_service.dart';
import '../services/api_config.dart';
import '../widgets/post_video_player.dart';
import 'create_shop_post_screen.dart';

class ShopWallScreen extends StatefulWidget {
  final int shopId;

  const ShopWallScreen({Key? key, required this.shopId}) : super(key: key);

  @override
  State<ShopWallScreen> createState() => _ShopWallScreenState();
}

class _ShopWallScreenState extends State<ShopWallScreen> {
  Shop? _shop;
  List<ShopPost> _posts = [];
  bool _isLoading = true;
  bool _isLoadingPosts = false;
  bool _isLoadingMore = false;
  String? _errorMessage;
  int _currentPage = 1;
  bool _hasMorePosts = true;

  String _filterType = 'all';
  String _filterProductType = 'all';

  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadShopData();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoadingMore && _hasMorePosts) {
        _loadMorePosts();
      }
    }
  }

  Future<void> _loadShopData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final result = await ShopService.getShop(widget.shopId);

      if (mounted) {
        setState(() {
          if (result['success'] == true) {
            _shop = result['shop'] as Shop;
          } else {
            _errorMessage = result['message'] ?? 'Failed to load shop';
          }
          _isLoading = false;
        });

        // Load posts after shop is loaded
        if (_shop != null) {
          _loadPosts();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Error: ${e.toString()}';
        });
      }
    }
  }

  Future<void> _loadPosts({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _currentPage = 1;
        _posts = [];
        _hasMorePosts = true;
      });
    }

    setState(() {
      _isLoadingPosts = true;
    });

    try {
      final result = await ShopService.getShopPosts(
        widget.shopId,
        page: _currentPage,
        perPage: 10,
        type: _filterType,
        productType: _filterProductType,
      );

      if (mounted) {
        setState(() {
          _isLoadingPosts = false;
          if (result['success'] == true) {
            final newPosts = result['posts'] as List<ShopPost>;
            if (refresh) {
              _posts = newPosts;
            } else {
              _posts.addAll(newPosts);
            }
            _hasMorePosts = newPosts.length >= 10;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingPosts = false;
        });
      }
    }
  }

  Future<void> _loadMorePosts() async {
    if (_isLoadingMore || !_hasMorePosts) return;

    setState(() {
      _isLoadingMore = true;
    });

    _currentPage++;

    try {
      final result = await ShopService.getShopPosts(
        widget.shopId,
        page: _currentPage,
        perPage: 10,
        type: _filterType,
        productType: _filterProductType,
      );

      if (mounted) {
        setState(() {
          _isLoadingMore = false;
          if (result['success'] == true) {
            final newPosts = result['posts'] as List<ShopPost>;
            _posts.addAll(newPosts);
            _hasMorePosts = newPosts.length >= 10;
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

  void _onTypeChanged(String? value) {
    if (value != null) {
      setState(() {
        _filterType = value;
      });
      _loadPosts(refresh: true);
    }
  }

  void _onProductTypeChanged(String? value) {
    if (value != null) {
      setState(() {
        _filterProductType = value;
      });
      _loadPosts(refresh: true);
    }
  }

  Widget _buildShopHeader() {
    if (_shop == null) return const SizedBox.shrink();

    return Column(
      children: [
        // Banner Image
        Stack(
          children: [
            Container(
              height: 200,
              width: double.infinity,
              color: Colors.orange[100],
              child: _shop!.banner != null && _shop!.banner!.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: ApiConfig.getImageUrl(_shop!.banner!),
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: 200,
                      placeholder: (context, url) => Container(
                        color: Colors.orange[100],
                        child: const Center(
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      ),
                      errorWidget: (context, url, error) => Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.orange[300]!, Colors.orange[600]!],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Icon(Icons.store, size: 60, color: Colors.white.withOpacity(0.5)),
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
                      child: Icon(Icons.store, size: 60, color: Colors.white.withOpacity(0.5)),
                    ),
            ),
            // Back button
            Positioned(
              top: 40,
              left: 16,
              child: CircleAvatar(
                backgroundColor: Colors.black.withOpacity(0.5),
                child: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
            ),
          ],
        ),
        // Shop Info Card
        Container(
          color: Colors.white,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Logo
                  CircleAvatar(
                    radius: 35,
                    backgroundColor: Colors.orange[200],
                    backgroundImage: _shop!.logo != null && _shop!.logo!.isNotEmpty
                        ? CachedNetworkImageProvider(ApiConfig.getImageUrl(_shop!.logo!))
                        : null,
                    child: _shop!.logo == null || _shop!.logo!.isEmpty
                        ? Text(
                            _shop!.name.isNotEmpty
                                ? _shop!.name[0].toUpperCase()
                                : 'S',
                            style: const TextStyle(
                              fontSize: 28,
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 16),
                  // Name and stats
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _shop!.name,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: _shop!.isActive ? Colors.green[100] : Colors.grey[100],
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                _shop!.isActive ? 'Hoạt động' : _shop!.status,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: _shop!.isActive ? Colors.green[800] : Colors.grey[800],
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              '${_shop!.postsCount} sản phẩm',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              // Description
              if (_shop!.description != null && _shop!.description!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  _shop!.description!,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[700],
                  ),
                ),
              ],
              // Contact info
              if (_shop!.address != null || _shop!.phone != null || _shop!.email != null) ...[
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 8),
                if (_shop!.city != null && _shop!.city!.isNotEmpty)
                  _buildInfoRow(Icons.location_on, _shop!.fullAddress),
                if (_shop!.phone != null && _shop!.phone!.isNotEmpty)
                  _buildInfoRow(Icons.phone, _shop!.phone!),
                if (_shop!.email != null && _shop!.email!.isNotEmpty)
                  _buildInfoRow(Icons.email, _shop!.email!),
                if (_shop!.website != null && _shop!.website!.isNotEmpty)
                  _buildInfoRow(Icons.language, _shop!.website!),
              ],
              // Shop images gallery
              if (_hasShopImages()) ...[
                const SizedBox(height: 16),
                _buildShopImagesGallery(),
              ],
            ],
          ),
        ),
      ],
    );
  }

  bool _hasShopImages() {
    return (_shop!.image1 != null && _shop!.image1!.isNotEmpty) ||
           (_shop!.image2 != null && _shop!.image2!.isNotEmpty) ||
           (_shop!.image3 != null && _shop!.image3!.isNotEmpty) ||
           (_shop!.image4 != null && _shop!.image4!.isNotEmpty) ||
           (_shop!.image5 != null && _shop!.image5!.isNotEmpty);
  }

  Widget _buildShopImagesGallery() {
    final images = <String>[];
    if (_shop!.image1 != null && _shop!.image1!.isNotEmpty) images.add(_shop!.image1!);
    if (_shop!.image2 != null && _shop!.image2!.isNotEmpty) images.add(_shop!.image2!);
    if (_shop!.image3 != null && _shop!.image3!.isNotEmpty) images.add(_shop!.image3!);
    if (_shop!.image4 != null && _shop!.image4!.isNotEmpty) images.add(_shop!.image4!);
    if (_shop!.image5 != null && _shop!.image5!.isNotEmpty) images.add(_shop!.image5!);

    if (images.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 80,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: images.length,
        itemBuilder: (context, index) {
          return Padding(
            padding: EdgeInsets.only(right: index < images.length - 1 ? 8 : 0),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: CachedNetworkImage(
                imageUrl: ApiConfig.getImageUrl(images[index]),
                fit: BoxFit.cover,
                width: 80,
                height: 80,
                placeholder: (context, url) => Container(
                  width: 80,
                  height: 80,
                  color: Colors.grey[200],
                  child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                ),
                errorWidget: (context, url, error) => Container(
                  width: 80,
                  height: 80,
                  color: Colors.grey[200],
                  child: const Icon(Icons.broken_image),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey[600]),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey[700],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      margin: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Sản phẩm (${_shop?.postsCount ?? 0})',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              // Type filter
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _filterType,
                  decoration: InputDecoration(
                    labelText: 'Loại',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    isDense: true,
                  ),
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('Tất cả')),
                    DropdownMenuItem(value: 'post', child: Text('Bài viết')),
                    DropdownMenuItem(value: 'page', child: Text('Trang')),
                  ],
                  onChanged: _onTypeChanged,
                ),
              ),
              const SizedBox(width: 12),
              // Product type filter
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _filterProductType,
                  decoration: InputDecoration(
                    labelText: 'Loại SP',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    isDense: true,
                  ),
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('Tất cả')),
                    DropdownMenuItem(value: 'Đơn giản', child: Text('Đơn giản')),
                    DropdownMenuItem(value: 'Biến thể', child: Text('Biến thể')),
                    DropdownMenuItem(value: 'Tải xuống', child: Text('Tải xuống')),
                  ],
                  onChanged: _onProductTypeChanged,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPostCard(ShopPost post) {
    final hasImages = post.hasImages;
    final hasVideo = post.hasVideo;

    return GestureDetector(
      onTap: () {
        // Navigate to post detail if needed
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 0, vertical: 4),
        color: Colors.white,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Author header
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  // Author avatar
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: Colors.orange[200],
                    backgroundImage: post.author?.avatar != null && post.author!.avatar!.isNotEmpty
                        ? CachedNetworkImageProvider(ApiConfig.getImageUrl(post.author!.avatar!))
                        : null,
                    child: post.author?.avatar == null || post.author!.avatar!.isEmpty
                        ? Text(
                            post.author?.displayName?.isNotEmpty == true
                                ? post.author!.displayName![0].toUpperCase()
                                : 'U',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 10),
                  // Author name and date
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          post.author?.displayName ?? 'Người dùng',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          _formatDate(post.createdAt ?? ''),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Product type badge
                  if (post.productType != null && post.productType!.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.blue[100],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        post.productType!,
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.blue[800],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  // Menu button
                  IconButton(
                    icon: const Icon(Icons.more_horiz),
                    onPressed: () {},
                  ),
                ],
              ),
            ),
            // Post title
            if (post.title.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  post.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            // Price
            if (post.price != null || post.salePrice != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  children: [
                    if (post.salePrice != null && post.salePrice!.isNotEmpty) ...[
                      Text(
                        '${_formatPrice(post.salePrice!)} VND',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.red[600],
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (post.price != null && post.price!.isNotEmpty)
                        Text(
                          '${_formatPrice(post.price!)} VND',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[500],
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                    ] else if (post.price != null && post.price!.isNotEmpty) ...[
                      Text(
                        '${_formatPrice(post.price!)} VND',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.green[700],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            // Short description
            if (post.shortDescription != null && post.shortDescription!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  post.shortDescription!,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[700],
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            // Content
            if (post.content != null && post.content!.isNotEmpty && (post.shortDescription == null || post.shortDescription!.isEmpty))
              Padding(
                padding: const EdgeInsets.all(12),
                child: Text(
                  post.content!,
                  style: const TextStyle(fontSize: 14),
                  maxLines: 5,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            const SizedBox(height: 8),
            // Video
            if (hasVideo)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: FeedVideoPlayer(
                  videoUrl: post.video!,
                  height: 250,
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            // Images (show even if video exists)
            if (hasImages) ...[
              if (hasVideo) const SizedBox(height: 12),
              _buildImagesGrid(post.allImages),
            ],
            // Stats and actions
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  // Stats row
                  Row(
                    children: [
                      if (post.likesCount > 0) ...[
                        const Icon(Icons.thumb_up, size: 14, color: Colors.blue),
                        const SizedBox(width: 4),
                        Text(
                          '${post.likesCount}',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                        const SizedBox(width: 16),
                      ],
                      if (post.commentsCount > 0) ...[
                        Text(
                          '${post.commentsCount} bình luận',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                        const SizedBox(width: 16),
                      ],
                      if (post.viewCount > 0) ...[
                        Icon(Icons.visibility, size: 14, color: Colors.grey[500]),
                        const SizedBox(width: 4),
                        Text(
                          '${post.viewCount}',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                      ],
                    ],
                  ),
                  const Divider(height: 24),
                  // Actions row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildActionButton(Icons.thumb_up_outlined, 'Thích'),
                      _buildActionButton(Icons.chat_bubble_outline, 'Bình luận'),
                      _buildActionButton(Icons.share_outlined, 'Chia sẻ'),
                      _buildActionButton(Icons.shopping_cart_outlined, 'Mua'),
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

  Widget _buildImagesGrid(List<String> images) {
    if (images.isEmpty) return const SizedBox.shrink();

    if (images.length == 1) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: CachedNetworkImage(
            imageUrl: ApiConfig.getImageUrl(images[0]),
            fit: BoxFit.cover,
            width: double.infinity,
            height: 250,
            placeholder: (context, url) => Container(
              height: 250,
              color: Colors.grey[200],
              child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
            ),
            errorWidget: (context, url, error) => Container(
              height: 250,
              color: Colors.grey[200],
              child: const Icon(Icons.broken_image, size: 40),
            ),
          ),
        ),
      );
    }

    // Multiple images - show grid
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: images.length == 2 ? 2 : 3,
          crossAxisSpacing: 4,
          mainAxisSpacing: 4,
        ),
        itemCount: images.length > 6 ? 6 : images.length,
        itemBuilder: (context, index) {
          final isLast = index == 5 && images.length > 6;
          return Stack(
            fit: StackFit.expand,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: CachedNetworkImage(
                  imageUrl: ApiConfig.getImageUrl(images[index]),
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(
                    color: Colors.grey[200],
                    child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                  ),
                  errorWidget: (context, url, error) => Container(
                    color: Colors.grey[200],
                    child: const Icon(Icons.broken_image),
                  ),
                ),
              ),
              if (isLast)
                Container(
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Center(
                    child: Text(
                      '+${images.length - 6}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildActionButton(IconData icon, String label) {
    return TextButton.icon(
      onPressed: () {},
      icon: Icon(icon, size: 20, color: Colors.grey[700]),
      label: Text(
        label,
        style: TextStyle(
          fontSize: 13,
          color: Colors.grey[700],
        ),
      ),
    );
  }

  String _formatDate(String dateStr) {
    if (dateStr.isEmpty) return '';
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 1) {
        return 'Vừa xong';
      } else if (diff.inMinutes < 60) {
        return '${diff.inMinutes} phút trước';
      } else if (diff.inHours < 24) {
        return '${diff.inHours} giờ trước';
      } else if (diff.inDays < 7) {
        return '${diff.inDays} ngày trước';
      } else {
        return '${date.day}/${date.month}/${date.year}';
      }
    } catch (e) {
      return dateStr;
    }
  }

  String _formatPrice(String price) {
    try {
      final num = double.parse(price);
      return num.toStringAsFixed(0).replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (Match m) => '${m[1]}.',
      );
    } catch (e) {
      return price;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
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
                        onPressed: _loadShopData,
                        icon: const Icon(Icons.refresh),
                        label: const Text('Thử lại'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () async {
                    await _loadShopData();
                  },
                  child: CustomScrollView(
                    controller: _scrollController,
                    slivers: [
                      // Shop Header
                      SliverToBoxAdapter(
                        child: _buildShopHeader(),
                      ),
                      // Filter Bar
                      SliverToBoxAdapter(
                        child: _buildFilterBar(),
                      ),
                      // Posts List
                      if (_isLoadingPosts && _posts.isEmpty)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.all(32),
                            child: Center(child: CircularProgressIndicator()),
                          ),
                        )
                      else if (_posts.isEmpty)
                        SliverToBoxAdapter(
                          child: Container(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              children: [
                                Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey[400]),
                                const SizedBox(height: 16),
                                const Text(
                                  'Chưa có sản phẩm nào',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Cửa hàng này chưa đăng sản phẩm nào',
                                  style: TextStyle(color: Colors.grey[600]),
                                ),
                              ],
                            ),
                          ),
                        )
                      else
                        SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              if (index >= _posts.length) {
                                return const Padding(
                                  padding: EdgeInsets.all(16),
                                  child: Center(
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ),
                                );
                              }
                              return _buildPostCard(_posts[index]);
                            },
                            childCount: _posts.length + (_isLoadingMore ? 1 : 0),
                          ),
                        ),
                      // Bottom padding
                      const SliverToBoxAdapter(
                        child: SizedBox(height: 16),
                      ),
                    ],
                  ),
                ),
      // Floating action button for creating post
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final result = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (context) => CreateShopPostScreen(
                shopId: widget.shopId,
                shopName: _shop?.name ?? 'Cửa hàng',
              ),
            ),
          );
          // Refresh posts if new post was created
          if (result == true) {
            _loadPosts(refresh: true);
          }
        },
        backgroundColor: Colors.orange,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}
