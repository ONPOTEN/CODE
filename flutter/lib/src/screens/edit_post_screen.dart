import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../models/post.dart';
import '../services/post_service.dart';

class EditPostScreen extends StatefulWidget {
  final Post post;

  const EditPostScreen({Key? key, required this.post}) : super(key: key);

  @override
  State<EditPostScreen> createState() => _EditPostScreenState();
}

class _EditPostScreenState extends State<EditPostScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _contentController;
  late final TextEditingController _excerptController;
  final ImagePicker _picker = ImagePicker();

  late String _selectedType;
  late String _selectedStatus;
  late String _selectedVisibility;
  List<File> _newImages = [];
  bool _isLoading = false;
  String? _errorMessage;
  Map<String, String>? _validationErrors;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.post.title);
    _contentController = TextEditingController(text: widget.post.content);
    _excerptController = TextEditingController(text: widget.post.excerpt);
    _selectedType = widget.post.type;
    _selectedStatus = widget.post.status;
    _selectedVisibility = widget.post.visibility ?? Post.visibilityPublic;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    _excerptController.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    try {
      final List<XFile> images = await _picker.pickMultiImage();

      if (images.length + _newImages.length + widget.post.images.length > 10) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Maximum 10 images allowed'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      setState(() {
        _newImages.addAll(images.map((xfile) => File(xfile.path)));
      });
    } catch (e) {
      print('Error picking images: $e');
    }
  }

  void _removeNewImage(int index) {
    setState(() {
      _newImages.removeAt(index);
    });
  }

  Future<void> _submitPost() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _validationErrors = null;
    });

    try {
      final result = await PostService.updatePost(
        postId: widget.post.id,
        title: _titleController.text.trim(),
        content: _contentController.text.trim(),
        excerpt: _excerptController.text.trim().isEmpty
            ? null
            : _excerptController.text.trim(),
        type: _selectedType,
        status: _selectedStatus,
        visibility: _selectedVisibility,
        images: _newImages.isEmpty ? null : _newImages,
      );

      if (mounted) {
        if (result['success'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Post updated successfully'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.of(context).pop(true); // Return true to indicate success
        } else {
          setState(() {
            _errorMessage = result['message'] ?? 'Failed to update post';
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
          _errorMessage = 'Error: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  String? _getFieldError(String field) {
    return _validationErrors?[field];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Post'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Error message
              if (_errorMessage != null && _validationErrors == null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red[100],
                    border: Border.all(color: Colors.red),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),

              // Title
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(
                  labelText: 'Title *',
                  hintText: 'Enter post title',
                  border: const OutlineInputBorder(),
                  errorText: _getFieldError('title'),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Title is required';
                  }
                  return null;
                },
                enabled: !_isLoading,
              ),
              const SizedBox(height: 16),

              // Excerpt
              TextFormField(
                controller: _excerptController,
                decoration: const InputDecoration(
                  labelText: 'Excerpt',
                  hintText: 'Short description (optional)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
                enabled: !_isLoading,
              ),
              const SizedBox(height: 16),

              // Content
              TextFormField(
                controller: _contentController,
                decoration: InputDecoration(
                  labelText: 'Content *',
                  hintText: 'Write your post content here...',
                  border: const OutlineInputBorder(),
                  errorText: _getFieldError('content'),
                  alignLabelWithHint: true,
                ),
                maxLines: 12,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Content is required';
                  }
                  return null;
                },
                enabled: !_isLoading,
              ),
              const SizedBox(height: 16),

              // Existing images
              if (widget.post.featuredImage != null) ...[
                const Text(
                  'Current Featured Image',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    widget.post.featuredImage!,
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        height: 200,
                        color: Colors.grey[300],
                        child: const Center(
                          child: Icon(Icons.image_not_supported, size: 48),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // New images section
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Add New Images',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          ElevatedButton.icon(
                            onPressed: _isLoading ? null : _pickImages,
                            icon: const Icon(Icons.add_photo_alternate),
                            label: const Text('Add Images'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      if (_newImages.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            crossAxisSpacing: 8,
                            mainAxisSpacing: 8,
                          ),
                          itemCount: _newImages.length,
                          itemBuilder: (context, index) {
                            return Stack(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.file(
                                    _newImages[index],
                                    width: double.infinity,
                                    height: double.infinity,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                Positioned(
                                  top: 4,
                                  right: 4,
                                  child: InkWell(
                                    onTap: _isLoading
                                        ? null
                                        : () => _removeNewImage(index),
                                    child: Container(
                                      padding: const EdgeInsets.all(4),
                                      decoration: const BoxDecoration(
                                        color: Colors.red,
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
                              ],
                            );
                          },
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Type, Status, and Visibility
              Column(
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: _selectedType,
                    decoration: const InputDecoration(
                      labelText: 'Type',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: Post.typePost,
                        child: Text('Post'),
                      ),
                      DropdownMenuItem(
                        value: Post.typePage,
                        child: Text('Page'),
                      ),
                      DropdownMenuItem(
                        value: Post.typeProduct,
                        child: Text('Product'),
                      ),
                    ],
                    onChanged: _isLoading
                        ? null
                        : (value) {
                            if (value != null) {
                              setState(() => _selectedType = value);
                            }
                          },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedStatus,
                    decoration: const InputDecoration(
                      labelText: 'Status',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: Post.statusDraft,
                        child: Text('Draft'),
                      ),
                      DropdownMenuItem(
                        value: Post.statusPending,
                        child: Text('Pending'),
                      ),
                      DropdownMenuItem(
                        value: Post.statusPublish,
                        child: Text('Publish'),
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
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedVisibility,
                    decoration: const InputDecoration(
                      labelText: 'Visibility',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: Post.visibilityPublic,
                        child: Text('Public'),
                      ),
                      DropdownMenuItem(
                        value: Post.visibilityPrivate,
                        child: Text('Private'),
                      ),
                    ],
                    onChanged: _isLoading
                        ? null
                        : (value) {
                            if (value != null) {
                              setState(() => _selectedVisibility = value);
                            }
                          },
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Submit button
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _submitPost,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Text(
                              'Update Post',
                              style: TextStyle(fontSize: 16),
                            ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      onPressed:
                          _isLoading ? null : () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(fontSize: 16),
                      ),
                    ),
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
