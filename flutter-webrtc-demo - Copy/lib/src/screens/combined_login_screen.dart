import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

/// Combined Login Screen
/// Supports Phone+Password, Email+Password, and Nickname+Password authentication
class CombinedLoginScreen extends StatefulWidget {
  @override
  _CombinedLoginScreenState createState() => _CombinedLoginScreenState();
}

class _CombinedLoginScreenState extends State<CombinedLoginScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Phone + Password Controllers
  final _phoneController = TextEditingController();
  final _phonePasswordController = TextEditingController();
  bool _showPhonePassword = false;
  bool _isPhoneLoading = false;

  // Email + Password Controllers
  final _emailController = TextEditingController();
  final _emailPasswordController = TextEditingController();
  bool _showEmailPassword = false;
  bool _isEmailLoading = false;

  // Nickname + Password Controllers
  final _nicknameController = TextEditingController();
  final _nicknamePasswordController = TextEditingController();
  bool _showNicknamePassword = false;
  bool _isNicknameLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _phoneController.dispose();
    _phonePasswordController.dispose();
    _emailController.dispose();
    _emailPasswordController.dispose();
    _nicknameController.dispose();
    _nicknamePasswordController.dispose();
    super.dispose();
  }

  // ============ PHONE + PASSWORD LOGIN ============

  Future<void> _handlePhoneLogin(AuthProvider authProvider) async {
    final phone = _phoneController.text.trim();
    final password = _phonePasswordController.text.trim();

    if (phone.isEmpty) {
      _showError('Please enter a phone number');
      return;
    }

    if (password.isEmpty) {
      _showError('Please enter a password');
      return;
    }

    setState(() => _isPhoneLoading = true);

    try {
      final success = await authProvider.loginWithPhonePassword(
        phone: phone,
        password: password,
      );

      setState(() => _isPhoneLoading = false);

      if (success) {
        _showSuccess('Login successful!');
        Future.delayed(const Duration(seconds: 1), () {
          if (mounted) {
            Navigator.of(context).pushReplacementNamed('/home');
          }
        });
      } else {
        _showError(authProvider.errorMessage ?? 'Login failed');
      }
    } catch (e) {
      setState(() => _isPhoneLoading = false);
      _showError('Error: ${e.toString()}');
    }
  }

  // ============ EMAIL + PASSWORD LOGIN ============

  Future<void> _handleEmailLogin(AuthProvider authProvider) async {
    final email = _emailController.text.trim();
    final password = _emailPasswordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      _showError('Please enter email and password');
      return;
    }

    setState(() => _isEmailLoading = true);

    try {
      final success = await authProvider.loginWithEmail(
        email: email,
        password: password,
      );

      setState(() => _isEmailLoading = false);

      if (success) {
        _showSuccess('Login successful!');
        Future.delayed(const Duration(seconds: 1), () {
          if (mounted) {
            Navigator.of(context).pushReplacementNamed('/home');
          }
        });
      } else {
        _showError(authProvider.errorMessage ?? 'Login failed');
      }
    } catch (e) {
      setState(() => _isEmailLoading = false);
      _showError('Error: ${e.toString()}');
    }
  }

  // ============ NICKNAME + PASSWORD LOGIN ============

  Future<void> _handleNicknameLogin(AuthProvider authProvider) async {
    final nickname = _nicknameController.text.trim();
    final password = _nicknamePasswordController.text.trim();

    if (nickname.isEmpty || password.isEmpty) {
      _showError('Please enter nickname and password');
      return;
    }

    setState(() => _isNicknameLoading = true);

    try {
      final success = await authProvider.loginWithNickname(
        nickname: nickname,
        password: password,
      );

      setState(() => _isNicknameLoading = false);

      if (success) {
        _showSuccess('Login successful!');
        Future.delayed(const Duration(seconds: 1), () {
          if (mounted) {
            Navigator.of(context).pushReplacementNamed('/home');
          }
        });
      } else {
        _showError(authProvider.errorMessage ?? 'Login failed');
      }
    } catch (e) {
      setState(() => _isNicknameLoading = false);
      _showError('Error: ${e.toString()}');
    }
  }

  // ============ UI HELPERS ============

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red[600],
      ),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green[600],
      ),
    );
  }

  // ============ BUILD UI ============

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Login'),
        elevation: 0,
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return Column(
            children: [
              // Tab Bar
              TabBar(
                controller: _tabController,
                labelColor: Theme.of(context).primaryColor,
                unselectedLabelColor: Colors.grey[600],
                indicatorColor: Theme.of(context).primaryColor,
                tabs: const [
                  Tab(
                    icon: Icon(Icons.phone),
                    text: 'Phone',
                  ),
                  Tab(
                    icon: Icon(Icons.email),
                    text: 'Email',
                  ),
                  Tab(
                    icon: Icon(Icons.person),
                    text: 'Nickname',
                  ),
                ],
              ),
              // Tab Content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    // Phone + Password Tab
                    _buildPhoneLoginTab(authProvider),
                    // Email + Password Tab
                    _buildEmailLoginTab(authProvider),
                    // Nickname + Password Tab
                    _buildNicknameLoginTab(authProvider),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  // ============ PHONE + PASSWORD LOGIN TAB ============

  Widget _buildPhoneLoginTab(AuthProvider authProvider) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 24),
          Text(
            'Phone Login',
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Sign in with your phone number and password',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          // Phone Number Input
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            enabled: !_isPhoneLoading,
            decoration: InputDecoration(
              labelText: 'Phone Number',
              hintText: '+84 (123) 456-7890',
              prefixIcon: const Icon(Icons.phone),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Password Input
          TextFormField(
            controller: _phonePasswordController,
            obscureText: !_showPhonePassword,
            enabled: !_isPhoneLoading,
            decoration: InputDecoration(
              labelText: 'Password',
              hintText: 'Enter your password',
              prefixIcon: const Icon(Icons.lock),
              suffixIcon: IconButton(
                icon: Icon(
                  _showPhonePassword ? Icons.visibility : Icons.visibility_off,
                ),
                onPressed: () {
                  setState(() => _showPhonePassword = !_showPhonePassword);
                },
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 24),
          // Login Button
          SizedBox(
            height: 48,
            child: ElevatedButton(
              onPressed: _isPhoneLoading
                  ? null
                  : () => _handlePhoneLogin(authProvider),
              child: _isPhoneLoading
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
    );
  }

  // ============ EMAIL + PASSWORD LOGIN TAB ============

  Widget _buildEmailLoginTab(AuthProvider authProvider) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 24),
          Text(
            'Email Login',
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Sign in with your email and password',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          // Email Input
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            enabled: !_isEmailLoading,
            decoration: InputDecoration(
              labelText: 'Email',
              hintText: 'your@email.com',
              prefixIcon: const Icon(Icons.email),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Password Input
          TextFormField(
            controller: _emailPasswordController,
            obscureText: !_showEmailPassword,
            enabled: !_isEmailLoading,
            decoration: InputDecoration(
              labelText: 'Password',
              hintText: 'Enter your password',
              prefixIcon: const Icon(Icons.lock),
              suffixIcon: IconButton(
                icon: Icon(
                  _showEmailPassword ? Icons.visibility : Icons.visibility_off,
                ),
                onPressed: () {
                  setState(() => _showEmailPassword = !_showEmailPassword);
                },
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 24),
          // Login Button
          SizedBox(
            height: 48,
            child: ElevatedButton(
              onPressed: _isEmailLoading
                  ? null
                  : () => _handleEmailLogin(authProvider),
              child: _isEmailLoading
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
    );
  }

  // ============ NICKNAME + PASSWORD LOGIN TAB ============

  Widget _buildNicknameLoginTab(AuthProvider authProvider) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 24),
          Text(
            'Nickname Login',
            style: Theme.of(context).textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Sign in with your nickname and password',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          // Nickname Input
          TextFormField(
            controller: _nicknameController,
            enabled: !_isNicknameLoading,
            decoration: InputDecoration(
              labelText: 'Nickname',
              hintText: 'Your display name',
              prefixIcon: const Icon(Icons.person),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Password Input
          TextFormField(
            controller: _nicknamePasswordController,
            obscureText: !_showNicknamePassword,
            enabled: !_isNicknameLoading,
            decoration: InputDecoration(
              labelText: 'Password',
              hintText: 'Enter your password',
              prefixIcon: const Icon(Icons.lock),
              suffixIcon: IconButton(
                icon: Icon(
                  _showNicknamePassword ? Icons.visibility : Icons.visibility_off,
                ),
                onPressed: () {
                  setState(() => _showNicknamePassword = !_showNicknamePassword);
                },
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 24),
          // Login Button
          SizedBox(
            height: 48,
            child: ElevatedButton(
              onPressed: _isNicknameLoading
                  ? null
                  : () => _handleNicknameLogin(authProvider),
              child: _isNicknameLoading
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
    );
  }
}
