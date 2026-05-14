import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class EnhancedLoginScreen extends StatefulWidget {
  const EnhancedLoginScreen({Key? key}) : super(key: key);

  @override
  State<EnhancedLoginScreen> createState() => _EnhancedLoginScreenState();
}

class _EnhancedLoginScreenState extends State<EnhancedLoginScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Unified Login Tab
  late TextEditingController _unifiedCredentialController;
  late TextEditingController _unifiedPasswordController;
  bool _unifiedShowPassword = false;
  String _detectedLoginType = 'unknown';
  String _detectedInputTypeLabel = 'Enter your phone, email, or nickname';

  // Phone SMS Tab
  late TextEditingController _phoneController;
  bool _showPhoneSmsInput = false;
  late TextEditingController _smsCodeController;
  String? _phoneVerificationId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    // Unified Login
    _unifiedCredentialController = TextEditingController();
    _unifiedPasswordController = TextEditingController();
    _unifiedCredentialController.addListener(_detectInputType);

    // Phone SMS
    _phoneController = TextEditingController();
    _smsCodeController = TextEditingController();
  }

  @override
  void dispose() {
    _tabController.dispose();

    // Unified
    _unifiedCredentialController.dispose();
    _unifiedPasswordController.dispose();

    // Phone SMS
    _phoneController.dispose();
    _smsCodeController.dispose();

    super.dispose();
  }

  /// Detect input type for unified login
  void _detectInputType() {
    final input = _unifiedCredentialController.text.trim();

    if (input.isEmpty) {
      setState(() {
        _detectedLoginType = 'unknown';
        _detectedInputTypeLabel = 'Enter your phone, email, or nickname';
      });
      return;
    }

    String newType = 'unknown';
    String newLabel = 'Unknown format';

    if (input.contains('@')) {
      newType = 'email';
      newLabel = '📧 Email Login';
    } else if (input.startsWith('+') || (RegExp(r'^\d{10,}$').hasMatch(input))) {
      newType = 'phone';
      newLabel = '📱 Phone Login';
    } else if (RegExp(r'^[a-zA-Z0-9_\-]+$').hasMatch(input)) {
      newType = 'nickname';
      newLabel = '👤 Nickname Login';
    }

    setState(() {
      _detectedLoginType = newType;
      _detectedInputTypeLabel = newLabel;
    });
  }

  /// Handle unified login
  Future<void> _handleUnifiedLogin() async {
    if (_unifiedCredentialController.text.isEmpty) {
      _showErrorSnackBar('Please enter your phone, email, or nickname');
      return;
    }

    if (_unifiedPasswordController.text.isEmpty) {
      _showErrorSnackBar('Please enter your password');
      return;
    }

    if (_detectedLoginType == 'unknown') {
      _showErrorSnackBar(
          'Invalid format. Please enter a valid phone, email, or nickname');
      return;
    }

    final authProvider = context.read<AuthProvider>();
    final credential = _unifiedCredentialController.text.trim();
    final password = _unifiedPasswordController.text;

    try {
      bool success = false;

      if (_detectedLoginType == 'phone') {
        success = await authProvider.loginWithPhonePassword(
          phone: credential,
          password: password,
        );
      } else if (_detectedLoginType == 'email') {
        success = await authProvider.loginWithEmail(
          email: credential,
          password: password,
        );
      } else if (_detectedLoginType == 'nickname') {
        success = await authProvider.loginWithNickname(
          nickname: credential,
          password: password,
        );
      }

      if (success && mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/home', (route) => false);
      } else if (mounted) {
        _showErrorSnackBar(authProvider.errorMessage ?? 'Login failed');
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar('Login error: ${e.toString()}');
      }
    }
  }

  /// Handle phone SMS registration
  Future<void> _handlePhoneSmsRegistration() async {
    final authProvider = context.read<AuthProvider>();

    if (!_showPhoneSmsInput) {
      // Step 1: Start verification
      if (_phoneController.text.isEmpty) {
        _showErrorSnackBar('Please enter your phone number');
        return;
      }

      final phone = _phoneController.text.trim();
      print('EnhancedLoginScreen - Starting phone verification for: $phone');

      try {
        await authProvider.startPhoneVerification(phone);

        setState(() {
          _showPhoneSmsInput = true;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('SMS code sent! Check your messages.'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 3),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          _showErrorSnackBar('Failed to send SMS: ${e.toString()}');
        }
      }
    } else {
      // Step 2: Complete verification
      if (_smsCodeController.text.isEmpty) {
        _showErrorSnackBar('Please enter the SMS code');
        return;
      }

      final phone = _phoneController.text.trim();
      final smsCode = _smsCodeController.text.trim();

      print(
          'EnhancedLoginScreen - Completing phone verification with code: $smsCode');

      try {
        final success = await authProvider.completePhoneVerification(
          verificationId: _phoneVerificationId ?? '',
          smsCode: smsCode,
          phoneNumber: phone,
        );

        if (success && mounted) {
          // Navigate to password setup
          Navigator.of(context).pushNamed(
            '/firebase-phone-password-setup',
            arguments: phone,
          );
        } else if (mounted) {
          _showErrorSnackBar(
              authProvider.errorMessage ?? 'SMS verification failed');
        }
      } catch (e) {
        if (mounted) {
          _showErrorSnackBar('Verification error: ${e.toString()}');
        }
      }
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Login'),
        elevation: 0,
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Tab Bar
          TabBar(
            controller: _tabController,
            labelColor: Theme.of(context).primaryColor,
            unselectedLabelColor: Colors.grey[600],
            indicatorColor: Theme.of(context).primaryColor,
            tabs: const [
              Tab(icon: Icon(Icons.auto_awesome), text: 'Auto Detect'),
              Tab(icon: Icon(Icons.phone), text: 'Phone (SMS)'),
            ],
          ),

          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildUnifiedLoginTab(),
                _buildPhoneSmsTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Tab 1: Unified Auto-Detection Login
  Widget _buildUnifiedLoginTab() {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, _) {
        return SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.auto_awesome,
                      size: 48,
                      color: Theme.of(context).primaryColor,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Auto-Detect Login',
                      style: Theme.of(context).textTheme.headlineSmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Enter phone, email, or nickname',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Credential Input
              TextFormField(
                controller: _unifiedCredentialController,
                decoration: InputDecoration(
                  labelText: 'Phone, Email, or Nickname',
                  hintText: '0867631312 | user@email.com | john_doe',
                  prefixIcon: _getInputTypeIcon(),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                ),
              ),

              const SizedBox(height: 8),

              // Detected Type Label
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  _detectedInputTypeLabel,
                  style: TextStyle(
                    fontSize: 12,
                    color: _detectedLoginType == 'unknown'
                        ? Colors.grey[500]
                        : Colors.blue[600],
                    fontWeight: _detectedLoginType == 'unknown'
                        ? FontWeight.normal
                        : FontWeight.w600,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Password Input
              TextFormField(
                controller: _unifiedPasswordController,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _unifiedShowPassword
                          ? Icons.visibility
                          : Icons.visibility_off,
                      color: Colors.grey[600],
                    ),
                    onPressed: () {
                      setState(() {
                        _unifiedShowPassword = !_unifiedShowPassword;
                      });
                    },
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                ),
                obscureText: !_unifiedShowPassword,
              ),

              const SizedBox(height: 32),

              // Login Button
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed:
                      authProvider.isLoading ? null : _handleUnifiedLogin,
                  style: ElevatedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: authProvider.isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text('Sign In'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Tab 2: Phone SMS Registration
  Widget _buildPhoneSmsTab() {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, _) {
        return SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.phone,
                      size: 48,
                      color: Theme.of(context).primaryColor,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Phone + SMS Registration',
                      style: Theme.of(context).textTheme.headlineSmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Verify with SMS code, then create password',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Phone Number Input
              TextFormField(
                controller: _phoneController,
                enabled: !_showPhoneSmsInput,
                decoration: InputDecoration(
                  labelText: 'Phone Number',
                  hintText: '0867631312 or +840867631312',
                  prefixIcon: const Icon(Icons.phone),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                ),
                keyboardType: TextInputType.phone,
              ),

              const SizedBox(height: 24),

              // SMS Code Input (shown after SMS sent)
              if (_showPhoneSmsInput) ...[
                TextFormField(
                  controller: _smsCodeController,
                  decoration: InputDecoration(
                    labelText: 'SMS Code',
                    hintText: 'Enter the 6-digit code from SMS',
                    prefixIcon: const Icon(Icons.mail_lock),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                  ),
                  maxLength: 6,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
                Text(
                  'Check your phone for an SMS with the verification code',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.blue[600],
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
              ],

              // Info Box
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Colors.blue[200]!,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'How it works:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '1. Enter your phone number\n'
                      '2. Receive SMS with verification code\n'
                      '3. Enter the code\n'
                      '4. Create a strong password\n'
                      '5. Start using your account',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Action Button
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed:
                      authProvider.isLoading ? null : _handlePhoneSmsRegistration,
                  style: ElevatedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: authProvider.isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text(_showPhoneSmsInput ? 'Verify Code' : 'Send SMS'),
                ),
              ),

              // Back Button (shown after SMS sent)
              if (_showPhoneSmsInput) ...[
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _showPhoneSmsInput = false;
                      _smsCodeController.clear();
                    });
                  },
                  child: const Text('Back to phone entry'),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  /// Get appropriate icon based on detected input type
  Widget _getInputTypeIcon() {
    switch (_detectedLoginType) {
      case 'phone':
        return const Icon(Icons.phone);
      case 'email':
        return const Icon(Icons.email);
      case 'nickname':
        return const Icon(Icons.person);
      default:
        return const Icon(Icons.input);
    }
  }
}
