import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/notification.dart';
import 'api_config.dart';
import 'auth_storage.dart';

class NotificationService {
  static Future<Map<String, dynamic>> getNotificationCount() async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {'success': false, 'message': 'No auth token'};
      }

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/notifications/count')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'count': data['count'] ?? 0,
        };
      } else {
        return {'success': false, 'message': data['message'] ?? 'Failed to get count'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> getNotifications({int perPage = 50}) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {'success': false, 'message': 'No auth token'};
      }

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/notifications?per_page=$perPage')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        List<NotificationModel> notifications = [];
        if (data['data'] != null) {
          notifications = (data['data'] as List)
              .map((n) => NotificationModel.fromJson(n))
              .toList();
        }
        return {
          'success': true,
          'notifications': notifications,
        };
      } else {
        return {'success': false, 'message': data['message'] ?? 'Failed to fetch'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> markAsRead(int id) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {'success': false, 'message': 'No auth token'};
      }

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/notifications/$id/mark-read')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        return {'success': true};
      } else {
        final data = json.decode(response.body);
        return {'success': false, 'message': data['message'] ?? 'Failed to mark as read'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> markAllAsRead() async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {'success': false, 'message': 'No auth token'};
      }

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/notifications/mark-all-read')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        return {'success': true};
      } else {
        final data = json.decode(response.body);
        return {'success': false, 'message': data['message'] ?? 'Failed to mark all as read'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
}
