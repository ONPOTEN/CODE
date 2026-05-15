import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/conversation.dart';
import '../models/message.dart';
import 'api_config.dart';
import 'auth_storage.dart';

class MessageService {
  // Get all conversations for the current user
  static Future<Map<String, dynamic>> getConversations() async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      print('MessageService - Fetching conversations');

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/conversations')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('MessageService - Conversations response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('MessageService - Conversations data: $data');

        List<Conversation> conversations = [];
        // Laravel returns array directly, not wrapped in 'data'
        if (data is List) {
          conversations = data
              .map((conv) => Conversation.fromJson(conv))
              .toList();
        }

        print('MessageService - Parsed ${conversations.length} conversations');

        return {
          'success': true,
          'conversations': conversations,
          'message': 'Conversations retrieved successfully',
        };
      } else {
        final data = json.decode(response.body);
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch conversations',
        };
      }
    } catch (e) {
      print('MessageService - Error fetching conversations: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get messages for a conversation
  static Future<Map<String, dynamic>> getMessages(int conversationId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      print('MessageService - Fetching messages for conversation: $conversationId');

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/conversations/$conversationId/messages')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('MessageService - Messages response status: ${response.statusCode}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        print('MessageService - Messages data: $data');

        List<Message> messages = [];
        String? roomName;

        if (data['messages'] != null) {
          try {
            final messagesList = data['messages'] as List;
            print('MessageService - Parsing ${messagesList.length} messages');

            for (var i = 0; i < messagesList.length; i++) {
              try {
                final msg = messagesList[i];
                print('MessageService - Parsing message $i: $msg');
                messages.add(Message.fromJson(msg));
              } catch (e, stackTrace) {
                print('MessageService - Error parsing message $i: $e');
                print('MessageService - Message data: ${messagesList[i]}');
                print('MessageService - Stack trace: $stackTrace');
                // Continue parsing other messages
              }
            }
          } catch (e, stackTrace) {
            print('MessageService - Error processing messages list: $e');
            print('MessageService - Stack trace: $stackTrace');
          }
        }

        if (data['room_name'] != null) {
          roomName = data['room_name'] as String;
        }

        print('MessageService - Parsed ${messages.length} messages for room: $roomName');

        return {
          'success': true,
          'messages': messages,
          'room_name': roomName,
          'message': 'Messages retrieved successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch messages',
        };
      }
    } catch (e) {
      print('MessageService - Error fetching messages: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Send a message
  static Future<Map<String, dynamic>> sendMessage({
    required int conversationId,
    required String message,
    int? replyToMessageId,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      print('MessageService - Sending message to conversation: $conversationId');

      final body = {
        'message': message,
        if (replyToMessageId != null) 'reply_to_message_id': replyToMessageId,
      };

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/conversations/$conversationId/messages')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      print('MessageService - Send message response status: ${response.statusCode}');

      final data = json.decode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('MessageService - Message sent successfully: $data');

        return {
          'success': true,
          'message_object': Message.fromJson(data),
          'message': 'Message sent successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to send message',
        };
      }
    } catch (e) {
      print('MessageService - Error sending message: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Mark message as read
  static Future<Map<String, dynamic>> markAsRead(int messageId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final response = await http.put(
        Uri.parse(ApiConfig.getUrl('/messages/$messageId/read')),
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
          'message': data['message'] ?? 'Message marked as read',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to mark message as read',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Delete a message
  static Future<Map<String, dynamic>> deleteMessage(int messageId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final response = await http.delete(
        Uri.parse(ApiConfig.getUrl('/messages/$messageId')),
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
          'message': data['message'] ?? 'Message deleted successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to delete message',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Pin / Unpin a message
  static Future<Map<String, dynamic>> pinMessage(int conversationId, int messageId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/conversations/$conversationId/messages/$messageId/pin')),
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
          'message': data['message'] ?? 'Message pin toggled successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to toggle message pin',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // React to a message
  static Future<Map<String, dynamic>> reactToMessage(int conversationId, int messageId, String emoji) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final body = {
        'emoji': emoji,
      };

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/conversations/$conversationId/messages/$messageId/react')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Reaction updated successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to update reaction',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get or create conversation with a user
  static Future<Map<String, dynamic>> getOrCreateConversation(int userId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      print('MessageService - Getting/creating conversation with userId: $userId');

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/conversations/with/$userId')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('MessageService - Conversation response status: ${response.statusCode}');

      final data = json.decode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('MessageService - Conversation data: $data');

        return {
          'success': true,
          'conversation': Conversation.fromJson(data),
          'message': 'Conversation retrieved successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to get conversation',
        };
      }
    } catch (e) {
      print('MessageService - Error getting conversation: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Create or get conversation with a user (deprecated - use getOrCreateConversation)
  static Future<Map<String, dynamic>> createConversation(int userId) async {
    return getOrCreateConversation(userId);
  }
}
