import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/api_config.dart';

class ProfileEditScreen extends StatefulWidget {
  final User user;

  const ProfileEditScreen({Key? key, required this.user}) : super(key: key);

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _isAvatarLoading = false;
  bool _isPasswordLoading = false;

  // Form controllers
  late TextEditingController _displayNameController;
  late TextEditingController _emailController;
  late TextEditingController _hobbyController;
  late TextEditingController _companyController;
  late TextEditingController _occupationController;
  late TextEditingController _mainOccupationController;
  late TextEditingController _locationController;
  late TextEditingController _phoneController;

  // Password controllers
  final TextEditingController _currentPasswordController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  // Privacy settings
  late bool _emailPublic;
  late bool _hobbyPublic;
  late bool _companyPublic;
  late bool _occupationPublic;
  late bool _mainOccupationPublic;
  late bool _locationPublic;
  late bool _phonePublic;

  // Profile visibility
  late String _profileVisibility;

  // Role (only for admin)
  late String _role;

  // Avatar
  File? _avatarFile;
  String? _currentAvatarUrl;

  @override
  void initState() {
    super.initState();

    // Initialize controllers with current user data
    _displayNameController = TextEditingController(text: widget.user.displayName);
    _emailController = TextEditingController(text: widget.user.email);
    _hobbyController = TextEditingController(text: widget.user.hobby ?? '');
    _companyController = TextEditingController(text: widget.user.company ?? '');
    _occupationController = TextEditingController(text: widget.user.occupation ?? '');
    _mainOccupationController = TextEditingController(text: widget.user.mainOccupation ?? '');
    _locationController = TextEditingController(text: widget.user.location ?? '');
    _phoneController = TextEditingController(text: widget.user.phone ?? '');

    // Initialize privacy settings (default to true if null)
    _emailPublic = widget.user.emailPublic ?? true;
    _hobbyPublic = widget.user.hobbyPublic ?? true;
    _companyPublic = widget.user.companyPublic ?? true;
    _occupationPublic = widget.user.occupationPublic ?? true;
    _mainOccupationPublic = widget.user.mainOccupationPublic ?? true;
    _locationPublic = widget.user.locationPublic ?? true;
    _phonePublic = widget.user.phonePublic ?? true;

    // Initialize profile visibility
    _profileVisibility = widget.user.profileVisibility ?? 'public';

    // Initialize role
    _role = widget.user.role;

    // Initialize avatar URL
    _currentAvatarUrl = widget.user.avatar;
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _emailController.dispose();
    _hobbyController.dispose();
    _companyController.dispose();
    _occupationController.dispose();
    _mainOccupationController.dispose();
    _locationController.dispose();
    _phoneController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  bool _isAdmin() {
    return widget.user.role.toLowerCase() == 'admin';
  }

  Future<void> _pickAvatar() async {
    final ImagePicker picker = ImagePicker();

    try {
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );

      if (image != null) {
        setState(() {
          _avatarFile = File(image.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Không thể chọn ảnh: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _uploadAvatar() async {
    if (_avatarFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng chọn một ảnh'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isAvatarLoading = true;
    });

    try {
      final result = await AuthService.uploadAvatar(_avatarFile!);

      if (mounted) {
        setState(() {
          _isAvatarLoading = false;
        });

        if (result['success'] == true) {
          setState(() {
            _currentAvatarUrl = result['avatar_url'];
            _avatarFile = null;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Tải ảnh đại diện thành công!'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Tải ảnh đại diện thất bại'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isAvatarLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final result = await AuthService.updateProfile(
        displayName: _displayNameController.text.trim(),
        email: _emailController.text.trim(),
        hobby: _hobbyController.text.trim().isNotEmpty
            ? _hobbyController.text.trim()
            : null,
        company: _companyController.text.trim().isNotEmpty
            ? _companyController.text.trim()
            : null,
        occupation: _occupationController.text.trim().isNotEmpty
            ? _occupationController.text.trim()
            : null,
        mainOccupation: _mainOccupationController.text.trim().isNotEmpty
            ? _mainOccupationController.text.trim()
            : null,
        location: _locationController.text.trim().isNotEmpty
            ? _locationController.text.trim()
            : null,
        phone: _phoneController.text.trim().isNotEmpty
            ? _phoneController.text.trim()
            : null,
        profileVisibility: _profileVisibility,
        emailPublic: _emailPublic,
        hobbyPublic: _hobbyPublic,
        companyPublic: _companyPublic,
        occupationPublic: _occupationPublic,
        mainOccupationPublic: _mainOccupationPublic,
        locationPublic: _locationPublic,
        phonePublic: _phonePublic,
        role: _isAdmin() ? _role : null,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        if (result['success'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Cập nhật hồ sơ thành công!'),
              backgroundColor: Colors.green,
            ),
          );
          // Return updated user
          Navigator.of(context).pop(result['user']);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Cập nhật hồ sơ thất bại'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _changePassword() async {
    final currentPassword = _currentPasswordController.text;
    final newPassword = _newPasswordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (currentPassword.isEmpty || newPassword.isEmpty || confirmPassword.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng điền đầy đủ thông tin'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (newPassword != confirmPassword) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mật khẩu mới không khớp'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (newPassword.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mật khẩu phải có ít nhất 8 ký tự'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isPasswordLoading = true;
    });

    try {
      final result = await AuthService.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      );

      if (mounted) {
        setState(() {
          _isPasswordLoading = false;
        });

        if (result['success'] == true) {
          _currentPasswordController.clear();
          _newPasswordController.clear();
          _confirmPasswordController.clear();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đổi mật khẩu thành công!'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Đổi mật khẩu thất bại'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isPasswordLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    String? hint,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
    bool enabled = true,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: TextFormField(
        controller: controller,
        enabled: enabled,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          filled: true,
          fillColor: enabled ? Colors.grey[50] : Colors.grey[200],
        ),
        maxLines: maxLines,
        keyboardType: keyboardType,
        validator: validator,
      ),
    );
  }

  Widget _buildPrivacyCheckbox({
    required String label,
    required bool value,
    required ValueChanged<bool?> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        children: [
          Checkbox(
            value: value,
            onChanged: onChanged,
            activeColor: Colors.blue,
          ),
          Expanded(
            child: Text(
              label,
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

  Widget _buildAvatarSection() {
    final firstLetter = widget.user.displayName.isNotEmpty
        ? widget.user.displayName[0].toUpperCase()
        : 'U';

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.image, color: Colors.blue[600]),
                const SizedBox(width: 8),
                const Text(
                  'Ảnh đại diện',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              children: [
                // Avatar Preview
                Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.grey[300]!, width: 2),
                  ),
                  child: ClipOval(
                    child: _avatarFile != null
                        ? Image.file(
                            _avatarFile!,
                            fit: BoxFit.cover,
                          )
                        : _currentAvatarUrl != null && _currentAvatarUrl!.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: ApiConfig.getImageUrl(_currentAvatarUrl!),
                                fit: BoxFit.cover,
                                placeholder: (context, url) => Container(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [Colors.blue[400]!, Colors.purple[400]!],
                                    ),
                                  ),
                                  child: const Center(
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                                errorWidget: (context, url, error) => Container(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [Colors.blue[400]!, Colors.purple[400]!],
                                    ),
                                  ),
                                  child: Center(
                                    child: Text(
                                      firstLetter,
                                      style: const TextStyle(
                                        fontSize: 40,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                              )
                            : Container(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [Colors.blue[400]!, Colors.purple[400]!],
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    firstLetter,
                                    style: const TextStyle(
                                      fontSize: 40,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Chọn ảnh đại diện',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'JPG, PNG hoặc GIF (tối đa 2MB)',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: _pickAvatar,
                        icon: const Icon(Icons.photo_library, size: 18),
                        label: const Text('Chọn ảnh'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isAvatarLoading || _avatarFile == null
                    ? null
                    : _uploadAvatar,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: _isAvatarLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Tải lên ảnh đại diện'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPasswordSection() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.lock, color: Colors.blue[600]),
                const SizedBox(width: 8),
                const Text(
                  'Đổi mật khẩu',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            _buildTextField(
              controller: _currentPasswordController,
              label: 'Mật khẩu hiện tại',
              keyboardType: TextInputType.visiblePassword,
            ),
            _buildTextField(
              controller: _newPasswordController,
              label: 'Mật khẩu mới',
              hint: 'Phải có ít nhất 8 ký tự',
              keyboardType: TextInputType.visiblePassword,
            ),
            _buildTextField(
              controller: _confirmPasswordController,
              label: 'Xác nhận mật khẩu mới',
              keyboardType: TextInputType.visiblePassword,
            ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isPasswordLoading ? null : _changePassword,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: _isPasswordLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Đổi mật khẩu'),
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
      appBar: AppBar(
        title: const Text('Chỉnh sửa hồ sơ'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          if (!_isLoading)
            IconButton(
              icon: const Icon(Icons.check),
              onPressed: _saveProfile,
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
                    // Avatar Section
                    _buildAvatarSection(),
                    const SizedBox(height: 16),

                    // Profile Information Section
                    Card(
                      elevation: 2,
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.person, color: Colors.blue[600]),
                                const SizedBox(width: 8),
                                const Text(
                                  'Thông tin hồ sơ',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 24),

                            // Username (read-only)
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.grey[100],
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.grey[300]!),
                              ),
                              child: Row(
                                children: [
                                  Text(
                                    'Tên đăng nhập: ',
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  Text(
                                    '@${widget.user.username}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),

                            _buildTextField(
                              controller: _displayNameController,
                              label: 'Tên hiển thị *',
                              hint: 'Nhập tên hiển thị của bạn',
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Tên hiển thị không được để trống';
                                }
                                return null;
                              },
                            ),

                            _buildTextField(
                              controller: _emailController,
                              label: 'Địa chỉ Email *',
                              hint: 'Nhập địa chỉ email',
                              keyboardType: TextInputType.emailAddress,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Email không được để trống';
                                }
                                if (!value.contains('@')) {
                                  return 'Vui lòng nhập email hợp lệ';
                                }
                                return null;
                              },
                            ),
                            _buildPrivacyCheckbox(
                              label: 'Công khai email (hiển thị với người không phải bạn bè)',
                              value: _emailPublic,
                              onChanged: (value) {
                                setState(() {
                                  _emailPublic = value ?? true;
                                });
                              },
                            ),

                            _buildTextField(
                              controller: _hobbyController,
                              label: 'Sở thích',
                              hint: 'Bạn thích làm gì?',
                            ),
                            _buildPrivacyCheckbox(
                              label: 'Công khai sở thích',
                              value: _hobbyPublic,
                              onChanged: (value) {
                                setState(() {
                                  _hobbyPublic = value ?? true;
                                });
                              },
                            ),

                            _buildTextField(
                              controller: _companyController,
                              label: 'Công ty',
                              hint: 'Bạn làm việc ở đâu?',
                            ),
                            _buildPrivacyCheckbox(
                              label: 'Công khai công ty',
                              value: _companyPublic,
                              onChanged: (value) {
                                setState(() {
                                  _companyPublic = value ?? true;
                                });
                              },
                            ),

                            _buildTextField(
                              controller: _occupationController,
                              label: 'Nghề nghiệp',
                              hint: 'Nghề nghiệp của bạn là gì?',
                            ),
                            _buildPrivacyCheckbox(
                              label: 'Công khai nghề nghiệp',
                              value: _occupationPublic,
                              onChanged: (value) {
                                setState(() {
                                  _occupationPublic = value ?? true;
                                });
                              },
                            ),

                            _buildTextField(
                              controller: _mainOccupationController,
                              label: 'Nghề nghiệp chính',
                              hint: 'Nghề nghiệp chính của bạn là gì?',
                            ),
                            _buildPrivacyCheckbox(
                              label: 'Công khai nghề nghiệp chính',
                              value: _mainOccupationPublic,
                              onChanged: (value) {
                                setState(() {
                                  _mainOccupationPublic = value ?? true;
                                });
                              },
                            ),

                            _buildTextField(
                              controller: _locationController,
                              label: 'Địa điểm',
                              hint: 'Bạn ở đâu?',
                            ),
                            _buildPrivacyCheckbox(
                              label: 'Công khai địa điểm',
                              value: _locationPublic,
                              onChanged: (value) {
                                setState(() {
                                  _locationPublic = value ?? true;
                                });
                              },
                            ),

                            _buildTextField(
                              controller: _phoneController,
                              label: 'Số điện thoại (không thể thay đổi)',
                              keyboardType: TextInputType.phone,
                              enabled: false,
                            ),
                            Text(
                              'Số điện thoại bị khóa vì lý do bảo mật. Liên hệ hỗ trợ để thay đổi.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                            _buildPrivacyCheckbox(
                              label: 'Công khai số điện thoại',
                              value: _phonePublic,
                              onChanged: (value) {
                                setState(() {
                                  _phonePublic = value ?? true;
                                });
                              },
                            ),

                            const SizedBox(height: 16),

                            // Role (read-only)
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.grey[100],
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.grey[300]!),
                              ),
                              child: Row(
                                children: [
                                  Text(
                                    'Vai trò: ',
                                    style: TextStyle(
                                      color: Colors.grey[600],
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  Text(
                                    _role.toUpperCase(),
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: _role == 'admin' ? Colors.orange[700] : Colors.black87,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              'Vai trò của bạn không thể thay đổi. Liên hệ quản trị viên nếu cần.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),

                            const SizedBox(height: 16),

                            // Profile Visibility
                            const Text(
                              'Chế độ hiển thị hồ sơ',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.grey[50],
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.grey[300]!),
                              ),
                              child: Column(
                                children: [
                                  RadioListTile<String>(
                                    title: const Text('Công khai'),
                                    subtitle: const Text(
                                      'Bất kỳ ai cũng có thể xem hồ sơ của tôi',
                                      style: TextStyle(fontSize: 12),
                                    ),
                                    value: 'public',
                                    groupValue: _profileVisibility,
                                    onChanged: (value) {
                                      setState(() {
                                        _profileVisibility = value!;
                                      });
                                    },
                                  ),
                                  const Divider(height: 1),
                                  RadioListTile<String>(
                                    title: const Text('Riêng tư'),
                                    subtitle: const Text(
                                      'Chỉ bạn bè mới có thể xem hồ sơ của tôi',
                                      style: TextStyle(fontSize: 12),
                                    ),
                                    value: 'private',
                                    groupValue: _profileVisibility,
                                    onChanged: (value) {
                                      setState(() {
                                        _profileVisibility = value!;
                                      });
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Save Profile Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _saveProfile,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Cập nhật thông tin hồ sơ',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Password Section
                    _buildPasswordSection(),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }
}
