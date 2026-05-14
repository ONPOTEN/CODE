import 'package:firebase_auth/firebase_auth.dart' as firebase_auth_pkg;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/user.dart';
import 'auth_storage.dart';
import 'api_config.dart';

/// Firebase Authentication Service
/// Handles authentication with multiple providers: Email, Google, Facebook, Apple, Phone
class FirebaseAuthService {
  static final firebase_auth_pkg.FirebaseAuth _firebaseAuth = firebase_auth_pkg.FirebaseAuth.instance;
  static final GoogleSignIn _googleSignIn = GoogleSignIn();
  static final FacebookAuth _facebookAuth = FacebookAuth.instance;

  // Email/Password Authentication
  /// Register with email and password
  static Future<Map<String, dynamic>> registerWithEmail({
    required String email,
    required String password,
    required String displayName,
    String? username,
    String? hobby,
    String? company,
    String? location,
  }) async {
    try {
      print('FirebaseAuthService - Register with email: $email');

      // Create Firebase user
      final userCredential = await _firebaseAuth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      print('FirebaseAuthService - Firebase user created: ${userCredential.user?.uid}');

      // Update Firebase profile
      await userCredential.user?.updateDisplayName(displayName);
      await userCredential.user?.updatePhotoURL('');

      // Get Firebase ID token
      final token = await userCredential.user?.getIdToken();

      // Register user in Laravel backend
      final backendResult = await _registerInBackend(
        firebaseUid: userCredential.user!.uid,
        email: email,
        displayName: displayName,
        username: username ?? displayName.replaceAll(' ', '_'),
        hobby: hobby,
        company: company,
        location: location,
        firebaseToken: token,
      );

      if (!backendResult['success']) {
        // Delete Firebase user if backend registration fails
        await userCredential.user?.delete();
        return backendResult;
      }

      // Save to local storage
      await AuthStorage.saveToken(backendResult['token']);
      await AuthStorage.saveUserData(
        userId: backendResult['user'].id,
        username: backendResult['user'].username,
        email: email,
        displayName: displayName,
      );

      return {
        'success': true,
        'user': backendResult['user'],
        'token': backendResult['token'],
        'authMethod': 'email',
        'message': 'Registration successful',
      };
    } on firebase_auth_pkg.FirebaseAuthException catch (e) {
      print('FirebaseAuthService - Firebase error: ${e.code}');
      return {
        'success': false,
        'message': _getFirebaseErrorMessage(e.code),
        'error': e.code,
      };
    } catch (e) {
      print('FirebaseAuthService - Error: $e');
      return {
        'success': false,
        'message': 'Registration failed: ${e.toString()}',
      };
    }
  }

  /// Login with email and password
  static Future<Map<String, dynamic>> loginWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      print('FirebaseAuthService - Login with email: $email');

      final userCredential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      final token = await userCredential.user?.getIdToken();

      // Authenticate with Laravel backend
      final backendResult = await _authenticateWithBackend(
        firebaseUid: userCredential.user!.uid,
        email: email,
        displayName: userCredential.user?.displayName,
        firebaseToken: token,
      );

      if (backendResult['success']) {
        await AuthStorage.saveToken(backendResult['token']);
        await AuthStorage.saveUserData(
          userId: backendResult['user'].id,
          username: backendResult['user'].username,
          email: email,
          displayName: backendResult['user'].displayName,
        );
      }

