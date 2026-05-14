import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/user.dart';
import 'api_config.dart';
import 'auth_storage.dart';

class AuthService {
  // Login method
  static Future<Map<String, dynamic>> login({
    required String username,
    required String password,
  }) async {
    try {
      print('AuthService - Login attempt for username: $username');

      final response = await http
          .post(
            Uri.parse(ApiConfig.getUrl(ApiConfig.loginEndpoint)),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({
              'username': username,
              'password': password,
            }),
          )
          .timeout(ApiConfig.timeout);

      print('AuthService - Login response status: ${response.statusCode}');
      print('AuthService - Login response body: ${response.body}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        // Log the raw user data from backend
        print('AuthService - Raw user data from backend: ${data['user']}');
        print('AuthService - User ID field in response: ${data['user']['id']}');

        // Save token and user data
        final token = data['token'] as String;
        final user = User.fromJson(data['user']);

        print('AuthService - Parsed User object:');
        print('  - ID: ${user.id}');
        print('  - Username: ${user.username}');
        print('  - Email: ${user.email}');
        print('  - Display Name: ${user.displayName}');

        await AuthStorage.saveToken(token);
        await AuthStorage.saveUserData(
          userId: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
        );

        print('AuthService - User data saved to storage with userId: ${user.id}');

        return {
          'success': true,
          'user': user,
          'token': token,
          'message': data['message'] ?? 'Login successful',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Login failed',
          'errors': data['errors'],
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
      };
    }
  }

  // Register method
  static Future<Map<String, dynamic>> register({
    required String username,
    required String email,
    required String password,
    required String passwordConfirmation,
    String? displayName,
    String? hobby,
    String? company,
    String? location,
  }) async {
    try {
      print('AuthService - Register attempt for username: $username, email: $email');

      final response = await http
          .post(
            Uri.parse(ApiConfig.getUrl(ApiConfig.registerEndpoint)),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({
              'username': username,
              'email': email,
              'password': password,
              'password_confirmation': passwordConfirmation,
              'display_name': displayName,
              'hobby': hobby,
              'company': company,
              'location': location,
            }),
          )
          .timeout(ApiConfig.timeout);

      print('AuthService - Register response status: ${response.statusCode}');
      print('AuthService - Register response body: ${response.body}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 201 || response.statusCode == 200) {
        // Log the raw user data from backend
        print('AuthService - Raw user data from backend: ${data['user']}');
        print('AuthService - User ID field in response: ${data['user']['id']}');

        // Save token and user data
        final token = data['token'] as String;
        final user = User.fromJson(data['user']);

        print('AuthService - Parsed User object:');
        print('  - ID: ${user.id}');
        print('  - Username: ${user.username}');
        print('  - Email: ${user.email}');
        print('  - Display Name: ${user.displayName}');

        await AuthStorage.saveToken(token);
        await AuthStorage.saveUserData(
          userId: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
        );

        print('AuthService - User data saved to storage with userId: ${user.id}');

        return {
          'success': true,
          'user': user,
          'token': token,
          'message': data['message'] ?? 'Registration successful',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Registration failed',
          'errors': data['errors'],
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
      };
    }
  }

  // Logout method
  static Future<Map<String, dynamic>> logout() async {
    try {
      final token = await AuthStorage.getToken();

      if (token != null) {
        final response = await http
            .post(
              Uri.parse(ApiConfig.getUrl(ApiConfig.logoutEndpoint)),
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer $token',
              },
            )
            .timeout(ApiConfig.timeout);

        // Clear local storage regardless of API response
        await AuthStorage.clearAuth();

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          return {
            'success': true,
            'message': data['message'] ?? 'Logout successful',
          };
        }
      }

      // Clear local storage even if no token exists
      await AuthStorage.clearAuth();

      return {
        'success': true,
        'message': 'Logout successful',
      };
    } catch (e) {
      // Clear local storage even on error
      await AuthStorage.clearAuth();

      return {
        'success': true,
        'message': 'Logged out locally',
      };
    }
  }

