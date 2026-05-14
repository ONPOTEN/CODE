import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/firebase_auth_service.dart';
import '../services/auth_service.dart';
import '../services/auth_storage.dart';

/// Authentication Provider
/// Manages authentication state for multiple providers (Firebase + Laravel)
class AuthProvider extends ChangeNotifier {
  User? _user;
  String? _token;
  bool _isLoading = false;
  String? _errorMessage;
  String? _authMethod; // 'email', 'google', 'facebook', 'apple', 'phone'

  // Getters
  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get authMethod => _authMethod;
  bool get isAuthenticated => _user != null && _token != null;

  AuthProvider() {
    _initializeAuth();
  }

  /// Initialize authentication on app start
  Future<void> _initializeAuth() async {
    try {
      _isLoading = true;
      notifyListeners();

      // Check if user is already logged in
      final isLoggedIn = await AuthStorage.isLoggedIn();
      if (isLoggedIn) {
        // Try to restore user from storage
        await _restoreUserSession();
      } else {
        _isLoading = false;
        notifyListeners();
      }
    } catch (e) {
      print('AuthProvider - Init error: $e');
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Restore user session from storage
  Future<void> _restoreUserSession() async {
    try {
      final userId = await AuthStorage.getUserId();
      final token = await AuthStorage.getToken();
      final username = await AuthStorage.getUsername();
      final email = await AuthStorage.getEmail();
      final displayName = await AuthStorage.getDisplayName();

      if (userId != null && token != null) {
        _user = User(
          id: userId,
          username: username ?? '',
          email: email ?? '',
          displayName: displayName ?? username ?? '',
          role: 'user',
        );
        _token = token;
        print('AuthProvider - User session restored: ${_user?.username}');
      }
    } catch (e) {
      print('AuthProvider - Session restore error: $e');
      await AuthStorage.clearAuth();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Email/Password Methods
  /// Register with email and password
  Future<bool> registerWithEmail({
    required String email,
    required String password,
    required String displayName,
    String? username,
    String? hobby,
    String? company,
    String? location,
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final result = await FirebaseAuthService.registerWithEmail(
        email: email,
        password: password,
        displayName: displayName,
        username: username,
        hobby: hobby,
        company: company,
        location: location,
      );

      if (result['success']) {
        _user = result['user'];
        _token = result['token'];
        _authMethod = result['authMethod'];
        print('AuthProvider - Registration successful: ${_user?.username}');
        return true;
      } else {
        _errorMessage = result['message'];
        print('AuthProvider - Registration failed: $_errorMessage');
        return false;
      }
    } catch (e) {
      _errorMessage = 'Registration error: ${e.toString()}';
      print('AuthProvider - $_errorMessage');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Login with email and password
  Future<bool> loginWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      // Call Laravel backend directly using AuthService (wp_users)
      final result = await AuthService.login(
        username: email, // Can login with email
        password: password,
      );

      if (result['success']) {
        _user = result['user'];
        _token = result['token'];
        _authMethod = 'email'; // Direct database authentication
        print('AuthProvider - Email login successful: ${_user?.username}');
        return true;
      } else {
        _errorMessage = result['message'];
        print('AuthProvider - Email login failed: $_errorMessage');
        return false;
      }
    } catch (e) {
      _errorMessage = 'Login error: ${e.toString()}';
      print('AuthProvider - $_errorMessage');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Login with username/nickname and password
  Future<bool> loginWithNickname({
    required String nickname,
    required String password,
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      // Call Laravel backend directly using AuthService (wp_users)
      final result = await AuthService.login(
        username: nickname, // Can login with username
        password: password,
      );

      if (result['success']) {
        _user = result['user'];
        _token = result['token'];
        _authMethod = result['authMethod'];
        print('AuthProvider - Nickname login successful: ${_user?.username}');
        return true;
      } else {
        _errorMessage = result['message'];
        print('AuthProvider - Nickname login failed: $_errorMessage');
        return false;
      }
    } catch (e) {
      _errorMessage = 'Nickname login error: ${e.toString()}';
      print('AuthProvider - $_errorMessage');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Google Sign-In
  /// Sign in with Google
  Future<bool> signInWithGoogle() async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final result = await FirebaseAuthService.signInWithGoogle();

      if (result['success']) {
        _user = result['user'];
        _token = result['token'];
        _authMethod = result['authMethod'];
        print('AuthProvider - Google sign-in successful: ${_user?.username}');
        return true;
      } else {
        _errorMessage = result['message'];
        print('AuthProvider - Google sign-in failed: $_errorMessage');
        return false;
      }
    } catch (e) {
      _errorMessage = 'Google sign-in error: ${e.toString()}';
      print('AuthProvider - $_errorMessage');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Facebook Sign-In
  /// Sign in with Facebook
  Future<bool> signInWithFacebook() async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final result = await FirebaseAuthService.signInWithFacebook();

      if (result['success']) {
        _user = result['user'];
        _token = result['token'];
        _authMethod = result['authMethod'];
        print('AuthProvider - Facebook sign-in successful: ${_user?.username}');
        return true;
      } else {
        _errorMessage = result['message'];
        print('AuthProvider - Facebook sign-in failed: $_errorMessage');
        return false;
      }
    } catch (e) {
      _errorMessage = 'Facebook sign-in error: ${e.toString()}';
      print('AuthProvider - $_errorMessage');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Apple Sign-In
  /// Sign in with Apple
  Future<bool> signInWithApple() async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final result = await FirebaseAuthService.signInWithApple();

      if (result['success']) {
        _user = result['user'];
        _token = result['token'];
        _authMethod = result['authMethod'];
        print('AuthProvider - Apple sign-in successful: ${_user?.username}');
        return true;
      } else {
        _errorMessage = result['message'];
        print('AuthProvider - Apple sign-in failed: $_errorMessage');
        return false;
      }
    } catch (e) {
      _errorMessage = 'Apple sign-in error: ${e.toString()}';
      print('AuthProvider - $_errorMessage');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Phone Authentication
  /// Start phone number verification
  Future<String?> startPhoneVerification(String phoneNumber) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final result = await FirebaseAuthService.startPhoneVerification(phoneNumber);

      if (result['success']) {
        print('AuthProvider - Phone verification started');
        return result['verificationId'];
      } else {
        _errorMessage = result['message'];
        print('AuthProvider - Phone verification failed: $_errorMessage');
        return null;
      }
    } catch (e) {
      _errorMessage = 'Phone verification error: ${e.toString()}';
      print('AuthProvider - $_errorMessage');
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Complete phone verification
  Future<bool> completePhoneVerification({
    required String verificationId,
    required String smsCode,
    String? displayName, // Optional - not used by Firebase service
    String? phoneNumber,
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final result = await FirebaseAuthService.completePhoneVerification(
        verificationId: verificationId,
        smsCode: smsCode,
        phoneNumber: phoneNumber,
      );

      if (result['success']) {
        _user = result['user'];
        _token = result['token'];
        _authMethod = result['authMethod'];
        print('AuthProvider - Phone verification successful: ${_user?.username}');
        return true;
      } else {
        _errorMessage = result['message'];
        print('AuthProvider - Phone verification failed: $_errorMessage');
        return false;
      }
    } catch (e) {
      _errorMessage = 'Phone verification error: ${e.toString()}';
      print('AuthProvider - $_errorMessage');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Logout
  /// Logout user
  Future<bool> logout() async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final result = await FirebaseAuthService.logout();

      if (result['success']) {
        _user = null;
        _token = null;
        _authMethod = null;
        print('AuthProvider - Logout successful');
        return true;
      } else {
        _errorMessage = result['message'];
        print('AuthProvider - Logout failed: $_errorMessage');
        return false;
      }
    } catch (e) {
      _errorMessage = 'Logout error: ${e.toString()}';
      print('AuthProvider - $_errorMessage');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Clear error message
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  /// Login with phone number and password
  Future<bool> loginWithPhonePassword({
    required String phone,
    required String password,
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final result = await FirebaseAuthService.loginWithPhonePassword(
        phone: phone,
        password: password,
      );

      if (result['success']) {
        _user = result['user'];
        _token = result['token'];
        _authMethod = result['authMethod'];
        print('AuthProvider - Phone login successful: ${_user?.username}');
        return true;
      } else {
        _errorMessage = result['message'];
        print('AuthProvider - Phone login failed: $_errorMessage');
        return false;
      }
    } catch (e) {
      _errorMessage = 'Phone login error: ${e.toString()}';
      print('AuthProvider - $_errorMessage');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Setup phone password after SMS verification
  /// Creates Firebase account and registers with Laravel
  Future<bool> setupPhonePassword({
    required String phoneNumber,
    required String password,
    required String displayName,
    required String nickname,
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      print('[AuthProvider] Setting up phone password...');
      print('  - Phone: $phoneNumber');
      print('  - Display Name: $displayName');
      print('  - Nickname: $nickname');

      final result = await FirebaseAuthService.setupPhonePassword(
        phoneNumber: phoneNumber,
        password: password,
        displayName: displayName,
        nickname: nickname,
      );

      if (result['success']) {
        _user = result['user'];
        _token = result['token'];
        _authMethod = result['authMethod'];
        print('AuthProvider - Phone password setup successful: ${_user?.username}');
        return true;
      } else {
        _errorMessage = result['message'];
        print('AuthProvider - Phone password setup failed: $_errorMessage');
        return false;
      }
    } catch (e) {
      _errorMessage = 'Phone password setup error: ${e.toString()}';
      print('AuthProvider - $_errorMessage');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Reset password for phone authentication
  Future<bool> resetPasswordWithPhone({
    required String newPassword,
    required String idToken,
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      print('[AuthProvider] Resetting phone password...');

      final result = await FirebaseAuthService.resetPasswordWithPhone(
        newPassword: newPassword,
        idToken: idToken,
      );

      if (result['success']) {
        _user = result['user'];
        _token = result['token'];
        print('AuthProvider - Phone password reset successful');
        return true;
      } else {
        _errorMessage = result['message'];
        print('AuthProvider - Phone password reset failed: $_errorMessage');
        return false;
      }
    } catch (e) {
      _errorMessage = 'Password reset error: ${e.toString()}';
      print('AuthProvider - $_errorMessage');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