      return {
        'success': backendResult['success'],
        'user': backendResult['user'],
        'token': backendResult['token'],
        'authMethod': 'email',
        'message': backendResult['message'],
      };
    } on firebase_auth_pkg.FirebaseAuthException catch (e) {
      print('FirebaseAuthService - Firebase error: ${e.code}');
      return {
        'success': false,
        'message': _getFirebaseErrorMessage(e.code),
        'error': e.code,
      };
    } catch (e) {
      print('FirebaseAuthService - Error: $e');
      return {
        'success': false,
        'message': 'Login failed: ${e.toString()}',
      };
    }
  }

  /// Login with nickname and password
  static Future<Map<String, dynamic>> loginWithNickname({
    required String nickname,
    required String password,
  }) async {
    try {
      print('FirebaseAuthService - Login with nickname: $nickname');

      // Fetch user email from Laravel
      final userResponse = await http.get(
        Uri.parse(ApiConfig.getUrl('/users/by-nickname/$nickname')),
        headers: {
          'Accept': 'application/json',
        },
      ).timeout(ApiConfig.timeout);

      if (userResponse.statusCode != 200) {
        return {
          'success': false,
          'message': 'User not found',
        };
      }

      final userData = jsonDecode(userResponse.body);
      final email = userData['user_email'] as String;

      // Sign in with Firebase using email
      final userCredential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      final token = await userCredential.user?.getIdToken();

      // Authenticate with Laravel backend
      final backendResult = await _authenticateWithBackend(
        firebaseUid: userCredential.user!.uid,
        email: email,
        displayName: userCredential.user?.displayName,
        firebaseToken: token,
        authMethod: 'nickname',
      );

      if (backendResult['success']) {
        await AuthStorage.saveToken(backendResult['token']);
        await AuthStorage.saveUserData(
          userId: backendResult['user'].id,
          username: backendResult['user'].username,
          email: email,
          displayName: backendResult['user'].displayName,
        );
      }

      return {
        'success': backendResult['success'],
        'user': backendResult['user'],
        'token': backendResult['token'],
        'authMethod': 'nickname',
        'message': backendResult['message'],
      };
    } on firebase_auth_pkg.FirebaseAuthException catch (e) {
      print('FirebaseAuthService - Firebase error: ${e.code}');
      return {
        'success': false,
        'message': _getFirebaseErrorMessage(e.code),
        'error': e.code,
      };
    } catch (e) {
      print('FirebaseAuthService - Error: $e');
      return {
        'success': false,
        'message': 'Login failed: ${e.toString()}',
      };
    }
  }

  /// Login with phone number and password
  static Future<Map<String, dynamic>> loginWithPhonePassword({
    required String phone,
    required String password,
  }) async {
    try {
      print('FirebaseAuthService - Login with phone: $phone');

      // Normalize phone number: add +84 prefix if not present (Vietnam)
      String normalizedPhone = phone.trim();
      if (!normalizedPhone.startsWith('+')) {
        // If it's just digits, assume it's Vietnamese and add +84
        if (RegExp(r'^\d+$').hasMatch(normalizedPhone)) {
          // Remove leading 0 if present (Vietnamese phone format)
          if (normalizedPhone.startsWith('0')) {
            normalizedPhone = normalizedPhone.substring(1);
          }
          normalizedPhone = '+84$normalizedPhone';
          print('FirebaseAuthService - Normalized phone: $phone → $normalizedPhone');
        }
      }

      // Fetch user by phone from Laravel using query parameter (not path parameter)
      // Query parameter is preferred for special characters like +
      final uri = Uri.parse(ApiConfig.getUrl('/users/by-phone'))
          .replace(queryParameters: {'phone': normalizedPhone});

      print('FirebaseAuthService - Looking up user by phone at URL: $uri');

      final userResponse = await http.get(
        uri,
        headers: {
          'Accept': 'application/json',
        },
      ).timeout(ApiConfig.timeout);

      print('FirebaseAuthService - Phone lookup response status: ${userResponse.statusCode}');

      if (userResponse.statusCode != 200) {
        print('FirebaseAuthService - Phone lookup failed: ${userResponse.body}');
        return {
          'success': false,
          'message': 'Phone number not found. Please verify your phone first.',
        };
      }

      final userData = jsonDecode(userResponse.body);
      print('FirebaseAuthService - User found by phone: $userData');

      final username = userData['user_login'] as String?;

      if (username == null || username.isEmpty) {
        return {
          'success': false,
          'message': 'User account not properly configured (missing username)',
        };
      }

      print('FirebaseAuthService - Username extracted: $username');

      // Now authenticate with Laravel backend using the username we got from DB
      // This uses the traditional /auth/login endpoint with username + password
      print('FirebaseAuthService - Authenticating with Laravel backend using username: $username');

      final loginUri = Uri.parse(ApiConfig.getUrl('/auth/login'));
      print('FirebaseAuthService - Calling: POST $loginUri');
      print('FirebaseAuthService - Body: { username: $username, password_length: ${password.length} }');

      final loginResponse = await http.post(
        loginUri,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      ).timeout(ApiConfig.timeout);

      print('FirebaseAuthService - Login response status: ${loginResponse.statusCode}');

      if (loginResponse.statusCode != 200) {
        final errorData = jsonDecode(loginResponse.body);
        print('FirebaseAuthService - Login failed: $errorData');
        return {
          'success': false,
          'message': errorData['message'] ?? 'Login failed with incorrect credentials',
          'errors': errorData['errors'],
        };
      }

      final loginData = jsonDecode(loginResponse.body);
      print('FirebaseAuthService - Login successful with user: ${loginData['user']}');

      // Save token and user data
      await AuthStorage.saveToken(loginData['token']);
      await AuthStorage.saveUserData(
        userId: loginData['user']['id'],
        username: loginData['user']['username'],
        email: loginData['user']['email'],
        displayName: loginData['user']['display_name'],
      );

      return {
        'success': true,
        'user': User.fromJson(loginData['user']),
        'token': loginData['token'],
        'authMethod': 'phone',
        'message': loginData['message'] ?? 'Login successful',
      };
    } on firebase_auth_pkg.FirebaseAuthException catch (e) {
      print('FirebaseAuthService - Firebase error: ${e.code}');
      return {
        'success': false,
        'message': _getFirebaseErrorMessage(e.code),
        'error': e.code,
      };
    } catch (e) {
      print('FirebaseAuthService - Error: $e');
      return {
        'success': false,
        'message': 'Login failed: ${e.toString()}',
      };
    }
  }

  // Google Sign-In
  /// Sign in with Google
  static Future<Map<String, dynamic>> signInWithGoogle() async {
    try {
      print('FirebaseAuthService - Starting Google sign-in');

      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        print('FirebaseAuthService - Google sign-in cancelled');
        return {
          'success': false,
          'message': 'Google sign-in cancelled',
        };
      }

      print('FirebaseAuthService - Google user: ${googleUser.email}');

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      final credential = firebase_auth_pkg.GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final userCredential = await _firebaseAuth.signInWithCredential(credential);
      final token = await userCredential.user?.getIdToken();

      // Authenticate with Laravel backend
      final backendResult = await _authenticateWithBackend(
        firebaseUid: userCredential.user!.uid,
        email: userCredential.user!.email!,
        displayName: userCredential.user?.displayName,
        firebaseToken: token,
        authMethod: 'google',
      );

      if (backendResult['success']) {
        await AuthStorage.saveToken(backendResult['token']);
        await AuthStorage.saveUserData(
          userId: backendResult['user'].id,
          username: backendResult['user'].username,
          email: backendResult['user'].email,
          displayName: backendResult['user'].displayName,
        );
      }

      return {
        'success': backendResult['success'],
        'user': backendResult['user'],
        'token': backendResult['token'],
        'authMethod': 'google',
        'message': backendResult['message'],
      };
    } catch (e) {
      print('FirebaseAuthService - Google sign-in error: $e');
      return {
        'success': false,
        'message': 'Google sign-in failed: ${e.toString()}',
      };
    }
  }

  // Facebook Sign-In
  /// Sign in with Facebook
  static Future<Map<String, dynamic>> signInWithFacebook() async {
    try {
      print('FirebaseAuthService - Starting Facebook sign-in');

      final LoginResult result = await _facebookAuth.login();

      if (result.status == LoginStatus.cancelled) {
        print('FirebaseAuthService - Facebook login cancelled');
        return {
          'success': false,
          'message': 'Facebook login cancelled',
        };
      }

      if (result.status == LoginStatus.failed) {
        print('FirebaseAuthService - Facebook login failed: ${result.message}');
        return {
          'success': false,
          'message': 'Facebook login failed: ${result.message}',
        };
      }

      final AccessToken accessToken = result.accessToken!;
      print('FirebaseAuthService - Facebook token: ${accessToken.token}');

      final credential = firebase_auth_pkg.FacebookAuthProvider.credential(accessToken.token);
      final userCredential = await _firebaseAuth.signInWithCredential(credential);
      final token = await userCredential.user?.getIdToken();

      print('FirebaseAuthService - Facebook user: ${userCredential.user?.email}');

      // Get Facebook user data
      final userData = await _facebookAuth.getUserData();
      final displayName = userData['name'] ?? userCredential.user?.displayName ?? 'Facebook User';

      // Authenticate with Laravel backend
      final backendResult = await _authenticateWithBackend(
        firebaseUid: userCredential.user!.uid,
        email: userCredential.user!.email!,
        displayName: displayName,
        firebaseToken: token,
        authMethod: 'facebook',
      );

      if (backendResult['success']) {
        await AuthStorage.saveToken(backendResult['token']);
        await AuthStorage.saveUserData(
          userId: backendResult['user'].id,
          username: backendResult['user'].username,
          email: backendResult['user'].email,
          displayName: backendResult['user'].displayName,
        );
      }

      return {
        'success': backendResult['success'],
        'user': backendResult['user'],
        'token': backendResult['token'],
        'authMethod': 'facebook',
        'message': backendResult['message'],
      };
    } catch (e) {
      print('FirebaseAuthService - Facebook sign-in error: $e');
      return {
        'success': false,
        'message': 'Facebook sign-in failed: ${e.toString()}',
      };
    }
  }

  // Apple Sign-In
  /// Sign in with Apple
  static Future<Map<String, dynamic>> signInWithApple() async {
    try {
      print('FirebaseAuthService - Starting Apple sign-in');

      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      print('FirebaseAuthService - Apple credential received');

      final oAuthCredential = firebase_auth_pkg.OAuthProvider('apple.com').credential(
        idToken: credential.identityToken,
        accessToken: credential.authorizationCode,
      );

      final userCredential = await _firebaseAuth.signInWithCredential(oAuthCredential);
      final token = await userCredential.user?.getIdToken();

      final displayName = credential.givenName != null && credential.familyName != null
          ? '${credential.givenName} ${credential.familyName}'
          : credential.givenName ?? userCredential.user?.displayName ?? 'Apple User';

      print('FirebaseAuthService - Apple user: ${userCredential.user?.email}');

      // Authenticate with Laravel backend
      final backendResult = await _authenticateWithBackend(
        firebaseUid: userCredential.user!.uid,
        email: userCredential.user!.email!,
        displayName: displayName,
        firebaseToken: token,
        authMethod: 'apple',
      );

      if (backendResult['success']) {
        await AuthStorage.saveToken(backendResult['token']);
        await AuthStorage.saveUserData(
          userId: backendResult['user'].id,
          username: backendResult['user'].username,
          email: backendResult['user'].email,
          displayName: backendResult['user'].displayName,
        );
      }

      return {
        'success': backendResult['success'],
        'user': backendResult['user'],
        'token': backendResult['token'],
        'authMethod': 'apple',
        'message': backendResult['message'],
      };
    } catch (e) {
      print('FirebaseAuthService - Apple sign-in error: $e');
      return {
        'success': false,
        'message': 'Apple sign-in failed: ${e.toString()}',
      };
    }
  }

  // Phone Authentication
  /// Start phone number verification
  static Future<Map<String, dynamic>> startPhoneVerification(String phoneNumber) async {
    try {
      print('FirebaseAuthService - Starting phone verification for: $phoneNumber');

      late String verificationId;

      await _firebaseAuth.verifyPhoneNumber(
        phoneNumber: phoneNumber,
        timeout: const Duration(seconds: 60),
        verificationCompleted: (firebase_auth_pkg.PhoneAuthCredential credential) async {
          print('FirebaseAuthService - Auto-verification completed');
          final userCredential = await _firebaseAuth.signInWithCredential(credential);
          print('FirebaseAuthService - Auto sign-in successful: ${userCredential.user?.uid}');
        },
        verificationFailed: (firebase_auth_pkg.FirebaseAuthException e) {
          print('FirebaseAuthService - Phone verification failed: ${e.code}');
        },
        codeSent: (String vId, int? resendToken) {
          print('FirebaseAuthService - Verification code sent');
          verificationId = vId;
        },
        codeAutoRetrievalTimeout: (String vId) {
          print('FirebaseAuthService - Code auto-retrieval timeout');
          verificationId = vId;
        },
      );

      return {
        'success': true,
        'message': 'Verification code sent',
        'verificationId': verificationId,
      };
    } catch (e) {
      print('FirebaseAuthService - Phone verification error: $e');
      return {
        'success': false,
        'message': 'Phone verification failed: ${e.toString()}',
      };
    }
  }

  /// Complete phone verification with code
  static Future<Map<String, dynamic>> completePhoneVerification({
    required String verificationId,
    required String smsCode,
    String? phoneNumber,
  }) async {
    try {
      print('FirebaseAuthService - Verifying SMS code');

      final credential = firebase_auth_pkg.PhoneAuthProvider.credential(
        verificationId: verificationId,
        smsCode: smsCode,
      );

      final userCredential = await _firebaseAuth.signInWithCredential(credential);

      print('FirebaseAuthService - Phone user: ${userCredential.user?.uid}');

      // For first-time phone users, just verify SMS code
      // Password setup and backend auth happens after password setup screen
      return {
        'success': true,
        'message': 'SMS verification successful',
        'firebaseUid': userCredential.user!.uid,
        'phoneNumber': phoneNumber,
      };
    } on firebase_auth_pkg.FirebaseAuthException catch (e) {
      print('FirebaseAuthService - Phone verification error: ${e.code}');
      return {
        'success': false,
        'message': _getFirebaseErrorMessage(e.code),
        'error': e.code,
      };
    } catch (e) {
      print('FirebaseAuthService - Error: $e');
      return {
        'success': false,
        'message': 'Phone verification failed: ${e.toString()}',
      };
    }
  }


  /// Setup phone password after SMS verification
  /// Creates Firebase account with phone + password
  /// Then registers user with Laravel backend
  static Future<Map<String, dynamic>> setupPhonePassword({
    required String phoneNumber,
    required String password,
    required String displayName,
    required String nickname,
  }) async {
    try {
      print('[FirebaseAuthService] Starting phone password setup...');
      print('  - Phone: $phoneNumber');
      print('  - Display Name: $displayName');
      print('  - Nickname: $nickname');

      final currentUser = _firebaseAuth.currentUser;
      if (currentUser == null) {
        return {
          'success': false,
          'message': 'User not authenticated. Please verify phone first.',
        };
      }

      print('[FirebaseAuthService] Current user UID: ${currentUser.uid}');

      final tempEmail = 'phone-${DateTime.now().millisecondsSinceEpoch}@phone-auth.local';
      print('[FirebaseAuthService] Generated temp email: $tempEmail');

      try {
        // Update password (email was already set when user created account via SMS)
        await currentUser.updatePassword(password);
        print('[FirebaseAuthService] Firebase account updated with password');
      } catch (e) {
        print('[FirebaseAuthService] Firebase account update error: $e');
        return {
          'success': false,
          'message': 'Failed to set password: ${e.toString()}',
        };
      }

      final idToken = await currentUser.getIdToken();
      print('[FirebaseAuthService] Got Firebase ID token');

      print('[FirebaseAuthService] Registering with Laravel backend...');

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/auth/firebase-register')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: json.encode({
          'firebase_uid': currentUser.uid,
          'email': tempEmail,
          'display_name': displayName,
          'nickname': nickname,
          'phone': phoneNumber,
          'auth_method': 'phone-password',
          'firebase_token': idToken,
        }),
      ).timeout(ApiConfig.timeout);

      print('[FirebaseAuthService] Laravel response status: ${response.statusCode}');
      final responseData = json.decode(response.body);

      if (response.statusCode == 201 || response.statusCode == 200) {
        print('[FirebaseAuthService] User registered with Laravel successfully');

        final userData = responseData['user'] ?? {};

        // Parse user ID as integer
        int userId = 1; // Default ID
        try {
          final id = userData['id'];
          userId = id is int ? id : int.parse(id.toString());
        } catch (e) {
          print('[FirebaseAuthService] Could not parse user ID: $e');
        }

        final user = User(
          id: userId,
          username: userData['nickname'] ?? nickname,
          email: tempEmail,
          displayName: displayName,
          role: userData['role'] ?? 'user',
        );

        // Save authentication data
        await AuthStorage.saveToken(responseData['token'] ?? '');
        await AuthStorage.saveUserData(
          userId: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
        );

        print('[FirebaseAuthService] Phone password setup successful');

        return {
          'success': true,
          'message': 'Account created successfully',
          'user': user,
          'token': responseData['token'] ?? '',
          'authMethod': 'phone-password',
        };
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to register with backend',
        };
      }
    } catch (e) {
      print('[FirebaseAuthService] Setup phone password error: $e');
      return {
        'success': false,
        'message': 'Setup failed: ${e.toString()}',
      };
    }
  }

  /// Setup phone password by phone number (after SMS verification)
  /// Called from password setup screen after user has been verified via SMS
  /// Updates Laravel backend with password setup
  static Future<Map<String, dynamic>> setupPhonePasswordByPhone({
    required String phoneNumber,
    required String password,
    required String firebaseUid,
  }) async {
    try {
      print('[FirebaseAuthService] Starting phone password setup by phone...');
      print('  - Phone: $phoneNumber');
      print('  - Firebase UID: $firebaseUid');

      final tempEmail = 'phone_$firebaseUid@phone-auth.local';
      print('[FirebaseAuthService] Generated temp email: $tempEmail');

      // Call Laravel backend to setup password
      print('[FirebaseAuthService] Calling Laravel /auth/setup-password-by-phone...');

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/auth/setup-password-by-phone')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: json.encode({
          'phone': phoneNumber,
          'new_password': password,
          'firebase_uid': firebaseUid,
        }),
      ).timeout(ApiConfig.timeout);

      print('[FirebaseAuthService] Laravel response status: ${response.statusCode}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = json.decode(response.body);
        print('[FirebaseAuthService] ✅ Laravel password setup successful');

        // Save token if provided
        if (responseData['token'] != null) {
          await AuthStorage.saveToken(responseData['token']);
          print('[FirebaseAuthService] ✅ Token saved');
        }

        return {
          'success': true,
          'message': responseData['message'] ?? 'Password setup successful',
          'token': responseData['token'],
          'tempEmail': tempEmail,
        };
      } else {
        final responseData = json.decode(response.body);
        print('[FirebaseAuthService] ❌ Laravel password setup failed: ${response.statusCode}');
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to setup password in backend',
        };
      }
    } catch (e) {
      print('[FirebaseAuthService] ❌ Phone password setup error: $e');
      return {
        'success': false,
        'message': 'Password setup failed: ${e.toString()}',
      };
    }
  }

  /// Reset password for phone authentication (no current password needed)
  static Future<Map<String, dynamic>> resetPasswordWithPhone({
    required String newPassword,
    required String idToken,
  }) async {
    try {
      print('[FirebaseAuthService] Resetting phone password');

      final currentUser = _firebaseAuth.currentUser;
      if (currentUser == null) {
        return {
          'success': false,
          'message': 'User not authenticated',
        };
      }

      // Update password in Firebase
      await currentUser.updatePassword(newPassword);
      print('[FirebaseAuthService] Firebase password updated');

      // Try to update Laravel backend
      try {
        final token = await AuthStorage.getToken();
        if (token != null) {
          print('[FirebaseAuthService] Got auth token for Laravel update');
          
          final response = await http.put(
            Uri.parse(ApiConfig.getUrl('/profile/password-reset')),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: json.encode({
              'password': newPassword,
              'password_confirmation': newPassword,
            }),
          ).timeout(ApiConfig.timeout);

          print('[FirebaseAuthService] Laravel response status: ${response.statusCode}');
          final responseData = json.decode(response.body);

          if (response.statusCode == 200) {
            print('[FirebaseAuthService] Laravel password updated successfully');
          } else {
            print('[FirebaseAuthService] Laravel update failed: ${responseData['message']}');
          }
        } else {
          print('[FirebaseAuthService] No auth token available for Laravel update');
        }
      } catch (e) {
        print('[FirebaseAuthService] Laravel update warning: $e');
        // Continue - Firebase password is updated
      }

      print('[FirebaseAuthService] Phone password reset complete');

      return {
        'success': true,
        'message': 'Password reset successfully',
        'user': null,
        'token': null,
      };
    } catch (e) {
      print('[FirebaseAuthService] Password reset error: $e');
      return {
        'success': false,
        'message': 'Password reset failed: ${e.toString()}',
      };
    }
  }

  // Logout
  /// Sign out from all providers
  static Future<Map<String, dynamic>> logout() async {
    try {
      print('FirebaseAuthService - Logging out');

      // Sign out from Firebase
      await _firebaseAuth.signOut();

      // Sign out from Google if signed in with Google
      await _googleSignIn.signOut();

      // Sign out from Facebook
      await _facebookAuth.logOut();

      // Clear local storage
      await AuthStorage.clearAuth();

      print('FirebaseAuthService - Logout successful');

      return {
        'success': true,
        'message': 'Logout successful',
      };
    } catch (e) {
      print('FirebaseAuthService - Logout error: $e');
      return {
        'success': false,
        'message': 'Logout failed: ${e.toString()}',
      };
    }
  }

  // Get current user
  /// Get current authenticated user
  static firebase_auth_pkg.User? getCurrentUser() {
    return _firebaseAuth.currentUser;
  }

  /// Check if user is authenticated
  static Future<bool> isAuthenticated() async {
    return _firebaseAuth.currentUser != null && await AuthStorage.isLoggedIn();
  }

  // Helper methods
  /// Register user in Laravel backend
  static Future<Map<String, dynamic>> _registerInBackend({
    required String firebaseUid,
    required String email,
    required String displayName,
    required String username,
    String? hobby,
    String? company,
    String? location,
    String? firebaseToken,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse(ApiConfig.getUrl('/api/auth/firebase-register')),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({
              'firebase_uid': firebaseUid,
              'email': email,
              'username': username,
              'display_name': displayName,
              'hobby': hobby,
              'company': company,
              'location': location,
              'firebase_token': firebaseToken,
            }),
          )
          .timeout(ApiConfig.timeout);

      print('FirebaseAuthService - Backend register response: ${response.statusCode}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 201 || response.statusCode == 200) {
        return {
          'success': true,
          'user': User.fromJson(data['user']),
          'token': data['token'],
          'message': data['message'] ?? 'Registration successful',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Backend registration failed',
          'errors': data['errors'],
        };
      }
    } catch (e) {
      print('FirebaseAuthService - Backend register error: $e');
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
      };
    }
  }

  /// Authenticate user with Laravel backend
  static Future<Map<String, dynamic>> _authenticateWithBackend({
    required String firebaseUid,
    required String email,
    String? displayName,
    String? firebaseToken,
    String? authMethod,
    String? phoneNumber,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse(ApiConfig.getUrl('/api/auth/firebase-login')),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({
              'firebase_uid': firebaseUid,
              'email': email,
              'display_name': displayName,
              'auth_method': authMethod,
              'phone_number': phoneNumber,
              'firebase_token': firebaseToken,
            }),
          )
          .timeout(ApiConfig.timeout);

      print('FirebaseAuthService - Backend login response: ${response.statusCode}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'user': User.fromJson(data['user']),
          'token': data['token'],
          'message': data['message'] ?? 'Login successful',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Backend authentication failed',
          'errors': data['errors'],
        };
      }
    } catch (e) {
      print('FirebaseAuthService - Backend login error: $e');
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
      };
    }
  }

  /// Convert Firebase error codes to user-friendly messages
  static String _getFirebaseErrorMessage(String code) {
    switch (code) {
      case 'user-not-found':
        return 'User not found';
      case 'wrong-password':
        return 'Wrong password';
      case 'invalid-email':
        return 'Invalid email address';
      case 'user-disabled':
        return 'User account has been disabled';
      case 'email-already-in-use':
        return 'Email already in use';
      case 'weak-password':
        return 'Password is too weak';
      case 'operation-not-allowed':
        return 'Operation not allowed';
      case 'too-many-requests':
        return 'Too many attempts. Please try again later';
      default:
        return 'Authentication failed: $code';
    }
  }
}
