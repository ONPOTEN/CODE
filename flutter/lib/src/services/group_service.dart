import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:mime/mime.dart';
import '../models/group.dart';
import '../models/group_post.dart';
import 'api_config.dart';
import 'auth_storage.dart';

class GroupService {
  // Get all groups with pagination and filters
  static Future<Map<String, dynamic>> getGroups({
    int page = 1,
    int perPage = 12,
    String? search,
    String? visibility,
    String? status,
  }) async {
    try {
      final token = await AuthStorage.getToken();

      final queryParams = <String, String>{
        'page': page.toString(),
        'per_page': perPage.toString(),
      };
      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }
      if (visibility != null && visibility != 'all') {
        queryParams['visibility'] = visibility;
      }
      if (status != null && status != 'all') {
        queryParams['status'] = status;
      }

      final uri = Uri.parse(ApiConfig.getUrl('/groups')).replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 30));

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        final List<Group> groups = [];
        if (data['data'] != null) {
          for (var item in data['data']) {
            groups.add(Group.fromJson(item));
          }
        }

        return {
          'success': true,
          'groups': groups,
          'meta': data['meta'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to load groups',
        };
      }
    } catch (e) {
      print('GroupService - Error getting groups: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get group by ID
  static Future<Map<String, dynamic>> getGroup(int groupId) async {
    try {
      final token = await AuthStorage.getToken();

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/groups/$groupId')),
        headers: {
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 30));

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'group': Group.fromJson(data['data']),
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to load group',
        };
      }
    } catch (e) {
      print('GroupService - Error getting group: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get group posts with pagination
  static Future<Map<String, dynamic>> getGroupPosts(
    int groupId, {
    int page = 1,
    int perPage = 10,
    String sortBy = 'post_date',
    String order = 'desc',
  }) async {
    try {
      final token = await AuthStorage.getToken();

      final queryParams = <String, String>{
        'page': page.toString(),
        'per_page': perPage.toString(),
        'sort_by': sortBy,
        'order': order,
      };

      final uri = Uri.parse(ApiConfig.getUrl('/groups/$groupId/posts')).replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 30));

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        final List<GroupPost> posts = [];
        if (data['data'] != null) {
          for (var item in data['data']) {
            posts.add(GroupPost.fromJson(item));
          }
        }

        return {
          'success': true,
          'posts': posts,
          'meta': data['meta'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to load group posts',
        };
      }
    } catch (e) {
      print('GroupService - Error getting group posts: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Check membership status
  static Future<Map<String, dynamic>> checkMembership(int groupId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': true,
          'is_member': false,
        };
      }

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/groups/$groupId/membership')),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 30));

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'is_member': data['is_member'] ?? false,
          'role': data['role'],
          'status': data['status'],
        };
      } else {
        return {
          'success': false,
          'is_member': false,
          'message': data['message'] ?? 'Failed to check membership',
        };
      }
    } catch (e) {
      print('GroupService - Error checking membership: $e');
      return {
        'success': false,
        'is_member': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Join group
  static Future<Map<String, dynamic>> joinGroup(int groupId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication required',
        };
      }

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/groups/$groupId/join')),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 30));

      final data = json.decode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          'message': data['message'] ?? 'Joined group successfully',
          'status': data['status'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to join group',
        };
      }
    } catch (e) {
      print('GroupService - Error joining group: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Leave group
  static Future<Map<String, dynamic>> leaveGroup(int groupId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication required',
        };
      }

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/groups/$groupId/leave')),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 30));

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Left group successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to leave group',
        };
      }
    } catch (e) {
      print('GroupService - Error leaving group: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Create group post
  static Future<Map<String, dynamic>> createGroupPost({
    required int groupId,
    required String title,
    required String content,
    String? excerpt,
    String status = 'publish',
    List<File>? images,
    File? video,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication required',
        };
      }

      var request = http.MultipartRequest(
        'POST',
        Uri.parse(ApiConfig.getUrl('/groups/$groupId/posts')),
      );

      request.headers.addAll({
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      });

      request.fields['post_title'] = title;
      request.fields['post_content'] = content;
      if (excerpt != null) request.fields['post_excerpt'] = excerpt;
      request.fields['post_status'] = status;

      // Add images
      if (images != null && images.isNotEmpty) {
        for (var image in images) {
          final mimeType = lookupMimeType(image.path);
          final multipartFile = await http.MultipartFile.fromPath(
            'images[]',
            image.path,
            contentType: mimeType != null ? MediaType.parse(mimeType) : null,
          );
          request.files.add(multipartFile);
        }
      }

      // Add video
      if (video != null) {
        final mimeType = lookupMimeType(video.path) ?? 'video/mp4';
        final multipartFile = await http.MultipartFile.fromPath(
          'video',
          video.path,
          contentType: MediaType.parse(mimeType),
        );
        request.files.add(multipartFile);
      }

      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 300),
      );
      final response = await http.Response.fromStream(streamedResponse);
      final data = json.decode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          'post': GroupPost.fromJson(data['data']),
          'message': data['message'] ?? 'Post created successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to create post',
          'errors': data['errors'],
        };
      }
    } catch (e) {
      print('GroupService - Error creating group post: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get my groups
  static Future<Map<String, dynamic>> getMyGroups({
    int page = 1,
    int perPage = 12,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication required',
        };
      }

      final queryParams = <String, String>{
        'page': page.toString(),
        'per_page': perPage.toString(),
      };

      final uri = Uri.parse(ApiConfig.getUrl('/my-groups')).replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 30));

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        final List<Group> groups = [];
        if (data['data'] != null) {
          for (var item in data['data']) {
            groups.add(Group.fromJson(item));
          }
        }

        return {
          'success': true,
          'groups': groups,
          'meta': data['meta'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to load groups',
        };
      }
    } catch (e) {
      print('GroupService - Error getting my groups: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Like a group post
  static Future<Map<String, dynamic>> likePost(int postId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) return {'success': false, 'message': 'Authentication required'};

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/group-posts/$postId/engage/like')),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'data': json.decode(response.body)};
      } else {
        return {'success': false, 'message': 'Failed to like post'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // Unlike a group post
  static Future<Map<String, dynamic>> unlikePost(int postId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) return {'success': false, 'message': 'Authentication required'};

      final response = await http.delete(
        Uri.parse(ApiConfig.getUrl('/group-posts/$postId/engage/like')),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        return {'success': true, 'data': json.decode(response.body)};
      } else {
        return {'success': false, 'message': 'Failed to unlike post'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // Dislike a group post
  static Future<Map<String, dynamic>> dislikePost(int postId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) return {'success': false, 'message': 'Authentication required'};

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/group-posts/$postId/engage/dislike')),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'data': json.decode(response.body)};
      } else {
        return {'success': false, 'message': 'Failed to dislike post'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // Remove dislike from a group post
  static Future<Map<String, dynamic>> removeDislikePost(int postId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) return {'success': false, 'message': 'Authentication required'};

      final response = await http.delete(
        Uri.parse(ApiConfig.getUrl('/group-posts/$postId/engage/dislike')),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        return {'success': true, 'data': json.decode(response.body)};
      } else {
        return {'success': false, 'message': 'Failed to remove dislike'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // Share a group post
  static Future<Map<String, dynamic>> sharePost(int postId, {String sharedVia = 'direct'}) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) return {'success': false, 'message': 'Authentication required'};

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/group-posts/$postId/engage/share')),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'shared_via': sharedVia}),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'data': json.decode(response.body)};
      } else {
        return {'success': false, 'message': 'Failed to share post'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // Get engagement stats
  static Future<Map<String, dynamic>> getEngagementStats(int postId) async {
    try {
      final token = await AuthStorage.getToken();
      
      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/group-posts/$postId/engage/stats')),
        headers: {
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        return {'success': true, 'data': json.decode(response.body)};
      } else {
        return {'success': false, 'message': 'Failed to get stats'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // Get single group post by ID
  static Future<Map<String, dynamic>> getGroupPost(int postId) async {
    try {
      final token = await AuthStorage.getToken();

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/group-posts/$postId')),
        headers: {
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 30));

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'post': GroupPost.fromJson(data['data']),
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to load group post',
        };
      }
    } catch (e) {
      print('GroupService - Error getting group post: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }
}
