import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';
import '../models/shop_post.dart';
import '../services/shop_service.dart';

class CreateShopPostScreen extends StatefulWidget {
  final int shopId;
  final String shopName;

  const CreateShopPostScreen({
    Key? key,
    required this.shopId,
    required this.shopName,
  }) : super(key: key);

  @override
  State<CreateShopPostScreen> createState() => _CreateShopPostScreenState();
}

class _CreateShopPostScreenState extends State<CreateShopPostScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  final _priceController = TextEditingController();
  final _salePriceController = TextEditingController();
  final _shortDescriptionController = TextEditingController();
  final _categoriesController = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  String _selectedStatus = ShopPost.statusPublished;
  String _selectedType = ShopPost.typePost;
  String _selectedProductType = ShopPost.productTypeSimple;
  List<File> _selectedImages = [];
  File? _selectedVideo;
  VideoPlayerController? _videoController;
  bool _isLoading = false;
  bool _isUploading = false;
  double _uploadProgress = 0.0;
  String? _errorMessage;
  Map<String, String>? _validationErrors;

  // Max video size: 100MB
  static const int _maxVideoSize = 100 * 1024 * 1024;
  // Max images: 10
  static const int _maxImages = 10;

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    _priceController.dispose();
    _salePriceController.dispose();
    _shortDescriptionController.dispose();
    _categoriesController.dispose();
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    try {
      final List<XFile> images = await _picker.pickMultiImage();

      if (images.isEmpty) return;

      if (images.length + _selectedImages.length > _maxImages) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Tối đa $_maxImages ảnh'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      setState(() {
        _selectedImages.addAll(images.map((xfile) => File(xfile.path)));
      });
    } catch (e) {
      print('Error picking images: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi khi chọn ảnh: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _pickImageFromCamera() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.camera);

      if (image == null) return;

      if (_selectedImages.length >= _maxImages) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Tối đa $_maxImages ảnh'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      setState(() {
        _selectedImages.add(File(image.path));
      });
    } catch (e) {
      print('Error picking image from camera: $e');
    }
  }

  void _removeImage(int index) {
    setState(() {
      _selectedImages.removeAt(index);
    });
  }

  Future<void> _pickVideo() async {
    try {
      final XFile? video = await _picker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(minutes: 10),
      );

      if (video == null) return;

      final file = File(video.path);
      final fileSize = await file.length();

      // Check file size
      if (fileSize > _maxVideoSize) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Video không được vượt quá 100MB'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      // Check file extension
      final extension = video.path.toLowerCase().split('.').last;
      if (!['mp4', 'mov', 'avi', 'mkv', 'webm'].contains(extension)) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Chỉ hỗ trợ file video MP4, MOV, AVI, MKV, WEBM'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      // Dispose old video controller
      await _videoController?.dispose();

      // Initialize new video controller
      final controller = VideoPlayerController.file(file);
      await controller.initialize();

      setState(() {
        _selectedVideo = file;
        _videoController = controller;
        _errorMessage = null;
      });
    } catch (e) {
      print('Error picking video: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi khi chọn video: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _pickVideoFromCamera() async {
    try {
      final XFile? video = await _picker.pickVideo(
        source: ImageSource.camera,
        maxDuration: const Duration(minutes: 5),
      );

      if (video == null) return;

      final file = File(video.path);
      final fileSize = await file.length();

      if (fileSize > _maxVideoSize) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Video không được vượt quá 100MB'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      await _videoController?.dispose();

      final controller = VideoPlayerController.file(file);
      await controller.initialize();

      setState(() {
        _selectedVideo = file;
        _videoController = controller;
        _errorMessage = null;
      });
    } catch (e) {
      print('Error recording video: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi khi quay video: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _removeVideo() async {
    await _videoController?.dispose();
    setState(() {
      _selectedVideo = null;
      _videoController = null;
    });
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  Future<void> _submitPost() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // Validate title is required
    if (_titleController.text.trim().isEmpty) {
      setState(() {
        _errorMessage = 'Vui lòng nhập tiêu đề sản phẩm';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _isUploading = true;
      _uploadProgress = 0.0;
      _errorMessage = null;
      _validationErrors = null;
    });

    try {
      final result = await ShopService.createShopPostWithMedia(
        shopId: widget.shopId,
        title: _titleController.text.trim(),
        content: _contentController.text.trim().isEmpty
            ? null
            : _contentController.text.trim(),
        type: _selectedType,
        status: _selectedStatus,
        productType: _selectedProductType,
        price: _priceController.text.trim().isEmpty
            ? null
            : _priceController.text.trim(),
        salePrice: _salePriceController.text.trim().isEmpty
            ? null
            : _salePriceController.text.trim(),
        shortDescription: _shortDescriptionController.text.trim().isEmpty
            ? null
            : _shortDescriptionController.text.trim(),
        categories: _categoriesController.text.trim().isEmpty
            ? null
            : _categoriesController.text.trim(),
        images: _selectedImages.isEmpty ? null : _selectedImages,
        video: _selectedVideo,
      );

      if (mounted) {
        if (result['success'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Đăng sản phẩm thành công'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.of(context).pop(true); // Return true to indicate success
        } else {
          setState(() {
            _errorMessage = result['message'] ?? 'Đăng sản phẩm thất bại';
            if (result['errors'] != null) {
              _validationErrors = Map<String, String>.from(
                (result['errors'] as Map).map(
                  (key, value) => MapEntry(
                    key.toString(),
                    value is List ? value.first.toString() : value.toString(),
                  ),
                ),
              );
            }
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Lỗi: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isUploading = false;
        });
      }
    }
  }

  String? _getFieldError(String field) {
    return _validationErrors?[field];
  }

  void _showMediaPickerBottomSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Thêm media',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildMediaOption(
                      icon: Icons.photo_library,
                      label: 'Thư viện ảnh',
                      color: Colors.blue,
                      onTap: () {
                        Navigator.pop(context);
                        _pickImages();
                      },
                    ),
                    _buildMediaOption(
                      icon: Icons.camera_alt,
                      label: 'Chụp ảnh',
                      color: Colors.green,
                      onTap: () {
                        Navigator.pop(context);
                        _pickImageFromCamera();
                      },
                    ),
                    _buildMediaOption(
                      icon: Icons.video_library,
                      label: 'Thư viện video',
                      color: Colors.purple,
                      onTap: _selectedVideo != null
                          ? null
                          : () {
                              Navigator.pop(context);
                              _pickVideo();
                            },
                    ),
                    _buildMediaOption(
                      icon: Icons.videocam,
                      label: 'Quay video',
                      color: Colors.orange,
                      onTap: _selectedVideo != null
                          ? null
                          : () {
                              Navigator.pop(context);
                              _pickVideoFromCamera();
                            },
                    ),
                  ],
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMediaOption({
    required IconData icon,
    required String label,
    required Color color,
    VoidCallback? onTap,
  }) {
    final isDisabled = onTap == null;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Opacity(
        opacity: isDisabled ? 0.5 : 1.0,
        child: Container(
          width: 80,
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[700],
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVideoPreview() {
    if (_selectedVideo == null || _videoController == null) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(top: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          children: [
            // Video Player
            AspectRatio(
              aspectRatio: _videoController!.value.aspectRatio > 0
                  ? _videoController!.value.aspectRatio
                  : 16 / 9,
              child: VideoPlayer(_videoController!),
            ),
            // Play/Pause overlay
            Positioned.fill(
              child: GestureDetector(
                onTap: () {
                  setState(() {
                    if (_videoController!.value.isPlaying) {
                      _videoController!.pause();
                    } else {
                      _videoController!.play();
                    }
                  });
                },
                child: Container(
                  color: Colors.transparent,
                  child: Center(
                    child: AnimatedOpacity(
                      opacity: _videoController!.value.isPlaying ? 0 : 1,
                      duration: const Duration(milliseconds: 200),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.5),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.play_arrow,
                          color: Colors.white,
                          size: 40,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            // Remove button
            Positioned(
              top: 8,
              right: 8,
              child: InkWell(
                onTap: _isLoading ? null : _removeVideo,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.7),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.close,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ),
            ),
            // Video badge
            Positioned(
              top: 8,
              left: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.videocam, color: Colors.white, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      _formatDuration(_videoController!.value.duration),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // File info
            Positioned(
              bottom: 8,
              left: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: FutureBuilder<int>(
                  future: _selectedVideo!.length(),
                  builder: (context, snapshot) {
                    final size = snapshot.data ?? 0;
                    final fileName = _selectedVideo!.path.split('/').last;
                    return Text(
                      '$fileName (${_formatFileSize(size)})',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                      ),
                      overflow: TextOverflow.ellipsis,
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImagesPreview() {
    if (_selectedImages.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(top: 12),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: _selectedImages.length == 1 ? 1 : (_selectedImages.length == 2 ? 2 : 3),
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
          childAspectRatio: _selectedImages.length == 1 ? 16 / 9 : 1,
        ),
        itemCount: _selectedImages.length,
        itemBuilder: (context, index) {
          return Stack(
            fit: StackFit.expand,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.file(
                  _selectedImages[index],
                  fit: BoxFit.cover,
                ),
              ),
              // Remove button
              Positioned(
                top: 4,
                right: 4,
                child: InkWell(
                  onTap: _isLoading ? null : () => _removeImage(index),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.7),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                ),
              ),
              // Index badge
              Positioned(
                bottom: 4,
                left: 4,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.7),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '${index + 1}/${_selectedImages.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tạo sản phẩm',
              style: TextStyle(fontSize: 18),
            ),
            Text(
              widget.shopName,
              style: TextStyle(
                fontSize: 12,
                color: Colors.white.withOpacity(0.8),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _submitPost,
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Text(
                    'Đăng',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Upload progress indicator
          if (_isUploading)
            LinearProgressIndicator(
              value: _uploadProgress > 0 ? _uploadProgress : null,
              backgroundColor: Colors.grey[200],
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.orange),
            ),

          Expanded(
            child: SingleChildScrollView(
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Error message
                    if (_errorMessage != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.red[50],
                          border: Border.all(color: Colors.red[300]!),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.error_outline, color: Colors.red[700]),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: TextStyle(color: Colors.red[700]),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              onPressed: () {
                                setState(() {
                                  _errorMessage = null;
                                });
                              },
                            ),
                          ],
                        ),
                      ),

                    // Main content area
                    Container(
                      color: Colors.white,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Title field
                          TextFormField(
                            controller: _titleController,
                            decoration: InputDecoration(
                              hintText: 'Tên sản phẩm *',
                              border: InputBorder.none,
                              errorText: _getFieldError('title'),
                              hintStyle: TextStyle(
                                color: Colors.grey[500],
                                fontSize: 18,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w500,
                            ),
                            enabled: !_isLoading,
                            maxLines: 1,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Vui lòng nhập tên sản phẩm';
                              }
                              return null;
                            },
                          ),

                          const Divider(height: 1),

                          // Short description field
                          TextFormField(
                            controller: _shortDescriptionController,
                            decoration: InputDecoration(
                              hintText: 'Mô tả ngắn',
                              border: InputBorder.none,
                              errorText: _getFieldError('short_description'),
                              hintStyle: TextStyle(
                                color: Colors.grey[500],
                                fontSize: 14,
                              ),
                            ),
                            style: const TextStyle(fontSize: 14),
                            maxLines: 2,
                            enabled: !_isLoading,
                          ),

                          const Divider(height: 1),

                          // Content field
                          TextFormField(
                            controller: _contentController,
                            decoration: InputDecoration(
                              hintText: 'Mô tả chi tiết sản phẩm',
                              border: InputBorder.none,
                              errorText: _getFieldError('content'),
                              hintStyle: TextStyle(
                                color: Colors.grey[500],
                                fontSize: 14,
                              ),
                            ),
                            style: const TextStyle(fontSize: 14),
                            maxLines: null,
                            minLines: 3,
                            enabled: !_isLoading,
                            keyboardType: TextInputType.multiline,
                          ),

                          // Images preview
                          _buildImagesPreview(),

                          // Video preview
                          _buildVideoPreview(),
                        ],
                      ),
                    ),

                    const SizedBox(height: 8),

                    // Price section
                    Container(
                      color: Colors.white,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Giá sản phẩm',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _priceController,
                                  decoration: InputDecoration(
                                    labelText: 'Giá gốc',
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                    suffixText: 'VND',
                                  ),
                                  keyboardType: TextInputType.number,
                                  enabled: !_isLoading,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: TextFormField(
                                  controller: _salePriceController,
                                  decoration: InputDecoration(
                                    labelText: 'Giá khuyến mãi',
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                    suffixText: 'VND',
                                  ),
                                  keyboardType: TextInputType.number,
                                  enabled: !_isLoading,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 8),

                    // Categories
                    Container(
                      color: Colors.white,
                      padding: const EdgeInsets.all(16),
                      child: TextFormField(
                        controller: _categoriesController,
                        decoration: InputDecoration(
                          labelText: 'Danh mục',
                          hintText: 'VD: Điện tử, Thời trang',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                        ),
                        enabled: !_isLoading,
                      ),
                    ),

                    const SizedBox(height: 8),

                    // Media counts info
                    if (_selectedImages.isNotEmpty || _selectedVideo != null)
                      Container(
                        color: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          children: [
                            if (_selectedImages.isNotEmpty) ...[
                              Icon(Icons.photo, size: 18, color: Colors.blue[600]),
                              const SizedBox(width: 4),
                              Text(
                                '${_selectedImages.length}/$_maxImages ảnh',
                                style: TextStyle(
                                  color: Colors.grey[700],
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(width: 16),
                            ],
                            if (_selectedVideo != null) ...[
                              Icon(Icons.videocam, size: 18, color: Colors.purple[600]),
                              const SizedBox(width: 4),
                              Text(
                                '1 video',
                                style: TextStyle(
                                  color: Colors.grey[700],
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),

                    const SizedBox(height: 8),

                    // Type and Status selectors
                    Container(
                      color: Colors.white,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          // Product type
                          Row(
                            children: [
                              Text(
                                'Loại sản phẩm:',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[700],
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: DropdownButtonFormField<String>(
                                  value: _selectedProductType,
                                  decoration: InputDecoration(
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                  ),
                                  items: const [
                                    DropdownMenuItem(
                                      value: ShopPost.productTypeSimple,
                                      child: Text('Đơn giản'),
                                    ),
                                    DropdownMenuItem(
                                      value: ShopPost.productTypeVariant,
                                      child: Text('Biến thể'),
                                    ),
                                    DropdownMenuItem(
                                      value: ShopPost.productTypeDownload,
                                      child: Text('Tải xuống'),
                                    ),
                                  ],
                                  onChanged: _isLoading
                                      ? null
                                      : (value) {
                                          if (value != null) {
                                            setState(() => _selectedProductType = value);
                                          }
                                        },
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          // Status selector
                          Row(
                            children: [
                              Text(
                                'Trạng thái:',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[700],
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: DropdownButtonFormField<String>(
                                  value: _selectedStatus,
                                  decoration: InputDecoration(
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                  ),
                                  items: const [
                                    DropdownMenuItem(
                                      value: ShopPost.statusPublished,
                                      child: Text('Công khai'),
                                    ),
                                    DropdownMenuItem(
                                      value: ShopPost.statusDraft,
                                      child: Text('Bản nháp'),
                                    ),
                                  ],
                                  onChanged: _isLoading
                                      ? null
                                      : (value) {
                                          if (value != null) {
                                            setState(() => _selectedStatus = value);
                                          }
                                        },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 100), // Bottom padding for FAB
                  ],
                ),
              ),
            ),
          ),
        ],
      ),

      // Floating action button for adding media
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isLoading ? null : _showMediaPickerBottomSheet,
        backgroundColor: Colors.orange,
        icon: const Icon(Icons.add_photo_alternate, color: Colors.white),
        label: const Text(
          'Thêm ảnh/video',
          style: TextStyle(color: Colors.white),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }
}
