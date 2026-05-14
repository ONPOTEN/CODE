import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/firebase_auth_service.dart';
import 'dart:convert';

/// Firebase Phone Password Setup Screen
/// Displayed after successful SMS phone verification
/// Allows user to set up a password for future phone + password logins
/// Integrates with Firebase and Laravel backend
class FirebasePhonePasswordSetupScreen extends StatefulWidget {
  final String phoneNumber;

  const FirebasePhonePasswordSetupScreen({
    Key? key,
    required this.phoneNumber,
  }) : super(key: key);

  @override
  _FirebasePhonePasswordSetupScreenState createState() =>
      _FirebasePhonePasswordSetupScreenState();
}

class _FirebasePhonePasswordSetupScreenState
    extends State<FirebasePhonePasswordSetupScreen> {
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _showPassword = false;
  bool _showConfirmPassword = false;
  bool _isLoading = false;
  String? _errorMessage;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _checkUserAuthentication();
  }

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  /// Verify that user is authenticated via Firebase phone SMS
  /// If not authenticated, redirect back to phone login
  Future<void> _checkUserAuthentication() async {
    try {
      final currentUser = FirebaseAuth.instance.currentUser;

      if (currentUser == null) {
        print('[Phone Password Setup] ❌ No user authenticated');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Session expired. Please verify your phone again.'),
              duration: Duration(seconds: 3),
            ),
          );
          Future.delayed(const Duration(milliseconds: 500), () {
            Navigator.of(context).pushReplacementNamed('/firebase-phone-login');
          });
        }
      } else {
        print('[Phone Password Setup] ✅ User authenticated: ${currentUser.uid}');
        setState(() => _isInitialized = true);
      }
    } catch (e) {
      print('[Phone Password Setup] Error checking authentication: $e');
      if (mounted) {
        setState(() => _errorMessage = 'Failed to verify session');
      }
    }
  }

  /// Validate password strength
  bool _validatePassword(String password) {
    if (password.isEmpty) return false;
    if (password.length < 6) return false;
    if (!RegExp(r'[A-Z]').hasMatch(password)) return false;
    if (!RegExp(r'[a-z]').hasMatch(password)) return false;
    if (!RegExp(r'[0-9]').hasMatch(password)) return false;
    return true;
  }

  /// Get specific password validation error message
  String? _getPasswordError(String password) {
    if (password.isEmpty) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (!RegExp(r'[A-Z]').hasMatch(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!RegExp(r'[a-z]').hasMatch(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!RegExp(r'[0-9]').hasMatch(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  }

  /// Setup password with Firebase and Laravel backend
  /// This is ALWAYS called after phone SMS verification
  /// Updates password for both first-time and returning users
  Future<void> _setupPassword() async {
    setState(() => _errorMessage = null);

    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    // Validate password
    final error = _getPasswordError(password);
    if (error != null) {
      setState(() => _errorMessage = error);
      return;
    }

    // Check passwords match
    if (password != confirmPassword) {
      setState(() => _errorMessage = 'Passwords do not match');
      return;
    }

    setState(() => _isLoading = true);

    try {
      print('[Phone Password Setup] Starting password setup...');
      print('[Phone Password Setup] This is a mandatory step after SMS verification');

      final currentUser = FirebaseAuth.instance.currentUser;

      if (currentUser == null) {
        print('[Phone Password Setup] ❌ User not authenticated');
        setState(() =>
            _errorMessage = 'Authentication lost. Please start over.');
        return;
      }

      print('[Phone Password Setup] Firebase User UID: ${currentUser.uid}');

      // Step 1: Update Firebase password
      // This is ALWAYS required, even if user already has a password
      print('[Phone Password Setup] Step 1: Updating Firebase password...');
      try {
        await currentUser.updatePassword(password);
        print('[Phone Password Setup] ✅ Firebase password updated successfully');
      } catch (firebaseError) {
        print('[Phone Password Setup] ❌ Firebase password update error: $firebaseError');
        String errorMsg = 'Failed to update password';

        // Handle specific Firebase errors
        if (firebaseError.toString().contains('requires-recent-login')) {
          errorMsg = 'Session expired. Please verify your phone number again.';
        } else if (firebaseError.toString().contains('weak-password')) {
          errorMsg = 'Password is too weak. Please use a stronger password';
        }

        setState(() => _errorMessage = errorMsg);
        return;
      }

      // Step 2: Setup password in Laravel backend
      // This updates the password for both new and existing phone users
      print('[Phone Password Setup] Step 2: Setting up password in Laravel...');
      final setupResult = await FirebaseAuthService.setupPhonePasswordByPhone(
        phoneNumber: widget.phoneNumber,
        password: password,
        firebaseUid: currentUser.uid,
      );

      if (!mounted) return;

      if (setupResult['success']) {
        print('[Phone Password Setup] ✅ Laravel setup successful');
        print('[Phone Password Setup] User can now login with phone + password');

        // Step 3: Save password to local storage for future phone+password logins
        print('[Phone Password Setup] Step 3: Saving to local storage...');
        try {
          final prefs = await SharedPreferences.getInstance();
          final phoneAuthData = {
            'phoneNumber': widget.phoneNumber,
            'password': password,
            'firebaseUid': currentUser.uid,
            'tempEmail': setupResult['tempEmail'] ??
                'phone_${currentUser.uid}@phone-auth.local',
            'updatedAt': DateTime.now().toIso8601String(),
          };
          await prefs.setString(
            'phoneAuthPassword',
            jsonEncode(phoneAuthData),
          );
          print('[Phone Password Setup] ✅ Password saved to local storage');
        } catch (storageError) {
          print('[Phone Password Setup] ⚠️ Warning: Failed to save to local storage: $storageError');
          // Don't fail the whole flow if local storage save fails
        }

        print('[Phone Password Setup] ✅ Password setup complete! Redirecting to home...');

        // Navigate to home
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Password setup complete!'),
              duration: Duration(seconds: 2),
            ),
          );
          Future.delayed(const Duration(milliseconds: 500), () {
            if (mounted) {
              Navigator.of(context).pushReplacementNamed('/home');
            }
          });
        }
      } else {
        print('[Phone Password Setup] ❌ Laravel setup failed');
        setState(() =>
            _errorMessage = setupResult['message'] ??
                'Failed to set up password in backend. Please try again.');
      }
    } catch (e) {
      print('[Phone Password Setup] ❌ Password setup error: $e');
      setState(() =>
          _errorMessage = 'An error occurred: ${e.toString()}');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized) {
      return Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Complete Your Setup'),
        elevation: 0,
        automaticallyImplyLeading: false,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 24),

            // Header
            Text(
              'Complete Your Setup',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Create a password to complete your account setup.\nYou\'ll use this for future logins.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            // Step Indicator
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: Colors.blue[600],
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  'Setup Password',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: Colors.white,
                      ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Phone Info Box
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                border: Border.all(color: Colors.blue[200]!, width: 1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.phone, color: Colors.blue[900]),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Phone Number',
                          style: TextStyle(
                            color: Colors.blue[700],
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.phoneNumber,
                          style: TextStyle(
                            color: Colors.blue[900],
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Error Message
            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  border: Border.all(color: Colors.red[200]!, width: 1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: Colors.red[700], size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: TextStyle(
                          color: Colors.red[900],
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            if (_errorMessage != null) const SizedBox(height: 16),

            // Password Field
            TextFormField(
              controller: _passwordController,
              obscureText: !_showPassword,
              onChanged: (_) => setState(() {}),
              enabled: !_isLoading,
              decoration: InputDecoration(
                labelText: 'Password',
                hintText: 'Enter your password',
                prefixIcon: const Icon(Icons.lock),
                suffixIcon: IconButton(
                  icon: Icon(
                    _showPassword ? Icons.visibility : Icons.visibility_off,
                  ),
                  onPressed: () =>
                      setState(() => _showPassword = !_showPassword),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Confirm Password Field
            TextFormField(
              controller: _confirmPasswordController,
              obscureText: !_showConfirmPassword,
              enabled: !_isLoading,
              decoration: InputDecoration(
                labelText: 'Confirm Password',
                hintText: 'Confirm your password',
                prefixIcon: const Icon(Icons.lock),
                suffixIcon: IconButton(
                  icon: Icon(
                    _showConfirmPassword
                        ? Icons.visibility
                        : Icons.visibility_off,
                  ),
                  onPressed: () => setState(
                      () => _showConfirmPassword = !_showConfirmPassword),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Password Requirements
            if (_passwordController.text.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  border: Border.all(color: Colors.grey[300]!, width: 1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Password Requirements:',
                      style: Theme.of(context).textTheme.labelMedium,
                    ),
                    const SizedBox(height: 12),
                    _buildRequirement(
                      'At least 6 characters',
                      _passwordController.text.length >= 6,
                    ),
                    _buildRequirement(
                      'Uppercase letter (A-Z)',
                      RegExp(r'[A-Z]').hasMatch(_passwordController.text),
                    ),
                    _buildRequirement(
                      'Lowercase letter (a-z)',
                      RegExp(r'[a-z]').hasMatch(_passwordController.text),
                    ),
                    _buildRequirement(
                      'Number (0-9)',
                      RegExp(r'[0-9]').hasMatch(_passwordController.text),
                    ),
                    _buildRequirement(
                      'Passwords match',
                      _passwordController.text == _confirmPasswordController.text,
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 24),

            // Submit Button
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ||
                        !_validatePassword(_passwordController.text) ||
                        _passwordController.text !=
                            _confirmPasswordController.text
                    ? null
                    : _setupPassword,
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
                        'Complete Setup',
                        style: TextStyle(fontSize: 16),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build password requirement indicator
  Widget _buildRequirement(String text, bool isMet) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(
            isMet ? Icons.check_circle : Icons.radio_button_unchecked,
            size: 18,
            color: isMet ? Colors.green[600] : Colors.grey[400],
          ),
          const SizedBox(width: 10),
          Text(
            text,
            style: TextStyle(
              fontSize: 14,
              color: isMet ? Colors.green[700] : Colors.grey[600],
              fontWeight: isMet ? FontWeight.w500 : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}
