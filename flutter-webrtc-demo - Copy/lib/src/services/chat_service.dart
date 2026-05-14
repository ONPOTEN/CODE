import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/conversation.dart';
import 'auth_storage.dart';

class ChatService {
  static ChatService? _instance;
  final String apiBaseUrl;

  factory ChatService({String apiBaseUrl = 'http://localhost:8000/api/v1'}) {
    _instance ??= ChatService._internal(apiBaseUrl);
    return _instance!;
  }

  ChatService._internal(this.apiBaseUrl);

  /// Get authorization headers with token
  Future<Map<String, String>> _getHeaders() async {
    final token = await AuthStorage.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Get all conversations for current user
  Future<List<Conversation>> getConversations() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$apiBaseUrl/conversations'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> jsonData = json.decode(response.body);
        final conversations = jsonData
            .map((json) => Conversation.fromJson(json as Map<String, dynamic>))
            .toList();

        print('ChatService - Loaded ${conversations.length} conversations');
        return conversations;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized - please login');
      } else {
        throw Exception('Failed to load conversations: ${response.statusCode}');
      }
    } catch (e) {
      print('ChatService - Error loading conversations: $e');
      rethrow;
    }
  }

  /// Get or create conversation with a specific user
  /// Returns room name in format: "{host roomid} - {remote roomid}"
  Future<Map<String, dynamic>> getOrCreateConversation(int userId) async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$apiBaseUrl/conversations/with/$userId'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data =
            json.decode(response.body) as Map<String, dynamic>;

        print(
            'ChatService - Conversation room name: ${data['room_name']}');
        return data;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized - please login');
      } else {
        throw Exception(
            'Failed to create conversation: ${response.statusCode}');
      }
    } catch (e) {
      print('ChatService - Error creating conversation: $e');
      rethrow;
    }
  }

  /// Get messages for a conversation
  Future<Map<String, dynamic>> getMessages(int conversationId) async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$apiBaseUrl/conversations/$conversationId/messages'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data =
            json.decode(response.body) as Map<String, dynamic>;

        final messages = (data['messages'] as List<dynamic>)
            .map((json) =>
                ChatMessage.fromJson(json as Map<String, dynamic>))
            .toList();

        print('ChatService - Loaded ${messages.length} messages');

        return {
          'room_name': data['room_name'] as String? ?? '',
          'messages': messages,
        };
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized - please login');
      } else {
        throw Exception('Failed to load messages: ${response.statusCode}');
      }
    } catch (e) {
      print('ChatService - Error loading messages: $e');
      rethrow;
    }
  }

  /// Send a message in a conversation
  Future<ChatMessage> sendMessage(int conversationId, String message) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$apiBaseUrl/conversations/$conversationId/messages'),
        headers: headers,
        body: json.encode({'message': message}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final Map<String, dynamic> data =
            json.decode(response.body) as Map<String, dynamic>;
        final chatMessage = ChatMessage.fromJson(data);

        print('ChatService - Message sent successfully');
        return chatMessage;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized - please login');
      } else {
        throw Exception('Failed to send message: ${response.statusCode}');
      }
    } catch (e) {
      print('ChatService - Error sending message: $e');
      rethrow;
    }
  }

  /// Format time from ISO string to readable format (HH:MM or Today, Yesterday, etc.)
  static String formatTime(String isoDateString) {
    try {
      final dateTime = DateTime.parse(isoDateString);
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final yesterday = today.subtract(const Duration(days: 1));
      final messageDate = DateTime(dateTime.year, dateTime.month, dateTime.day);

      if (messageDate == today) {
        return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
      } else if (messageDate == yesterday) {
        return 'Yesterday';
      } else {
        return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
      }
    } catch (e) {
      return isoDateString;
    }
  }

  /// Generate video call room name from two user IDs
  /// Format: "{user1_id} - {user2_id}"
  static String generateVideoRoomName(
      int currentUserId, int otherUserId) {
    if (currentUserId < otherUserId) {
      return '$currentUserId - $otherUserId';
    } else {
      return '$otherUserId - $currentUserId';
    }
  }

  /// Extract room ID from conversation room name
  /// Format: "{host roomid} - {remote roomid}"
  /// Returns the combined room ID suitable for video calls
  static String extractRoomIdFromConversation(String roomName) {
    return roomName.replaceAll(' - ', '_');
  }
}