  // Get current user
  static Future<Map<String, dynamic>> getCurrentUser() async {
    try {
      final token = await AuthStorage.getToken();
      print('AuthService - Token: ${token != null ? "exists" : "null"}');

      if (token == null) {
        return {
          'success': false,
          'message': 'Not authenticated - No token found',
        };
      }

      final url = ApiConfig.getUrl(ApiConfig.userEndpoint);
      print('AuthService - Fetching user from: $url');

      final response = await http
          .get(
            Uri.parse(url),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(ApiConfig.timeout);

      print('AuthService - Response status: ${response.statusCode}');
      print('AuthService - Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        // Handle both direct user object and nested data object
        final userData = data['data'] ?? data;
        print('AuthService - User data: $userData');

        try {
          final user = User.fromJson(userData);

          return {
            'success': true,
            'user': user,
          };
        } catch (parseError) {
          print('AuthService - Parse error: $parseError');
          return {
            'success': false,
            'message': 'Error parsing user data: ${parseError.toString()}',
          };
        }
      } else if (response.statusCode == 401) {
        // Token expired or invalid
        await AuthStorage.clearAuth();
        return {
          'success': false,
          'message': 'Session expired. Please login again.',
        };
      } else {
        final data = jsonDecode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to get user data (${response.statusCode})',
        };
      }
    } catch (e) {
      print('AuthService - Error: $e');
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
      };
    }
  }

  // Check if user is authenticated
  static Future<bool> isAuthenticated() async {
    return await AuthStorage.isLoggedIn();
  }

  // Update user profile
  static Future<Map<String, dynamic>> updateProfile({
    required String displayName,
    String? email,
    String? hobby,
    String? company,
    String? occupation,
    String? mainOccupation,
    String? location,
    String? phone,
    String? profileVisibility,
    bool? emailPublic,
    bool? hobbyPublic,
    bool? companyPublic,
    bool? occupationPublic,
    bool? mainOccupationPublic,
    bool? locationPublic,
    bool? phonePublic,
    String? role, // Only admins can update this
  }) async {
    try {
      final token = await AuthStorage.getToken();

      if (token == null) {
        return {
          'success': false,
          'message': 'Not authenticated',
        };
      }

      final Map<String, dynamic> body = {
        'display_name': displayName,
        if (email != null) 'email': email,
        if (hobby != null) 'hobby': hobby,
        if (company != null) 'company': company,
        if (occupation != null) 'occupation': occupation,
        if (mainOccupation != null) 'main_occupation': mainOccupation,
        if (location != null) 'location': location,
        if (phone != null) 'phone': phone,
        if (profileVisibility != null) 'profile_visibility': profileVisibility,
        if (emailPublic != null) 'email_public': emailPublic,
        if (hobbyPublic != null) 'hobby_public': hobbyPublic,
        if (companyPublic != null) 'company_public': companyPublic,
        if (occupationPublic != null) 'occupation_public': occupationPublic,
        if (mainOccupationPublic != null) 'main_occupation_public': mainOccupationPublic,
        if (locationPublic != null) 'location_public': locationPublic,
        if (phonePublic != null) 'phone_public': phonePublic,
        if (role != null) 'role': role,
      };

      final response = await http
          .put(
            Uri.parse(ApiConfig.getUrl(ApiConfig.updateProfileEndpoint)),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode(body),
          )
          .timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        final user = User.fromJson(data['user'] ?? data);

        // Update local storage
        await AuthStorage.saveUserData(
          userId: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
        );

        return {
          'success': true,
          'user': user,
          'message': data['message'] ?? 'Profile updated successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to update profile',
          'errors': data['errors'],
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
      };
    }
  }

  // Upload avatar
  static Future<Map<String, dynamic>> uploadAvatar(dynamic file) async {
    try {
      final token = await AuthStorage.getToken();

      if (token == null) {
        return {
          'success': false,
          'message': 'Not authenticated',
        };
      }

      final uri = Uri.parse(ApiConfig.getUrl('profile/avatar'));
      final request = http.MultipartRequest('POST', uri);

      request.headers['Authorization'] = 'Bearer $token';
      request.headers['Accept'] = 'application/json';

      // Handle both File and XFile types
      if (file is http.MultipartFile) {
        request.files.add(file);
      } else {
        request.files.add(await http.MultipartFile.fromPath('avatar', file.path));
      }

      final streamedResponse = await request.send().timeout(ApiConfig.timeout);
      final response = await http.Response.fromStream(streamedResponse);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'avatar_url': data['avatar_url'] ?? data['avatar'],
          'message': data['message'] ?? 'Avatar uploaded successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to upload avatar',
          'errors': data['errors'],
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
      };
    }
  }

  // Change password
  static Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
    required String confirmPassword,
  }) async {
    try {
      final token = await AuthStorage.getToken();

      if (token == null) {
        return {
          'success': false,
          'message': 'Not authenticated',
        };
      }

      final response = await http
          .post(
            Uri.parse(ApiConfig.getUrl('profile/password')),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'current_password': currentPassword,
              'new_password': newPassword,
              'new_password_confirmation': confirmPassword,
            }),
          )
          .timeout(ApiConfig.timeout);

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Password changed successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to change password',
          'errors': data['errors'],
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
      };
    }
  }
}
