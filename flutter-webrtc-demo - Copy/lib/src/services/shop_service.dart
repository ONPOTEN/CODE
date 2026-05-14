import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:mime/mime.dart';
import '../models/shop.dart';
import '../models/shop_post.dart';
import 'api_config.dart';
import 'auth_storage.dart';

class ShopService {
  // Get all public shops with pagination
  static Future<Map<String, dynamic>> getShops({
    int page = 1,
    int perPage = 12,
    String? search,
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
      if (status != null && status != 'all') {
        queryParams['status'] = status;
      }

      final uri = Uri.parse(ApiConfig.getUrl('/shops')).replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 30));

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        final List<Shop> shops = [];
        if (data['data'] != null) {
          for (var item in data['data']) {
            shops.add(Shop.fromJson(item));
          }
        }

        return {
          'success': true,
          'shops': shops,
          'meta': data['meta'],
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to load shops',
        };
      }
    } catch (e) {
      print('ShopService - Error getting shops: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get user's shops
  static Future<Map<String, dynamic>> getMyShops() async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final url = ApiConfig.getUrl('/my-shops');
      print('ShopService - Fetching my shops from: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('ShopService - Response status: ${response.statusCode}');
      print('ShopService - Response body: ${response.body}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        List<Shop> shops = [];
        if (data['data'] != null) {
          shops = (data['data'] as List)
              .map((shopJson) => Shop.fromJson(shopJson))
              .toList();
        }

        return {
          'success': true,
          'shops': shops,
          'message': data['message'] ?? 'Shops retrieved successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch shops',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get shop by ID
  static Future<Map<String, dynamic>> getShop(int shopId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/shops/$shopId')),
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
          'shop': Shop.fromJson(data['data']),
          'message': data['message'] ?? 'Shop retrieved successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch shop',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get shop posts with pagination
  static Future<Map<String, dynamic>> getShopPosts(
    int shopId, {
    int page = 1,
    int perPage = 10,
    String? type,
    String? status,
    String? productType,
  }) async {
    try {
      final token = await AuthStorage.getToken();

      final queryParams = <String, String>{
        'page': page.toString(),
        'per_page': perPage.toString(),
      };
      if (type != null && type != 'all') {
        queryParams['type'] = type;
      }
      if (status != null && status != 'all') {
        queryParams['status'] = status;
      }
      if (productType != null && productType != 'all') {
        queryParams['product_type'] = productType;
      }

      final uri = Uri.parse(ApiConfig.getUrl('/shops/$shopId/posts')).replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 30));

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        List<ShopPost> posts = [];
        if (data['data'] != null) {
          for (var postJson in data['data']) {
            try {
              posts.add(ShopPost.fromJson(postJson));
            } catch (e) {
              print('ShopService - Error parsing post: $e');
            }
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
          'message': data['message'] ?? 'Failed to fetch posts',
        };
      }
    } catch (e) {
      print('ShopService - Error: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get single shop post
  static Future<Map<String, dynamic>> getShopPost(int shopId, int postId) async {
    try {
      final token = await AuthStorage.getToken();

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/shops/$shopId/posts/$postId')),
        headers: {
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 30));

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'post': ShopPost.fromJson(data['data']),
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to fetch post',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Create shop post with images and video
  static Future<Map<String, dynamic>> createShopPostWithMedia({
    required int shopId,
    required String title,
    String? content,
    String? priceRange,
    String type = 'post',
    String status = 'published',
    String? productType,
    String? price,
    String? salePrice,
    String? shortDescription,
    String? categories,
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
        Uri.parse(ApiConfig.getUrl('/shops/$shopId/posts')),
      );

      request.headers.addAll({
        'Accept': 'application/json',
        'Authorization': 'Bearer $token',
      });

      request.fields['title'] = title;
      request.fields['type'] = type;
      request.fields['status'] = status;
      if (content != null) request.fields['content'] = content;
      if (priceRange != null) request.fields['price_range'] = priceRange;
      if (productType != null) request.fields['product_type'] = productType;
      if (price != null) request.fields['price'] = price;
      if (salePrice != null) request.fields['sale_price'] = salePrice;
      if (shortDescription != null) request.fields['short_description'] = shortDescription;
      if (categories != null) request.fields['categories'] = categories;

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
          'post': ShopPost.fromJson(data['data']),
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
      print('ShopService - Error creating shop post: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Create shop
  static Future<Map<String, dynamic>> createShop({
    required String name,
    required String slug,
    String? description,
    String? address,
    String? city,
    String? state,
    String? country,
    String? postalCode,
    String? phone,
    String? email,
    String? website,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final body = {
        'name': name,
        'slug': slug,
        if (description != null) 'description': description,
        if (address != null) 'address': address,
        if (city != null) 'city': city,
        if (state != null) 'state': state,
        if (country != null) 'country': country,
        if (postalCode != null) 'postal_code': postalCode,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
        if (website != null) 'website': website,
      };

      final response = await http.post(
        Uri.parse(ApiConfig.getUrl('/shops')),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          'shop': Shop.fromJson(data['data']),
          'message': data['message'] ?? 'Shop created successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to create shop',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Create shop post
  static Future<Map<String, dynamic>> createShopPost({
    required int shopId,
    required String title,
    required String slug,
    String? content,
    String? priceRange,
    String type = 'post',
    String status = 'draft',
    String? productType,
    String? price,
    String? salePrice,
    String? shortDescription,
    String? detailDescription,
    String? categories,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final body = {
        'shop_id': shopId,
        'title': title,
        'slug': slug,
        'type': type,
        'status': status,
        if (content != null) 'content': content,
        if (priceRange != null) 'price_range': priceRange,
        if (productType != null) 'product_type': productType,
        if (price != null) 'price': price,
        if (salePrice != null) 'sale_price': salePrice,
        if (shortDescription != null) 'short_description': shortDescription,
        if (detailDescription != null) 'detail_description': detailDescription,
        if (categories != null) 'categories': categories,
      };

      final url = ApiConfig.getUrl('/shops/$shopId/posts');
      print('ShopService - Creating shop post at: $url');

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      print('ShopService - Response status: ${response.statusCode}');

      final data = json.decode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          'post': ShopPost.fromJson(data['data']),
          'message': data['message'] ?? 'Post created successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to create post',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Update shop post
  static Future<Map<String, dynamic>> updateShopPost({
    required int postId,
    required int shopId, // Made required since backend needs it in path
    String? title,
    String? slug,
    String? content,
    String? priceRange,
    String? type,
    String? status,
    String? productType,
    String? price,
    String? salePrice,
    String? shortDescription,
    String? detailDescription,
    String? categories,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final body = {
        if (title != null) 'title': title,
        if (slug != null) 'slug': slug,
        if (type != null) 'type': type,
        if (status != null) 'status': status,
        if (content != null) 'content': content,
        if (priceRange != null) 'price_range': priceRange,
        if (productType != null) 'product_type': productType,
        if (price != null) 'price': price,
        if (salePrice != null) 'sale_price': salePrice,
        if (shortDescription != null) 'short_description': shortDescription,
        if (detailDescription != null) 'detail_description': detailDescription,
        if (categories != null) 'categories': categories,
      };

      final url = ApiConfig.getUrl('/shops/$shopId/posts/$postId');
      print('ShopService - Updating shop post at: $url');

      final response = await http.put(
        Uri.parse(url),
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
          'post': ShopPost.fromJson(data['data']),
          'message': data['message'] ?? 'Post updated successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to update post',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Delete shop post
  static Future<Map<String, dynamic>> deleteShopPost(int shopId, int postId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final url = ApiConfig.getUrl('/shops/$shopId/posts/$postId');
      print('ShopService - Deleting shop post at: $url');

      final response = await http.delete(
        Uri.parse(url),
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
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get shop message stats
  static Future<Map<String, dynamic>> getShopMessageStats(int shopId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/shops/$shopId/messages/stats')),
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
          'total_messages': data['total_messages'] ?? 0,
          'unread_count': data['unread_count'] ?? 0,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to get message stats',
        };
      }
    } catch (e) {
      // Return empty stats on error to avoid breaking UI
      return {
        'success': true,
        'total_messages': 0,
        'unread_count': 0,
      };
    }
  }

  // Get payment settings
  static Future<Map<String, dynamic>> getPaymentSettings(int shopId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final response = await http.get(
        Uri.parse(ApiConfig.getUrl('/shops/$shopId/payment-settings')),
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
          'data': data['data'] ?? data,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to get payment settings',
        };
      }
    } catch (e) {
      // Return empty data on error
      return {
        'success': true,
        'data': null,
      };
    }
  }

  // Save payment settings
  static Future<Map<String, dynamic>> savePaymentSettings({
    required int shopId,
    required String bankName,
    required String accountNumber,
    required String accountHolder,
    String? upiId,
    String? phone,
    String? qrCode,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final body = {
        'bank_name': bankName,
        'account_number': accountNumber,
        'account_holder': accountHolder,
        if (upiId != null) 'upi_id': upiId,
        if (phone != null) 'phone': phone,
        if (qrCode != null) 'qr_code': qrCode,
      };

      final url = ApiConfig.getUrl('/shops/$shopId/payment-settings');
      print('ShopService - Saving payment settings to: $url');

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      print('ShopService - Payment settings response status: ${response.statusCode}');
      print('ShopService - Payment settings response body: ${response.body}');

      final data = json.decode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return {
          'success': true,
          'message': data['message'] ?? 'Payment settings saved successfully',
          'data': data['data'] ?? data,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to save payment settings',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get shop orders
  static Future<Map<String, dynamic>> getShopOrders({
    required int shopId,
    String? status,
    int perPage = 100,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      String url = ApiConfig.getUrl('/orders?shop_id=$shopId&per_page=$perPage');
      if (status != null && status.isNotEmpty) {
        url += '&status=$status';
      }

      print('ShopService - Fetching orders from: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('ShopService - Orders response status: ${response.statusCode}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': data['data'] ?? data,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to get orders',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get order by ID
  static Future<Map<String, dynamic>> getOrderById(int orderId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final url = ApiConfig.getUrl('/orders/$orderId');
      print('ShopService - Fetching order from: $url');

      final response = await http.get(
        Uri.parse(url),
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
          'data': data['data'] ?? data,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to get order',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Update order status
  static Future<Map<String, dynamic>> updateOrderStatus(int orderId, String status) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final url = ApiConfig.getUrl('/orders/$orderId/status');
      print('ShopService - Updating order status at: $url');

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'status': status}),
      ).timeout(ApiConfig.timeout);

      print('ShopService - Update status response: ${response.statusCode}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Order status updated successfully',
          'data': data['data'] ?? data,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to update order status',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Delete shop
  static Future<Map<String, dynamic>> deleteShop(int shopId) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final response = await http.delete(
        Uri.parse(ApiConfig.getUrl('/shops/$shopId')),
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
          'message': data['message'] ?? 'Shop deleted successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to delete shop',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Upload images for shop post
  static Future<Map<String, dynamic>> uploadShopPostImages({
    required int shopId,
    required int postId,
    required List<String> imagePaths,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      // Create multipart request
      final url = ApiConfig.getUrl('/shops/$shopId/posts/$postId/images');
      print('ShopService - Uploading images to: $url');

      var request = http.MultipartRequest('POST', Uri.parse(url));
      request.headers['Authorization'] = 'Bearer $token';
      request.headers['Accept'] = 'application/json';

      // Add image files
      for (var imagePath in imagePaths) {
        final fileName = imagePath.split('/').last;
        final mimeType = _getMimeType(fileName);

        request.files.add(await http.MultipartFile.fromPath(
          'images[]',
          imagePath,
          contentType: MediaType.parse(mimeType),
        ));
      }

      print('ShopService - Uploading ${imagePaths.length} images');

      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 60), // Longer timeout for uploads
      );

      final response = await http.Response.fromStream(streamedResponse);
      print('ShopService - Upload response status: ${response.statusCode}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'images': data['images'] ?? [],
          'message': data['message'] ?? 'Images uploaded successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to upload images',
        };
      }
    } catch (e) {
      print('ShopService - Upload error: $e');
      return {
        'success': false,
        'message': 'Error uploading images: ${e.toString()}',
      };
    }
  }

  // Delete image from shop post
  static Future<Map<String, dynamic>> deleteShopPostImage({
    required int shopId,
    required int postId,
    required String imageUrl,
  }) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      final url = ApiConfig.getUrl('/shops/$shopId/posts/$postId/images');
      print('ShopService - Deleting image from: $url');

      final response = await http.delete(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'image_url': imageUrl}),
      ).timeout(ApiConfig.timeout);

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Image deleted successfully',
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to delete image',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get product feed (latest products)
  static Future<Map<String, dynamic>> getProductFeed({int perPage = 10}) async {
    try {
      final token = await AuthStorage.getToken();

      final queryParams = <String, String>{
        'per_page': perPage.toString(),
      };

      final uri = Uri.parse(ApiConfig.getUrl('/shops/products/feed'))
          .replace(queryParameters: queryParams);

      print('ShopService - Fetching product feed from: $uri');

      final response = await http.get(
        uri,
        headers: {
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('ShopService - Product feed response status: ${response.statusCode}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        final List<ShopPost> posts = [];
        final rawData = data['data'] ?? data;
        if (rawData is List) {
          for (var item in rawData) {
            posts.add(ShopPost.fromJson(item));
          }
        }
        return {
          'success': true,
          'posts': posts,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to get product feed',
        };
      }
    } catch (e) {
      print('ShopService - Product feed error: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get trending products
  static Future<Map<String, dynamic>> getTrendingProducts({int perPage = 10}) async {
    try {
      final token = await AuthStorage.getToken();

      final queryParams = <String, String>{
        'per_page': perPage.toString(),
      };

      final uri = Uri.parse(ApiConfig.getUrl('/shops/products/trending'))
          .replace(queryParameters: queryParams);

      print('ShopService - Fetching trending products from: $uri');

      final response = await http.get(
        uri,
        headers: {
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('ShopService - Trending products response status: ${response.statusCode}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        final List<ShopPost> posts = [];
        final rawData = data['data'] ?? data;
        if (rawData is List) {
          for (var item in rawData) {
            posts.add(ShopPost.fromJson(item));
          }
        }
        return {
          'success': true,
          'posts': posts,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to get trending products',
        };
      }
    } catch (e) {
      print('ShopService - Trending products error: $e');
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Get user's orders (my orders)
  static Future<Map<String, dynamic>> getMyOrders({String? status}) async {
    try {
      final token = await AuthStorage.getToken();
      if (token == null) {
        return {
          'success': false,
          'message': 'Authentication token not found',
        };
      }

      String url = ApiConfig.getUrl('/my-orders');
      if (status != null && status.isNotEmpty) {
        url += '?status=$status';
      }

      print('ShopService - Fetching my orders from: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(ApiConfig.timeout);

      print('ShopService - My orders response status: ${response.statusCode}');

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': data['data'] ?? data,
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Failed to get orders',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: ${e.toString()}',
      };
    }
  }

  // Helper method to get MIME type from file extension
  static String _getMimeType(String fileName) {
    final ext = fileName.toLowerCase().split('.').last;
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }
}
