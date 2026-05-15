import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mime/mime.dart';
import '../models/post.dart';
import 'api_config.dart';
import 'auth_storage.dart';

class PostService {
  // Get all published posts
  static Future<Map<String, dynamic>> getPosts({
    String? type,
    String? search,
    int page = 1,
    int perPage = 15,
  }) async {
    try {
      final token = await AuthStorage.getToken();

      final queryParams = <String, String>{
        'page': page.toString(),
        'per_page': perPage.toString(),
      };

      if (type != null && type.isNotEmpty) {
        queryParams['type'] = type;
      }

      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }

      final uri = Uri.parse(ApiConfig.getUrl('/posts')).replace(
        queryParameters: queryParams,
      );

      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        List<Post> posts = [];
        if (data['data'] != null) {
          posts = (data['data'] as List)
              .map((post) => Post.fromJson(post))
              .toList();
        }

        return {
          'success': true,
          'posts': posts,
          'total': data['total'] ?? 0,
          'current_page': data['current_page'] ?? 1,
          'last_page': data['last_page'] ?? 1,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch posts',
        };
      }
    } catch (e) {
      print('PostService - Error fetching posts: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get current user's posts
  static Future<Map<String, dynamic>> getMyPosts({
    String? status,
    String? type,
    int page = 1,
    int perPage = 50,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final queryParams = <String, String>{
        'page': page.toString(),
        'per_page': perPage.toString(),
      };

      if (status != null && status.isNotEmpty) {
        queryParams['status'] = status;
      }

      if (type != null && type.isNotEmpty) {
        queryParams['type'] = type;
      }

      final uri = Uri.parse(ApiConfig.getUrl('/my-posts')).replace(
        queryParameters: queryParams,
      );

      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        List<Post> posts = [];
        if (data['data'] != null) {
          posts = (data['data'] as List)
              .map((post) => Post.fromJson(post))
              .toList();
        }

        return {
          'success': true,
          'posts': posts,
          'total': data['total'] ?? 0,
          'current_page': data['current_page'] ?? 1,
          'last_page': data['last_page'] ?? 1,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch posts',
        };
      }
    } catch (e) {
      print('PostService - Error fetching my posts: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get a single post by ID
  static Future<Map<String, dynamic>> getPost(int postId) async {
    try {
      final token = await AuthStorage.getToken();

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/posts/$postId')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'post': Post.fromJson(data),
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch post',
        };
      }
    } catch (e) {
      print('PostService - Error fetching post: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Create a new post
  static Future<Map<String, dynamic>> createPost({
    required String title,
    required String content,
    String? excerpt,
    String type = 'post',
    String status = 'draft',
    List<dynamic>? images, // Accepts List<File> or List<XFile>
    dynamic video, // Accepts File or XFile
    Function(double)? onProgress,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      var request = http.MultipartRequest(
        'POST',
        Uri.parse(ApiConfig.getUrl('/posts')),
      );

      request.headers.addAll({
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      });

      request.fields['title'] = title;
      request.fields['content'] = content;
      if (excerpt != null) request.fields['excerpt'] = excerpt;
      request.fields['type'] = type;
      request.fields['status'] = status;

      // Add images (web-safe: uses fromBytes)
      if (images != null && images.isNotEmpty) {
        for (var image in images) {
          final String path;
          final List<int> bytes;
          if (image is XFile) {
            path = image.path;
            bytes = await image.readAsBytes();
          } else if (image is File) {
            path = image.path;
            bytes = await image.readAsBytes();
          } else {
            continue;
          }
          final mimeType = lookupMimeType(path) ?? 'image/jpeg';
          final fileName = path.split('/').last.split('\\').last;
          request.files.add(http.MultipartFile.fromBytes(
            'images[]',
            bytes,
            filename: fileName,
            contentType: MediaType.parse(mimeType),
          ));
        }
      }

      // Add video (web-safe: uses fromBytes)
      if (video != null) {
        final String path;
        final List<int> bytes;
        if (video is XFile) {
          path = video.path;
          bytes = await video.readAsBytes();
        } else if (video is File) {
          path = video.path;
          bytes = await video.readAsBytes();
        } else {
          path = '';
          bytes = [];
        }
        if (bytes.isNotEmpty) {
          final mimeType = lookupMimeType(path) ?? 'video/mp4';
          final fileName = path.split('/').last.split('\\').last;
          request.files.add(http.MultipartFile.fromBytes(
            'video',
            bytes,
            filename: fileName,
            contentType: MediaType.parse(mimeType),
          ));
        }
      }

      // Increased timeout for video uploads (5 minutes)
      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 300),
      );
      final response = await http.Response.fromStream(streamedResponse);
      final data = json.decode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          'post': Post.fromJson(data['post']),
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
      print('PostService - Error creating post: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Update an existing post
  static Future<Map<String, dynamic>> updatePost({
    required int postId,
    String? title,
    String? content,
    String? excerpt,
    String? type,
    String? status,
    String? visibility,
    List<dynamic>? images, // Accepts List<File> or List<XFile>
    List<int>? removeImages,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      var request = http.MultipartRequest(
        'POST',
        Uri.parse(ApiConfig.getUrl('/posts/$postId')),
      );

      request.headers.addAll({
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      });

      // Add _method field for Laravel to treat this as PUT
      request.fields['_method'] = 'PUT';

      if (title != null) request.fields['title'] = title;
      if (content != null) request.fields['content'] = content;
      if (excerpt != null) request.fields['excerpt'] = excerpt;
      if (type != null) request.fields['type'] = type;
      if (status != null) request.fields['status'] = status;
      if (visibility != null) request.fields['visibility'] = visibility;

      // Add images to remove
      if (removeImages != null && removeImages.isNotEmpty) {
        for (int i = 0; i < removeImages.length; i++) {
          request.fields['remove_images[$i]'] = removeImages[i].toString();
        }
      }

      // Add new images (web-safe: uses fromBytes)
      if (images != null && images.isNotEmpty) {
        for (var image in images) {
          final String path;
          final List<int> bytes;
          if (image is XFile) {
            path = image.path;
            bytes = await image.readAsBytes();
          } else if (image is File) {
            path = image.path;
            bytes = await image.readAsBytes();
          } else {
            continue;
          }
          final mimeType = lookupMimeType(path) ?? 'image/jpeg';
          final fileName = path.split('/').last.split('\\').last;
          request.files.add(http.MultipartFile.fromBytes(
            'images[]',
            bytes,
            filename: fileName,
            contentType: MediaType.parse(mimeType),
          ));
        }
      }

      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 60),
      );
      final response = await http.Response.fromStream(streamedResponse);
      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'post': Post.fromJson(data['post']),
          'message': data['message'] ?? 'Post updated successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to update post',
          'errors': data['errors'],
        };
      }
    } catch (e) {
      print('PostService - Error updating post: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Delete a post
  static Future<Map<String, dynamic>> deletePost(int postId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final response = await http.delete(
        Uri.parse(ApiConfig.getUrl('/posts/$postId')),
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
          'message': data['message'] ?? 'Post deleted successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to delete post',
        };
      }
    } catch (e) {
      print('PostService - Error deleting post: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get shared wall posts (posts shared to current user's wall)
  static Future<Map<String, dynamic>> getSharedWallPosts({
    required int userId,
    int page = 1,
    int perPage = 15,
  }) async {
    try {
      final token = await AuthStorage.getToken();

      final queryParams = <String, String>{
        'page': page.toString(),
        'per_page': perPage.toString(),
      };

      final uri = Uri.parse(ApiConfig.getUrl('/users/$userId/shared-wall')).replace(
        queryParameters: queryParams,
      );

      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        List<Post> posts = [];
        if (data['data'] != null) {
          posts = (data['data'] as List)
              .map((post) => Post.fromJson(post))
              .toList();
        }

        return {
          'success': true,
          'posts': posts,
          'total': data['total'] ?? 0,
          'current_page': data['current_page'] ?? 1,
          'last_page': data['last_page'] ?? 1,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch shared wall posts',
        };
      }
    } catch (e) {
      print('PostService - Error fetching shared wall posts: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Delete a shared post from wall
  static Future<Map<String, dynamic>> deleteSharedPost({
    required int postId,
    required int wallId,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final response = await http.delete(
        Uri.parse(ApiConfig.getUrl('/posts/$postId/shared-wall')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'wall_id': wallId,
        }),
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Shared post removed successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to remove shared post',
        };
      }
    } catch (e) {
      print('PostService - Error deleting shared post: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }
}
