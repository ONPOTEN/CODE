import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/friend.dart';
import '../models/user.dart';
import 'api_config.dart';
import 'auth_storage.dart';

class FriendService {
  // Get all friends (accepted)
  static Future<Map<String, dynamic>> getFriends() async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/friends')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        // Laravel returns User[] directly in 'data', not Friend[]
        List<User> friends = [];
        if (data['data'] != null) {
          friends = (data['data'] as List)
              .map((userJson) => User.fromJson(userJson))
              .toList();
        }

        return {
          'success': true,
          'friends': friends, // Return User[] instead of Friend[]
          'message': data['message'] ?? 'Friends retrieved successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch friends',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get pending friend requests (received)
  static Future<Map<String, dynamic>> getFriendRequests() async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/friends/pending')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        List<Friend> requests = [];
        if (data['data'] != null) {
          requests = (data['data'] as List)
              .map((requestJson) => Friend.fromJson(requestJson))
              .toList();
        }

        return {
          'success': true,
          'requests': requests,
          'message': data['message'] ?? 'Friend requests retrieved successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch friend requests',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Send friend request
  static Future<Map<String, dynamic>> sendFriendRequest(int userId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      print('FriendService - Sending friend request to userId: $userId');

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/friends/request/$userId')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('FriendService - Send request response status: ${response.statusCode}');
      print('FriendService - Send request response body: ${response.body}');

      final data = json.decode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          'friend': data['data'] != null ? Friend.fromJson(data['data']) : null,
          'message': data['message'] ?? 'Friend request sent successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to send friend request',
        };
      }
    } catch (e) {
      print('FriendService - Send request error: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Accept friend request
  static Future<Map<String, dynamic>> acceptFriendRequest(int userId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      print('FriendService - Accepting friend request from userId: $userId');

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/friends/accept/$userId')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('FriendService - Accept response status: ${response.statusCode}');
      print('FriendService - Accept response body: ${response.body}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'friend': data['data'] != null ? Friend.fromJson(data['data']) : null,
          'message': data['message'] ?? 'Friend request accepted',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to accept friend request',
        };
      }
    } catch (e) {
      print('FriendService - Accept request error: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Reject/decline friend request
  static Future<Map<String, dynamic>> rejectFriendRequest(int userId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      print('FriendService - Rejecting friend request from userId: $userId');

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/friends/reject/$userId')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('FriendService - Reject response status: ${response.statusCode}');
      print('FriendService - Reject response body: ${response.body}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Friend request rejected',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to reject friend request',
        };
      }
    } catch (e) {
      print('FriendService - Reject request error: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Unfriend (remove friend) - userId parameter is the friend's user ID
  static Future<Map<String, dynamic>> unfriend(int friendUserId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      print('FriendService - Unfriending userId: $friendUserId');

      final response = await http.delete(
        Uri.parse(ApiConfig.getUrl('/friends/unfriend/$friendUserId')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('FriendService - Unfriend response status: ${response.statusCode}');
      print('FriendService - Unfriend response body: ${response.body}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Friend removed successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to remove friend',
        };
      }
    } catch (e) {
      print('FriendService - Unfriend error: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Search users (to find people to add as friends)
  static Future<Map<String, dynamic>> searchUsers(String query) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      print('FriendService - Searching users with query: $query');

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/users/search?q=$query')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('FriendService - Search response status: ${response.statusCode}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        List<User> users = [];
        if (data['data'] != null) {
          users = (data['data'] as List)
              .map((userJson) => User.fromJson(userJson))
              .toList();
        }

        print('FriendService - Found ${users.length} users');

        return {
          'success': true,
          'users': users,
          'message': data['message'] ?? 'Users found',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to search users',
        };
      }
    } catch (e) {
      print('FriendService - Search error: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get friendship status with a specific user
  static Future<Map<String, dynamic>> getFriendshipStatus(int userId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      print('FriendService - Getting friendship status for userId: $userId');

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/friends/status/$userId')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('FriendService - Status response status: ${response.statusCode}');
      print('FriendService - Status response body: ${response.body}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'status': data['status'],
          'friendship': data['friendship'],
          'message': data['message'] ?? 'Status retrieved successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to get friendship status',
        };
      }
    } catch (e) {
      print('FriendService - Status error: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }
}
