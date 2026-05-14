import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class UnifiedLoginScreen extends StatefulWidget {
  const UnifiedLoginScreen({Key? key}) : super(key: key);

  @override
  State<UnifiedLoginScreen> createState() => _UnifiedLoginScreenState();
}

class _UnifiedLoginScreenState extends State<UnifiedLoginScreen> {
  late TextEditingController _credentialController;
  late TextEditingController _passwordController;
  bool _showPassword = false;
  String _detectedLoginType = 'unknown'; // 'phone', 'email', 'nickname'
  String _detectedInputTypeLabel = 'Enter your phone, email, or nickname';

  @override
  void initState() {
    super.initState();
    _credentialController = TextEditingController();
    _passwordController = TextEditingController();
    _credentialController.addListener(_detectInputType);
  }

  @override
  void dispose() {
    _credentialController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// Smart input detection logic
  void _detectInputType() {
    final input = _credentialController.text.trim();

    if (input.isEmpty) {
      setState(() {
        _detectedLoginType = 'unknown';
        _detectedInputTypeLabel = 'Enter your phone, email, or nickname';
      });
      return;
    }

    String newType = 'unknown';
    String newLabel = 'Unknown format';

    // Check if it's an email (contains @)
    if (input.contains('@')) {
      newType = 'email';
      newLabel = '📧 Email Login';
    }
    // Check if it's a phone (starts with + or is all digits with 10+ length)
    else if (input.startsWith('+') || (RegExp(r'^\d{10,}$').hasMatch(input))) {
      newType = 'phone';
      newLabel = '📱 Phone Login';
    }
    // Otherwise it's a nickname
    else if (RegExp(r'^[a-zA-Z0-9_\-]+$').hasMatch(input)) {
      newType = 'nickname';
      newLabel = '👤 Nickname Login';
    }

    setState(() {
      _detectedLoginType = newType;
      _detectedInputTypeLabel = newLabel;
    });
  }

  /// Handle unified login
  Future<void> _handleLogin() async {
    if (_credentialController.text.isEmpty) {
      _showErrorSnackBar('Please enter your phone, email, or nickname');
      return;
    }

    if (_passwordController.text.isEmpty) {
      _showErrorSnackBar('Please enter your password');
      return;
    }

    if (_detectedLoginType == 'unknown') {
      _showErrorSnackBar('Invalid format. Please enter a valid phone, email, or nickname');
      return;
    }

    final authProvider = context.read<AuthProvider>();
    final credential = _credentialController.text.trim();
    final password = _passwordController.text;

    try {
      bool success = false;

      if (_detectedLoginType == 'phone') {
        // Phone login with normalization
        success = await authProvider.loginWithPhonePassword(
          phone: credential,
          password: password,
        );
      } else if (_detectedLoginType == 'email') {
        // Email login
        success = await authProvider.loginWithEmail(
          email: credential,
          password: password,
        );
      } else if (_detectedLoginType == 'nickname') {
        // Nickname login
        success = await authProvider.loginWithNickname(
          nickname: credential,
          password: password,
        );
      }

      if (success && mounted) {
        // Navigation is handled by AuthProvider listener
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // App Logo/Title
              const SizedBox(height: 20),
              Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.security,
                      size: 64,
                      color: Theme.of(context).primaryColor,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Welcome Back',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Sign in to your account',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.grey[600],
                          ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 48),

              // Credential Input Field
              TextFormField(
                controller: _credentialController,
                decoration: InputDecoration(
                  labelText: 'Phone, Email, or Nickname',
                  hintText: 'e.g., 0867631312, user@email.com, or john_doe',
                  prefixIcon: _getInputTypeIcon(),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: Colors.grey[300]!,
                      width: 1,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: Theme.of(context).primaryColor,
                      width: 2,
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                ),
                keyboardType: _getKeyboardType(),
                textInputAction: TextInputAction.next,
              ),

              // Detected Input Type Label
              const SizedBox(height: 8),
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

              // Password Input Field
              TextFormField(
                controller: _passwordController,
                decoration: InputDecoration(
                  labelText: 'Password',
                  hintText: 'Enter your password',
                  prefixIcon: const Icon(Icons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _showPassword ? Icons.visibility : Icons.visibility_off,
                      color: Colors.grey[600],
                    ),
                    onPressed: () {
                      setState(() {
                        _showPassword = !_showPassword;
                      });
                    },
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: Colors.grey[300]!,
                      width: 1,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: Theme.of(context).primaryColor,
                      width: 2,
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                ),
                obscureText: !_showPassword,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _handleLogin(),
              ),

              const SizedBox(height: 32),

              // Login Button
              Consumer<AuthProvider>(
                builder: (context, authProvider, _) {
                  return SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: authProvider.isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        backgroundColor: Theme.of(context).primaryColor,
                        disabledBackgroundColor: Colors.grey[400],
                      ),
                      child: authProvider.isLoading
                          ? const SizedBox(
                              height: 24,
                              width: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                              ),
                            )
                          : const Text(
                              'Sign In',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                    ),
                  );
                },
              ),

              const SizedBox(height: 24),

              // Divider with text
              Row(
                children: [
                  Expanded(
                    child: Divider(
                      color: Colors.grey[300],
                      thickness: 1,
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      'OR',
                      style: TextStyle(
                        color: Colors.grey[500],
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Divider(
                      color: Colors.grey[300],
                      thickness: 1,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Social Login Buttons
              SizedBox(
                height: 48,
                child: Consumer<AuthProvider>(
                  builder: (context, authProvider, _) {
                    return OutlinedButton.icon(
                      onPressed: authProvider.isLoading
                          ? null
                          : () async {
                              try {
                                final success =
                                    await authProvider.signInWithGoogle();
                                if (success && mounted) {
                                  Navigator.of(context)
                                      .pushNamedAndRemoveUntil(
                                    '/home',
                                    (route) => false,
                                  );
                                } else if (mounted) {
                                  _showErrorSnackBar(
                                    authProvider.errorMessage ??
                                        'Google sign-in failed',
                                  );
                                }
                              } catch (e) {
                                if (mounted) {
                                  _showErrorSnackBar(
                                    'Google sign-in error: ${e.toString()}',
                                  );
                                }
                              }
                            },
                      icon: const Icon(Icons.account_circle),
                      label: const Text('Sign in with Google'),
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 16),

              // Footer Links
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Don't have an account? ",
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                  TextButton(
                    onPressed: () {
                      // Navigate to signup
                      Navigator.of(context).pushNamed('/signup');
                    },
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(0, 0),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text('Create Account'),
                  ),
                ],
              ),

              const SizedBox(height: 8),

              Center(
                child: TextButton(
                  onPressed: () {
                    // Navigate to forgot password
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Forgot password feature coming soon'),
                      ),
                    );
                  },
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(0, 0),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text('Forgot Password?'),
                ),
              ),
            ],
          ),
        ),
      ),
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

  /// Get appropriate keyboard type based on detected input type
  TextInputType _getKeyboardType() {
    switch (_detectedLoginType) {
      case 'phone':
        return TextInputType.phone;
      case 'email':
        return TextInputType.emailAddress;
      default:
        return TextInputType.text;
    }
  }
}
