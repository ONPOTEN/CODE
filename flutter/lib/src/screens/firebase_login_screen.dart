import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../providers/auth_provider.dart';

class FirebaseLoginScreen extends StatefulWidget {
  @override
  _FirebaseLoginScreenState createState() => _FirebaseLoginScreenState();
}

class _FirebaseLoginScreenState extends State<FirebaseLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _inputController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _inputType; // 'email', 'phone', or null

  @override
  void dispose() {
    _inputController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // Detect input type: email, phone, or nickname
  void _detectInputType(String value) {
    setState(() {
      if (value.isEmpty) {
        _inputType = null;
      } else if (value.contains('@')) {
        _inputType = 'email';
      } else if (value.startsWith('+') || RegExp(r'^\d{10,}').hasMatch(value)) {
        _inputType = 'phone';
      } else {
        _inputType = 'nickname';
      }
    });
  }

  Future<void> _handleLogin(AuthProvider authProvider) async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    final input = _inputController.text.trim();
    final password = _passwordController.text;

    bool success = false;
    String errorMessage = 'Login failed';

    try {
      if (_inputType == 'phone') {
        // Phone + password login
        final prefs = await SharedPreferences.getInstance();
        final phoneAuthJson = prefs.getString('phoneAuthPassword');

        if (phoneAuthJson == null) {
          errorMessage = 'No phone account found. Register with SMS first by tapping phone icon.';
        } else {
          final phoneAuthData = jsonDecode(phoneAuthJson) as Map<String, dynamic>;
          final savedPhone = phoneAuthData['phoneNumber'] as String?;
          final savedPassword = phoneAuthData['password'] as String?;

          if (savedPhone == input && savedPassword == password) {
            success = true;
          } else if (savedPhone != input) {
            errorMessage = 'Phone number does not match registered account.';
          } else {
            errorMessage = 'Incorrect password.';
          }
        }

        if (success) {
          // Phone password login successful
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Login successful!')),
          );
          Navigator.of(context).pushReplacementNamed('/home');
        }
      } else if (_inputType == 'email') {
        // Email login
        success = await authProvider.loginWithEmail(
          email: input,
          password: password,
        );

        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Login successful!')),
          );
          Navigator.of(context).pushReplacementNamed('/home');
        } else {
          errorMessage = authProvider.errorMessage ?? 'Email login failed';
        }
      } else {
        // Nickname login
        success = await authProvider.loginWithNickname(
          nickname: input,
          password: password,
        );

        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Login successful!')),
          );
          Navigator.of(context).pushReplacementNamed('/home');
        } else {
          errorMessage = authProvider.errorMessage ?? 'Nickname login failed';
        }
      }
    } catch (e) {
      print('Login error: $e');
      errorMessage = 'Login failed: ${e.toString()}';
    }

    setState(() => _isLoading = false);

    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(errorMessage)),
      );
    }
  }

  Future<void> _handleGoogleLogin(AuthProvider authProvider) async {
    setState(() => _isLoading = true);

    final success = await authProvider.signInWithGoogle();

    setState(() => _isLoading = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Google login successful!')),
      );
      Navigator.of(context).pushReplacementNamed('/home');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authProvider.errorMessage ?? 'Google login failed')),
      );
    }
  }

  Future<void> _handleFacebookLogin(AuthProvider authProvider) async {
    setState(() => _isLoading = true);

    final success = await authProvider.signInWithFacebook();

    setState(() => _isLoading = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Facebook login successful!')),
      );
      Navigator.of(context).pushReplacementNamed('/home');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authProvider.errorMessage ?? 'Facebook login failed')),
      );
    }
  }

  Future<void> _handleAppleLogin(AuthProvider authProvider) async {
    setState(() => _isLoading = true);

    final success = await authProvider.signInWithApple();

    setState(() => _isLoading = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Apple login successful!')),
      );
      Navigator.of(context).pushReplacementNamed('/home');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authProvider.errorMessage ?? 'Apple login failed')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Login'),
        elevation: 0,
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 24),
                Text(
                  'Welcome Back',
                  style: Theme.of(context).textTheme.headlineSmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Login to your account',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),

                // Unified Login Form
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _inputController,
                        onChanged: _detectInputType,
                        decoration: InputDecoration(
                          labelText: 'Email, Phone, or Nickname',
                          hintText: 'user@example.com, +1234567890, or username',
                          prefixIcon: const Icon(Icons.person),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        validator: (value) {
                          if (value?.isEmpty ?? true) return 'Email, phone, or nickname required';
                          return null;
                        },
                      ),
                      if (_inputController.text.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            _inputType == 'email'
                                ? '✉️ Email login'
                                : _inputType == 'phone'
                                    ? '📱 Phone login'
                                    : _inputType == 'nickname'
                                        ? '👤 Nickname login'
                                        : '',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off : Icons.visibility,
                            ),
                            onPressed: () {
                              setState(() => _obscurePassword = !_obscurePassword);
                            },
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        validator: (value) {
                          if (value?.isEmpty ?? true) return 'Password is required';
                          if ((value?.length ?? 0) < 6) return 'Password must be at least 6 characters';
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : () => _handleLogin(authProvider),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 24,
                                  width: 24,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text('Sign In'),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // Divider with text
                Row(
                  children: [
                    Expanded(child: Divider(color: Colors.grey[400])),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'OR',
                        style: TextStyle(color: Colors.grey[600], fontWeight: FontWeight.w500),
                      ),
                    ),
                    Expanded(child: Divider(color: Colors.grey[400])),
                  ],
                ),

                const SizedBox(height: 24),

                // Social login buttons
                SizedBox(
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: _isLoading ? null : () => _handleGoogleLogin(authProvider),
                    icon: const Text('🔷'),
                    label: const Text('Sign in with Google'),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: _isLoading ? null : () => _handleFacebookLogin(authProvider),
                    icon: const Text('📘'),
                    label: const Text('Sign in with Facebook'),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: _isLoading ? null : () => _handleAppleLogin(authProvider),
                    icon: const Text('🍎'),
                    label: const Text('Sign in with Apple'),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: _isLoading
                        ? null
                        : () {
                            Navigator.of(context).pushNamed('/firebase-phone-login');
                          },
                    icon: const Text('📱'),
                    label: const Text('Register with Phone (SMS)'),
                  ),
                ),

                const SizedBox(height: 24),

                // Sign up link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text("Don't have an account? "),
                    TextButton(
                      onPressed: () {
                        Navigator.of(context).pushReplacementNamed('/firebase-signup');
                      },
                      child: const Text('Sign up'),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
