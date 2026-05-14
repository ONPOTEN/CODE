import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../models/shop.dart';
import '../models/shop_post.dart';
import '../services/shop_service.dart';
import '../services/api_config.dart';

// Attribute option for variant products
class AttributeOption {
  String value;
  String? price;
  XFile? image;

  AttributeOption({required this.value, this.price, this.image});
}

// Attribute for variant products
class ProductAttribute {
  String name;
  List<AttributeOption> options;

  ProductAttribute({required this.name, List<AttributeOption>? options})
      : options = options ?? [];
}

// Download link for download products
class DownloadLink {
  String title;
  String url;

  DownloadLink({required this.title, required this.url});
}

class ShopPostFormScreen extends StatefulWidget {
  final Shop shop;
  final ShopPost? post; // null for create, non-null for edit

  const ShopPostFormScreen({
    Key? key,
    required this.shop,
    this.post,
  }) : super(key: key);

  @override
  State<ShopPostFormScreen> createState() => _ShopPostFormScreenState();
}

class _ShopPostFormScreenState extends State<ShopPostFormScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  final ImagePicker _imagePicker = ImagePicker();

  // Form controllers
  late TextEditingController _titleController;
  late TextEditingController _slugController;
  late TextEditingController _priceController;
  late TextEditingController _salePriceController;
  late TextEditingController _shortDescriptionController;
  late TextEditingController _detailDescriptionController;
  late TextEditingController _categoriesController;

  // Form values
  late String _type;
  late String _status;
  String _productType = 'Đơn giản'; // 'Đơn giản', 'Biến thể', 'Tải xuống'

  // Image management
  XFile? _mainImage;
  String? _existingMainImage;
  List<XFile> _otherImages = [];
  List<String> _existingImageUrls = [];
  Set<String> _imagesToDelete = {};

  // Video management
  XFile? _selectedVideo;
  String? _existingVideo;
  bool _removeExistingVideo = false;

  // Variant product attributes
  List<ProductAttribute> _attributes = [];
  int? _selectedAttributeIndex;
  final TextEditingController _newAttributeNameController = TextEditingController();
  final TextEditingController _newOptionValueController = TextEditingController();
  final TextEditingController _newOptionPriceController = TextEditingController();
  XFile? _newOptionImage;

  // Download product
  PlatformFile? _downloadFile;
  List<DownloadLink> _linkFiles = [];
  final TextEditingController _newLinkTitleController = TextEditingController();
  final TextEditingController _newLinkUrlController = TextEditingController();

  bool get isEditMode => widget.post != null;

  @override
  void initState() {
    super.initState();

    // Initialize controllers
    _titleController = TextEditingController(text: widget.post?.title ?? '');
    _slugController = TextEditingController(text: widget.post?.slug ?? '');
    _priceController = TextEditingController(text: widget.post?.price ?? '');
    _salePriceController = TextEditingController(text: widget.post?.salePrice ?? '');
    _shortDescriptionController = TextEditingController(text: widget.post?.shortDescription ?? '');
    _detailDescriptionController = TextEditingController(text: widget.post?.detailDescription ?? '');
    _categoriesController = TextEditingController(text: widget.post?.categories ?? '');

    // Initialize dropdown values
    _type = widget.post?.type ?? 'post';
    _status = widget.post?.status ?? 'draft';
    _productType = widget.post?.productType ?? 'Đơn giản';

    // Initialize existing images
    if (widget.post != null) {
      _existingMainImage = widget.post!.mainImage;
      if (widget.post!.featuredImages.isNotEmpty) {
        _existingImageUrls = List.from(widget.post!.featuredImages);
      }
      if (widget.post!.otherImages.isNotEmpty) {
        _existingImageUrls.addAll(widget.post!.otherImages);
      }
      _existingVideo = widget.post!.video;
    }

    // Auto-generate slug from title
    _titleController.addListener(_generateSlug);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _slugController.dispose();
    _priceController.dispose();
    _salePriceController.dispose();
    _shortDescriptionController.dispose();
    _detailDescriptionController.dispose();
    _categoriesController.dispose();
    _newAttributeNameController.dispose();
    _newOptionValueController.dispose();
    _newOptionPriceController.dispose();
    _newLinkTitleController.dispose();
    _newLinkUrlController.dispose();
    super.dispose();
  }

  void _generateSlug() {
    if (!isEditMode && _titleController.text.isNotEmpty) {
      final slug = _titleController.text
          .toLowerCase()
          .replaceAll(RegExp(r'[^a-z0-9\s-]'), '')
          .replaceAll(RegExp(r'\s+'), '-')
          .replaceAll(RegExp(r'-+'), '-')
          .trim();
      _slugController.text = slug;
    }
  }

  // Pick main image
  Future<void> _pickMainImage() async {
    try {
      final XFile? image = await _imagePicker.pickImage(source: ImageSource.gallery);
      if (image != null) {
        setState(() {
          _mainImage = image;
        });
      }
    } catch (e) {
      _showErrorSnackBar('Lỗi chọn ảnh: ${e.toString()}');
    }
  }

  // Pick other images
  Future<void> _pickOtherImages() async {
    try {
      final List<XFile> images = await _imagePicker.pickMultiImage();
      if (images.isNotEmpty) {
        setState(() {
          _otherImages.addAll(images);
        });
      }
    } catch (e) {
      _showErrorSnackBar('Lỗi chọn ảnh: ${e.toString()}');
    }
  }

  // Pick video
  Future<void> _pickVideo() async {
    try {
      final XFile? video = await _imagePicker.pickVideo(source: ImageSource.gallery);
      if (video != null) {
        // Validate file size (max 100MB)
        final file = File(video.path);
        final sizeInMB = await file.length() / (1024 * 1024);
        if (sizeInMB > 100) {
          _showErrorSnackBar('Video không được vượt quá 100MB');
          return;
        }
        setState(() {
          _selectedVideo = video;
        });
      }
    } catch (e) {
      _showErrorSnackBar('Lỗi chọn video: ${e.toString()}');
    }
  }

  // Pick download file
  Future<void> _pickDownloadFile() async {
    try {
      final result = await FilePicker.platform.pickFiles();
      if (result != null && result.files.isNotEmpty) {
        setState(() {
          _downloadFile = result.files.first;
        });
      }
    } catch (e) {
      _showErrorSnackBar('Lỗi chọn tệp: ${e.toString()}');
    }
  }

  // Pick option image for variant
  Future<void> _pickOptionImage() async {
    try {
      final XFile? image = await _imagePicker.pickImage(source: ImageSource.gallery);
      if (image != null) {
        setState(() {
          _newOptionImage = image;
        });
      }
    } catch (e) {
      _showErrorSnackBar('Lỗi chọn ảnh: ${e.toString()}');
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.green),
    );
  }

  // Add attribute
  void _addAttribute() {
    final name = _newAttributeNameController.text.trim();
    if (name.isEmpty) {
      _showErrorSnackBar('Vui lòng nhập tên thuộc tính');
      return;
    }

    setState(() {
      _attributes.add(ProductAttribute(name: name));
      _selectedAttributeIndex = _attributes.length - 1;
      _newAttributeNameController.clear();
    });
  }

  // Add option to attribute
  void _addOption() {
    if (_selectedAttributeIndex == null) {
      _showErrorSnackBar('Vui lòng chọn thuộc tính trước');
      return;
    }

    final value = _newOptionValueController.text.trim();
    if (value.isEmpty) {
      _showErrorSnackBar('Vui lòng nhập giá trị tùy chọn');
      return;
    }

    setState(() {
      _attributes[_selectedAttributeIndex!].options.add(
        AttributeOption(
          value: value,
          price: _newOptionPriceController.text.trim().isNotEmpty
              ? _newOptionPriceController.text.trim()
              : null,
          image: _newOptionImage,
        ),
      );
      _newOptionValueController.clear();
      _newOptionPriceController.clear();
      _newOptionImage = null;
    });
  }

  // Remove attribute
  void _removeAttribute(int index) {
    setState(() {
      _attributes.removeAt(index);
      if (_selectedAttributeIndex == index) {
        _selectedAttributeIndex = null;
      } else if (_selectedAttributeIndex != null && _selectedAttributeIndex! > index) {
        _selectedAttributeIndex = _selectedAttributeIndex! - 1;
      }
    });
  }

  // Remove option
  void _removeOption(int attrIndex, int optIndex) {
    setState(() {
      _attributes[attrIndex].options.removeAt(optIndex);
    });
  }

  // Add download link
  void _addDownloadLink() {
    final title = _newLinkTitleController.text.trim();
    final url = _newLinkUrlController.text.trim();

    if (title.isEmpty || url.isEmpty) {
      _showErrorSnackBar('Vui lòng nhập cả tiêu đề và URL liên kết');
      return;
    }

    setState(() {
      _linkFiles.add(DownloadLink(title: title, url: url));
      _newLinkTitleController.clear();
      _newLinkUrlController.clear();
    });
  }

  // Remove download link
  void _removeDownloadLink(int index) {
    setState(() {
      _linkFiles.removeAt(index);
    });
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
  }

  String _formatPrice(String? priceStr) {
    if (priceStr == null || priceStr.isEmpty) return '';
    final price = double.tryParse(priceStr);
    if (price == null) return priceStr;
    return price.toStringAsFixed(0).replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        ) + ' ₫';
  }

  Future<void> _savePost() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_titleController.text.trim().isEmpty) {
      _showErrorSnackBar('Vui lòng nhập tiêu đề');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      Map<String, dynamic> result;

      if (isEditMode) {
        result = await ShopService.updateShopPost(
          postId: widget.post!.id,
          shopId: widget.shop.id,
          title: _titleController.text.trim(),
          slug: _slugController.text.trim(),
          productType: _productType,
          price: _priceController.text.trim().isNotEmpty ? _priceController.text.trim() : null,
          salePrice: _salePriceController.text.trim().isNotEmpty ? _salePriceController.text.trim() : null,
          shortDescription: _shortDescriptionController.text.trim().isNotEmpty ? _shortDescriptionController.text.trim() : null,
          detailDescription: _detailDescriptionController.text.trim().isNotEmpty ? _detailDescriptionController.text.trim() : null,
          categories: _categoriesController.text.trim().isNotEmpty ? _categoriesController.text.trim() : null,
          type: _type,
          status: _status,
        );
      } else {
        result = await ShopService.createShopPost(
          shopId: widget.shop.id,
          title: _titleController.text.trim(),
          slug: _slugController.text.trim(),
          productType: _productType,
          price: _priceController.text.trim().isNotEmpty ? _priceController.text.trim() : null,
          salePrice: _salePriceController.text.trim().isNotEmpty ? _salePriceController.text.trim() : null,
          shortDescription: _shortDescriptionController.text.trim().isNotEmpty ? _shortDescriptionController.text.trim() : null,
          detailDescription: _detailDescriptionController.text.trim().isNotEmpty ? _detailDescriptionController.text.trim() : null,
          categories: _categoriesController.text.trim().isNotEmpty ? _categoriesController.text.trim() : null,
          type: _type,
          status: _status,
        );
      }

      if (mounted && result['success'] == true) {
        final postId = result['post']?.id ?? widget.post?.id;

        // Handle image uploads
        if (postId != null) {
          final allImages = <String>[];
          if (_mainImage != null) allImages.add(_mainImage!.path);
          allImages.addAll(_otherImages.map((img) => img.path));

          if (allImages.isNotEmpty) {
            await ShopService.uploadShopPostImages(
              shopId: widget.shop.id,
              postId: postId,
              imagePaths: allImages,
            );
          }

          // Handle image deletions
          for (final imageUrl in _imagesToDelete) {
            await ShopService.deleteShopPostImage(
              shopId: widget.shop.id,
              postId: postId,
              imageUrl: imageUrl,
            );
          }
        }
      }

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        if (result['success'] == true) {
          _showSuccessSnackBar(
            result['message'] ?? (isEditMode ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm thành công'),
          );
          Navigator.of(context).pop(result['post']);
        } else {
          _showErrorSnackBar(result['message'] ?? 'Lưu sản phẩm thất bại');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showErrorSnackBar('Lỗi: ${e.toString()}');
      }
    }
  }

  Future<void> _deletePost() async {
    if (!isEditMode) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xóa sản phẩm'),
        content: const Text('Bạn có chắc muốn xóa sản phẩm này? Hành động này không thể hoàn tác.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Hủy'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final result = await ShopService.deleteShopPost(widget.shop.id, widget.post!.id);

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        if (result['success'] == true) {
          _showSuccessSnackBar(result['message'] ?? 'Đã xóa sản phẩm');
          Navigator.of(context).pop('deleted');
        } else {
          _showErrorSnackBar(result['message'] ?? 'Xóa sản phẩm thất bại');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showErrorSnackBar('Lỗi: ${e.toString()}');
      }
    }
  }

  // ==================== UI BUILDERS ====================

  Widget _buildProductTypeSelector() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Loại sản phẩm *',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          // Simple Product
          _buildProductTypeOption(
            value: 'Đơn giản',
            icon: '🛍️',
            title: 'Sản phẩm đơn giản',
            description: 'Sản phẩm tiêu chuẩn với giá cả, hình ảnh, mô tả và danh mục',
            color: Colors.blue,
          ),

          const SizedBox(height: 8),

          // Variant Product
          _buildProductTypeOption(
            value: 'Biến thể',
            icon: '🎨',
            title: 'Sản phẩm biến thể',
            description: 'Sản phẩm với thuộc tính (Kích thước, Màu sắc, Chất liệu, v.v.) và nhiều tùy chọn',
            color: Colors.purple,
          ),

          const SizedBox(height: 8),

          // Download Product
          _buildProductTypeOption(
            value: 'Tải xuống',
            icon: '📥',
            title: 'Sản phẩm tải xuống',
            description: 'Sản phẩm kỹ thuật số với tệp tải xuống và liên kết ngoài',
            color: Colors.green,
          ),
        ],
      ),
    );
  }

  Widget _buildProductTypeOption({
    required String value,
    required String icon,
    required String title,
    required String description,
    required Color color,
  }) {
    final isSelected = _productType == value;

    return InkWell(
      onTap: () {
        setState(() {
          _productType = value;
        });
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.1) : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? color : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Radio<String>(
              value: value,
              groupValue: _productType,
              onChanged: (v) {
                if (v != null) {
                  setState(() {
                    _productType = v;
                  });
                }
              },
              activeColor: color,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$icon $title',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isSelected ? color : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
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

  Widget _buildSimpleProductForm() {
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
          Row(
            children: [
              const Text('🛍️ ', style: TextStyle(fontSize: 20)),
              Text(
                'Thông tin sản phẩm đơn giản',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.blue.shade900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          _buildPriceFields(),
          const SizedBox(height: 16),
          _buildDescriptionFields(),
          const SizedBox(height: 16),
          _buildCategoriesField(),
          const SizedBox(height: 16),
          _buildImageSection(),
        ],
      ),
    );
  }

  Widget _buildVariantProductForm() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.purple.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.purple.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('🎨 ', style: TextStyle(fontSize: 20)),
              Text(
                'Thông tin sản phẩm biến thể',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.purple.shade900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          _buildPriceFields(),
          const SizedBox(height: 16),
          _buildDescriptionFields(),
          const SizedBox(height: 16),
          _buildImageSection(),
          const SizedBox(height: 24),

          // Attributes Section
          _buildAttributesSection(),
        ],
      ),
    );
  }

  Widget _buildDownloadProductForm() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.green.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.green.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('📥 ', style: TextStyle(fontSize: 20)),
              Text(
                'Thông tin sản phẩm tải xuống',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.green.shade900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Thêm mô tả sản phẩm, danh mục, tệp tải xuống và liên kết ngoài cho sản phẩm kỹ thuật số của bạn.',
            style: TextStyle(fontSize: 14, color: Colors.grey[600]),
          ),
          const SizedBox(height: 16),

          _buildPriceFields(),
          const SizedBox(height: 16),
          _buildDescriptionFields(),
          const SizedBox(height: 16),
          _buildCategoriesField(),
          const SizedBox(height: 16),
          _buildImageSection(),
          const SizedBox(height: 24),

          // Download File Section
          _buildDownloadFileSection(),
          const SizedBox(height: 16),

          // External Links Section
          _buildExternalLinksSection(),
        ],
      ),
    );
  }

  Widget _buildPriceFields() {
    return Column(
      children: [
        // Price
        TextFormField(
          controller: _priceController,
          decoration: InputDecoration(
            labelText: 'Giá',
            hintText: 'Nhập giá',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            filled: true,
            fillColor: Colors.white,
          ),
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 12),

        // Sale Price
        TextFormField(
          controller: _salePriceController,
          decoration: InputDecoration(
            labelText: 'Giá khuyến mãi (Tùy chọn)',
            hintText: 'Nhập giá khuyến mãi (để trống nếu không giảm giá)',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            filled: true,
            fillColor: Colors.white,
          ),
          keyboardType: TextInputType.number,
        ),

        // Discount percentage
        if (_priceController.text.isNotEmpty && _salePriceController.text.isNotEmpty)
          Builder(builder: (context) {
            final price = double.tryParse(_priceController.text);
            final salePrice = double.tryParse(_salePriceController.text);
            if (price != null && salePrice != null && price > 0) {
              final discount = ((price - salePrice) / price * 100).toStringAsFixed(1);
              return Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'Giảm giá: $discount%',
                  style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w500),
                ),
              );
            }
            return const SizedBox.shrink();
          }),
      ],
    );
  }

  Widget _buildDescriptionFields() {
    return Column(
      children: [
        // Short Description
        TextFormField(
          controller: _shortDescriptionController,
          decoration: InputDecoration(
            labelText: 'Mô tả ngắn',
            hintText: 'Tóm tắt ngắn gọn về sản phẩm',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            filled: true,
            fillColor: Colors.white,
            counterText: '${_shortDescriptionController.text.length}/255',
          ),
          maxLength: 255,
          onChanged: (v) => setState(() {}),
        ),
        const SizedBox(height: 12),

        // Detail Description
        TextFormField(
          controller: _detailDescriptionController,
          decoration: InputDecoration(
            labelText: 'Mô tả chi tiết',
            hintText: 'Thông tin chi tiết về sản phẩm',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            filled: true,
            fillColor: Colors.white,
          ),
          maxLines: 5,
        ),
      ],
    );
  }

  Widget _buildCategoriesField() {
    return TextFormField(
      controller: _categoriesController,
      decoration: InputDecoration(
        labelText: 'Danh mục (phân cách bằng dấu phẩy)',
        hintText: 'Ví dụ: Điện tử, Thiết bị, Công nghệ',
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        filled: true,
        fillColor: Colors.white,
      ),
    );
  }

  String _getFullImageUrl(String imageUrl) {
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    return '${ApiConfig.baseUrl}/storage/$imageUrl';
  }

  Widget _buildImageSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Hình ảnh sản phẩm chính',
          style: TextStyle(fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),

        // Main image - new image takes priority
        if (_mainImage != null)
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.file(
                  File(_mainImage!.path),
                  height: 150,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: () => setState(() => _mainImage = null),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close, color: Colors.white, size: 16),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text('Ảnh mới', style: TextStyle(color: Colors.white, fontSize: 10)),
                ),
              ),
            ],
          )
        // Existing main image from server
        else if (_existingMainImage != null && _existingMainImage!.isNotEmpty)
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  _getFullImageUrl(_existingMainImage!),
                  height: 150,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    height: 150,
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Center(child: Icon(Icons.broken_image, size: 40, color: Colors.grey)),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: () => setState(() {
                    _imagesToDelete.add(_existingMainImage!);
                    _existingMainImage = null;
                  }),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close, color: Colors.white, size: 16),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.blue,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text('Ảnh hiện tại', style: TextStyle(color: Colors.white, fontSize: 10)),
                ),
              ),
              Positioned(
                bottom: 8,
                right: 8,
                child: GestureDetector(
                  onTap: _pickMainImage,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('Thay đổi', style: TextStyle(color: Colors.blue, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ],
          )
        else
          InkWell(
            onTap: _pickMainImage,
            child: Container(
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.cloud_upload, size: 40, color: Colors.grey[400]),
                    const SizedBox(height: 8),
                    const Text('Tải lên hình ảnh chính', style: TextStyle(color: Colors.blue)),
                    Text('PNG, JPG, GIF tối đa 5MB', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                  ],
                ),
              ),
            ),
          ),

        const SizedBox(height: 16),
        const Text('Hình ảnh bổ sung', style: TextStyle(fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),

        // Existing images from server
        if (_existingImageUrls.isNotEmpty) ...[
          const Text('Ảnh hiện tại:', style: TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 8),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: _existingImageUrls.length,
            itemBuilder: (context, index) {
              final imageUrl = _existingImageUrls[index];
              final isMarkedForDeletion = _imagesToDelete.contains(imageUrl);
              return Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Opacity(
                      opacity: isMarkedForDeletion ? 0.4 : 1.0,
                      child: Image.network(
                        _getFullImageUrl(imageUrl),
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          color: Colors.grey[200],
                          child: const Icon(Icons.broken_image, color: Colors.grey),
                        ),
                      ),
                    ),
                  ),
                  if (isMarkedForDeletion)
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.3),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Center(
                          child: Icon(Icons.delete_forever, color: Colors.red, size: 32),
                        ),
                      ),
                    ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          if (isMarkedForDeletion) {
                            _imagesToDelete.remove(imageUrl);
                          } else {
                            _imagesToDelete.add(imageUrl);
                          }
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: isMarkedForDeletion ? Colors.green : Colors.red,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          isMarkedForDeletion ? Icons.undo : Icons.close,
                          color: Colors.white,
                          size: 14,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
          if (_imagesToDelete.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                '${_imagesToDelete.length} ảnh sẽ bị xóa khi lưu',
                style: const TextStyle(fontSize: 12, color: Colors.red, fontStyle: FontStyle.italic),
              ),
            ),
          const SizedBox(height: 12),
        ],

        // New images to upload
        if (_otherImages.isNotEmpty) ...[
          const Text('Ảnh mới:', style: TextStyle(fontSize: 12, color: Colors.green)),
          const SizedBox(height: 8),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: _otherImages.length,
            itemBuilder: (context, index) {
              return Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(File(_otherImages[index].path), fit: BoxFit.cover),
                  ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: GestureDetector(
                      onTap: () => setState(() => _otherImages.removeAt(index)),
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                        child: const Icon(Icons.close, color: Colors.white, size: 14),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 4,
                    left: 4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.green,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('Mới', style: TextStyle(color: Colors.white, fontSize: 8)),
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 8),
        ],

        InkWell(
          onTap: _pickOtherImages,
          child: Container(
            height: 80,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_photo_alternate, color: Colors.grey[400]),
                  const Text('Nhấp hoặc kéo để thêm hình ảnh', style: TextStyle(fontSize: 12, color: Colors.blue)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAttributesSection() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.purple.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '📋 Thuộc tính sản phẩm (Biến thể)',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.purple.shade900),
          ),
          const SizedBox(height: 4),
          Text(
            'Thêm thuộc tính như Kích thước, Màu sắc, v.v. Mỗi tùy chọn có thể có hình ảnh và giá riêng.',
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
          ),
          const SizedBox(height: 16),

          // Add Attribute
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _newAttributeNameController,
                  decoration: InputDecoration(
                    hintText: 'Tên thuộc tính (ví dụ: Kích thước, Màu sắc)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _addAttribute,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.purple,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
                child: const Text('Thêm'),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Existing Attributes
          if (_attributes.isNotEmpty) ...[
            ..._attributes.asMap().entries.map((entry) {
              final index = entry.key;
              final attr = entry.value;
              final isSelected = _selectedAttributeIndex == index;

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.purple.shade100 : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected ? Colors.purple : Colors.grey.shade300,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Attribute header
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => setState(() => _selectedAttributeIndex = index),
                            child: Text(
                              '${attr.name} (${attr.options.length} tùy chọn)',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: isSelected ? Colors.purple.shade900 : Colors.black87,
                              ),
                            ),
                          ),
                        ),
                        TextButton(
                          onPressed: () => _removeAttribute(index),
                          style: TextButton.styleFrom(foregroundColor: Colors.red),
                          child: const Text('Xóa'),
                        ),
                      ],
                    ),

                    // Options for selected attribute
                    if (isSelected) ...[
                      const Divider(),
                      const Text('Thêm tùy chọn với hình ảnh & giá:', style: TextStyle(fontWeight: FontWeight.w500)),
                      const SizedBox(height: 8),

                      // Option value
                      TextField(
                        controller: _newOptionValueController,
                        decoration: InputDecoration(
                          labelText: 'Giá trị tùy chọn *',
                          hintText: 'Ví dụ: Lớn, Đỏ, Cotton...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Option price
                      TextField(
                        controller: _newOptionPriceController,
                        decoration: InputDecoration(
                          labelText: 'Giá cho tùy chọn này (Tùy chọn)',
                          hintText: 'Để trống để sử dụng giá gốc',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 8),

                      // Option image
                      Row(
                        children: [
                          if (_newOptionImage != null)
                            Stack(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.file(
                                    File(_newOptionImage!.path),
                                    width: 60,
                                    height: 60,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                Positioned(
                                  top: -4,
                                  right: -4,
                                  child: GestureDetector(
                                    onTap: () => setState(() => _newOptionImage = null),
                                    child: Container(
                                      padding: const EdgeInsets.all(2),
                                      decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                      child: const Icon(Icons.close, color: Colors.white, size: 12),
                                    ),
                                  ),
                                ),
                              ],
                            )
                          else
                            InkWell(
                              onTap: _pickOptionImage,
                              child: Container(
                                width: 60,
                                height: 60,
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.grey, style: BorderStyle.solid),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.add_photo_alternate, color: Colors.grey),
                              ),
                            ),
                          const SizedBox(width: 8),
                          const Text('Hình ảnh cho tùy chọn (Tùy chọn)', style: TextStyle(fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 12),

                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _addOption,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('+ Thêm tùy chọn'),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Display options
                      if (attr.options.isNotEmpty) ...[
                        const Text('Tùy chọn:', style: TextStyle(fontWeight: FontWeight.w500)),
                        const SizedBox(height: 8),
                        ...attr.options.asMap().entries.map((optEntry) {
                          final optIndex = optEntry.key;
                          final opt = optEntry.value;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey.shade300),
                            ),
                            child: Row(
                              children: [
                                if (opt.image != null)
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Image.file(
                                      File(opt.image!.path),
                                      width: 50,
                                      height: 50,
                                      fit: BoxFit.cover,
                                    ),
                                  )
                                else
                                  Container(
                                    width: 50,
                                    height: 50,
                                    decoration: BoxDecoration(
                                      color: Colors.grey.shade200,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(Icons.image, color: Colors.grey),
                                  ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(opt.value, style: const TextStyle(fontWeight: FontWeight.bold)),
                                      if (opt.price != null)
                                        Text(
                                          _formatPrice(opt.price),
                                          style: const TextStyle(color: Colors.green, fontSize: 12),
                                        ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete, color: Colors.red),
                                  onPressed: () => _removeOption(index, optIndex),
                                ),
                              ],
                            ),
                          );
                        }),
                      ],
                    ],

                    // Options summary for non-selected
                    if (!isSelected && attr.options.isNotEmpty)
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: attr.options.map((opt) {
                          return Chip(
                            label: Text(opt.value, style: const TextStyle(fontSize: 12)),
                            backgroundColor: Colors.purple.shade100,
                          );
                        }).toList(),
                      ),
                  ],
                ),
              );
            }),
          ] else ...[
            // Empty state
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
              ),
              child: Column(
                children: [
                  Icon(Icons.inventory_2_outlined, size: 48, color: Colors.grey[400]),
                  const SizedBox(height: 8),
                  const Text('Chưa có thuộc tính nào'),
                  Text(
                    'Thêm thuộc tính như Kích thước, Màu sắc, Chất liệu để tạo biến thể sản phẩm.',
                    style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],

          // Summary
          if (_attributes.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.purple.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Tổng số thuộc tính: ${_attributes.length}'),
                  Text('Tổng số tùy chọn: ${_attributes.fold<int>(0, (sum, attr) => sum + attr.options.length)}'),
                  Text('Tùy chọn có hình ảnh: ${_attributes.fold<int>(0, (sum, attr) => sum + attr.options.where((o) => o.image != null).length)}'),
                  Text('Tùy chọn có giá riêng: ${_attributes.fold<int>(0, (sum, attr) => sum + attr.options.where((o) => o.price != null).length)}'),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDownloadFileSection() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.green.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('📁 Tệp tải xuống', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          if (_downloadFile == null)
            InkWell(
              onTap: _pickDownloadFile,
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.green.shade300, style: BorderStyle.solid),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    Icon(Icons.cloud_upload, size: 40, color: Colors.green[600]),
                    const SizedBox(height: 8),
                    const Text('Tải lên tệp', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('Nhấp để chọn hoặc kéo và thả', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                    const SizedBox(height: 4),
                    Text('Hỗ trợ: Mọi loại tệp (zip, pdf, exe, v.v.)', style: TextStyle(fontSize: 11, color: Colors.grey[400])),
                  ],
                ),
              ),
            )
          else
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.insert_drive_file, color: Colors.green[600]),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_downloadFile!.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        Text('Kích thước: ${_formatFileSize(_downloadFile!.size)}', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: () => setState(() => _downloadFile = null),
                    style: TextButton.styleFrom(foregroundColor: Colors.red),
                    child: const Text('Xóa'),
                  ),
                ],
              ),
            ),

          if (_downloadFile == null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Chưa chọn tệp nào.', style: TextStyle(fontSize: 12, color: Colors.grey[500], fontStyle: FontStyle.italic)),
            ),
        ],
      ),
    );
  }

  Widget _buildExternalLinksSection() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.green.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('🔗 Liên kết ngoài', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          // Add link form
          TextField(
            controller: _newLinkTitleController,
            decoration: InputDecoration(
              labelText: 'Tiêu đề liên kết',
              hintText: 'Ví dụ: Demo trực tiếp',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _newLinkUrlController,
            decoration: InputDecoration(
              labelText: 'URL liên kết',
              hintText: 'https://...',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            keyboardType: TextInputType.url,
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: _addDownloadLink,
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.green,
                side: BorderSide(color: Colors.green.shade300),
              ),
              child: const Text('+ Thêm liên kết ngoài'),
            ),
          ),

          // Links list
          if (_linkFiles.isNotEmpty) ...[
            const SizedBox(height: 12),
            ..._linkFiles.asMap().entries.map((entry) {
              final index = entry.key;
              final link = entry.value;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(link.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                          Text(link.url, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => _removeDownloadLink(index),
                      style: TextButton.styleFrom(foregroundColor: Colors.red),
                      child: const Text('Xóa'),
                    ),
                  ],
                ),
              );
            }),
          ] else ...[
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Chưa thêm liên kết nào.', style: TextStyle(fontSize: 12, color: Colors.grey[500], fontStyle: FontStyle.italic)),
            ),
          ],

          // Summary
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.green.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '📊 Tổng kết: ${_downloadFile != null ? '1 tệp (${_formatFileSize(_downloadFile!.size)})' : '0 tệp'} + ${_linkFiles.length} liên kết',
              style: TextStyle(fontSize: 12, color: Colors.green.shade900),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPostInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.grey[600]),
          const SizedBox(width: 8),
          Text(
            '$label: ',
            style: TextStyle(color: Colors.grey[600], fontSize: 14),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDateTime(String dateTimeStr) {
    try {
      final dateTime = DateTime.parse(dateTimeStr);
      return '${dateTime.day.toString().padLeft(2, '0')}/${dateTime.month.toString().padLeft(2, '0')}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateTimeStr;
    }
  }

  Widget _buildVideoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Video (MP4, tối đa 100MB)', style: TextStyle(fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),

        // New video takes priority
        if (_selectedVideo != null)
          Stack(
            children: [
              Container(
                height: 150,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.videocam, color: Colors.white, size: 40),
                      const SizedBox(height: 8),
                      Text(
                        _selectedVideo!.name,
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: () => setState(() => _selectedVideo = null),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                    child: const Icon(Icons.close, color: Colors.white, size: 16),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text('Video mới', style: TextStyle(color: Colors.white, fontSize: 10)),
                ),
              ),
            ],
          )
        // Existing video from server
        else if (_existingVideo != null && _existingVideo!.isNotEmpty && !_removeExistingVideo)
          Stack(
            children: [
              Container(
                height: 150,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.black87,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.play_circle_filled, color: Colors.white, size: 50),
                      const SizedBox(height: 8),
                      const Text(
                        'Video hiện tại',
                        style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _existingVideo!.split('/').last,
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: () => setState(() => _removeExistingVideo = true),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                    child: const Icon(Icons.close, color: Colors.white, size: 16),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.blue,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text('Hiện tại', style: TextStyle(color: Colors.white, fontSize: 10)),
                ),
              ),
              Positioned(
                bottom: 8,
                right: 8,
                child: GestureDetector(
                  onTap: _pickVideo,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('Thay đổi', style: TextStyle(color: Colors.blue, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ],
          )
        else
          Column(
            children: [
              if (_removeExistingVideo && _existingVideo != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning, color: Colors.red, size: 20),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Video hiện tại sẽ bị xóa khi lưu',
                          style: TextStyle(color: Colors.red, fontSize: 12),
                        ),
                      ),
                      TextButton(
                        onPressed: () => setState(() => _removeExistingVideo = false),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('Hoàn tác', style: TextStyle(fontSize: 12)),
                      ),
                    ],
                  ),
                ),
              InkWell(
                onTap: _pickVideo,
                child: Container(
                  height: 100,
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('🎬', style: TextStyle(fontSize: 28)),
                        const SizedBox(height: 4),
                        const Text('Nhấn để tải video', style: TextStyle(fontWeight: FontWeight.w500)),
                        Text('MP4 (tối đa 100MB)', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditMode ? 'Sửa sản phẩm' : 'Tạo bài viết/Trang mới'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          if (isEditMode && !_isLoading)
            IconButton(
              icon: const Icon(Icons.delete),
              onPressed: _deletePost,
              tooltip: 'Xóa',
            ),
          if (!_isLoading)
            IconButton(
              icon: const Icon(Icons.check),
              onPressed: _savePost,
              tooltip: 'Lưu',
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Shop Info Card
                    Card(
                      color: Colors.blue[50],
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          children: [
                            const Icon(Icons.store, color: Colors.blue),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Cửa hàng', style: TextStyle(fontSize: 12, color: Colors.grey)),
                                  Text(widget.shop.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Title
                    TextFormField(
                      controller: _titleController,
                      decoration: InputDecoration(
                        labelText: 'Tiêu đề *',
                        hintText: 'Nhập tiêu đề',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        filled: true,
                        fillColor: Colors.grey[50],
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Tiêu đề là bắt buộc';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Product Type Selector
                    _buildProductTypeSelector(),
                    const SizedBox(height: 24),

                    // Product Type Specific Form
                    if (_productType == 'Đơn giản') _buildSimpleProductForm(),
                    if (_productType == 'Biến thể') _buildVariantProductForm(),
                    if (_productType == 'Tải xuống') _buildDownloadProductForm(),

                    const SizedBox(height: 24),

                    // Type dropdown
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey[300]!),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Loại *', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              isExpanded: true,
                              value: _type,
                              items: const [
                                DropdownMenuItem(value: 'post', child: Text('Bài viết')),
                                DropdownMenuItem(value: 'page', child: Text('Trang')),
                              ],
                              onChanged: (v) {
                                if (v != null) setState(() => _type = v);
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Status dropdown
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey[300]!),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Trạng thái *', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              isExpanded: true,
                              value: _status,
                              items: const [
                                DropdownMenuItem(value: 'draft', child: Text('Bản nháp')),
                                DropdownMenuItem(value: 'published', child: Text('Đã xuất bản')),
                              ],
                              onChanged: (v) {
                                if (v != null) setState(() => _status = v);
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Video Upload
                    _buildVideoSection(),
                    const SizedBox(height: 24),

                    // Post Info for Edit Mode
                    if (isEditMode && widget.post != null) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey[300]!),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Thông tin bài viết',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 12),
                            _buildPostInfoRow(Icons.visibility, 'Lượt xem', widget.post!.viewCount.toString()),
                            _buildPostInfoRow(Icons.thumb_up, 'Lượt thích', widget.post!.likesCount.toString()),
                            _buildPostInfoRow(Icons.comment, 'Bình luận', widget.post!.commentsCount.toString()),
                            if (widget.post!.createdAt != null)
                              _buildPostInfoRow(Icons.calendar_today, 'Ngày tạo', _formatDateTime(widget.post!.createdAt!)),
                            if (widget.post!.updatedAt != null)
                              _buildPostInfoRow(Icons.update, 'Cập nhật lần cuối', _formatDateTime(widget.post!.updatedAt!)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _savePost,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)),
                              )
                            : Text(
                                isEditMode ? 'Cập nhật' : 'Tạo',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Cancel Button
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Hủy'),
                      ),
                    ),

                    if (isEditMode) ...[
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _isLoading ? null : _deletePost,
                          icon: const Icon(Icons.delete),
                          label: const Text('Xóa sản phẩm'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                            side: const BorderSide(color: Colors.red),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }
}
