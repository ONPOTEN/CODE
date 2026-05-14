/// Engagement Service for Socket.io real-time engagement
/// Handles likes, dislikes, comments, and shares with real-time updates

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../models/engagement.dart';

typedef EngagementCallback = void Function(Engagement engagement);
typedef CommentCallback = void Function(PostComment comment);
typedef ShareCallback = void Function(PostShare share);

class EngagementService {
  late String apiUrl;
  late String socketUrl;
  late String? token;
  IO.Socket? _socket;
  bool _socketConnected = false;

  final Map<int, EngagementCallback> _engagementListeners = {};
  final Map<int, List<CommentCallback>> _commentListeners = {};
  final Map<int, List<ShareCallback>> _shareListeners = {};

  static final EngagementService _instance = EngagementService._internal();

  factory EngagementService() {
    return _instance;
  }

  EngagementService._internal();

  /// Helper to safely convert value to int
  int _toInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  /// Initialize the engagement service
  Future<void> initialize({
    required String apiUrl,
    required String socketUrl,
    String? token,
  }) async {
    this.apiUrl = apiUrl;
    this.socketUrl = socketUrl;
    this.token = token;

    _initializeSocket();
  }

  /// Initialize Socket.io connection
  void _initializeSocket() {
    try {
      _socket = IO.io(
        socketUrl,
        IO.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableReconnection()
            .setReconnectionDelay(1000)
            .setReconnectionDelayMax(5000)
            .setReconnectionAttempts(5)
            .build(),
      );

      _socket!.onConnect((_) {
        print('EngagementService - Socket.io connected: $socketUrl');
        _socketConnected = true;

        // Authenticate with token
        if (token != null) {
          print('EngagementService - Authenticating socket with token');
          _socket!.emit('authenticate', {'token': token});
        } else {
          print('EngagementService - No token available for socket authentication');
        }
      });

      _socket!.onDisconnect((_) {
        print('EngagementService - Socket.io disconnected');
        _socketConnected = false;
      });

      // Listen for engagement events
      _socket!.on('engagement:like-added', (data) {
        _handleLikeAdded(data);
      });

      _socket!.on('engagement:like-removed', (data) {
        _handleLikeRemoved(data);
      });

      _socket!.on('engagement:dislike-added', (data) {
        _handleDislikeAdded(data);
      });

      _socket!.on('engagement:dislike-removed', (data) {
        _handleDislikeRemoved(data);
      });

      _socket!.on('engagement:comment-added', (data) {
        _handleCommentAdded(data);
      });

      _socket!.on('engagement:comment-updated', (data) {
        _handleCommentUpdated(data);
      });

      _socket!.on('engagement:comment-removed', (data) {
        _handleCommentRemoved(data);
      });

      _socket!.on('engagement:share-added', (data) {
        _handleShareAdded(data);
      });

      _socket!.onError((error) {
        print('Engagement socket error: $error');
      });
    } catch (e) {
      print('Failed to initialize engagement socket: $e');
    }
  }

  /// Handle like added event
  void _handleLikeAdded(dynamic data) {
    try {
      final postId = _toInt(data['post_id']);
      final likesCount = _toInt(data['likes_count']);

      print('Engagement socket - Like added: post_id=$postId, count=$likesCount');

      if (_engagementListeners.containsKey(postId)) {
        _engagementListeners[postId]?.call(
          Engagement(postId: postId, likeCount: likesCount),
        );
      }
    } catch (e) {
      print('Error handling like added: $e');
    }
  }

  /// Handle like removed event
  void _handleLikeRemoved(dynamic data) {
    try {
      final postId = _toInt(data['post_id']);
      final likesCount = _toInt(data['likes_count']);

      print('Engagement socket - Like removed: post_id=$postId, count=$likesCount');

      if (_engagementListeners.containsKey(postId)) {
        _engagementListeners[postId]?.call(
          Engagement(postId: postId, likeCount: likesCount),
        );
      }
    } catch (e) {
      print('Error handling like removed: $e');
    }
  }

  /// Handle dislike added event
  void _handleDislikeAdded(dynamic data) {
    try {
      final postId = _toInt(data['post_id']);
      final dislikesCount = _toInt(data['dislikes_count']);

      print('Engagement socket - Dislike added: post_id=$postId, count=$dislikesCount');

      if (_engagementListeners.containsKey(postId)) {
        _engagementListeners[postId]?.call(
          Engagement(postId: postId, dislikeCount: dislikesCount),
        );
      }
    } catch (e) {
      print('Error handling dislike added: $e');
    }
  }

  /// Handle dislike removed event
  void _handleDislikeRemoved(dynamic data) {
    try {
      final postId = _toInt(data['post_id']);
      final dislikesCount = _toInt(data['dislikes_count']);

      print('Engagement socket - Dislike removed: post_id=$postId, count=$dislikesCount');

      if (_engagementListeners.containsKey(postId)) {
        _engagementListeners[postId]?.call(
          Engagement(postId: postId, dislikeCount: dislikesCount),
        );
      }
    } catch (e) {
      print('Error handling dislike removed: $e');
    }
  }

  /// Handle comment added event
  void _handleCommentAdded(dynamic data) {
    try {
      final postId = data['post_id'] ?? 0;
      final comment = PostComment.fromJson(data['comment']);

      print('Comment added: post_id=$postId, comment_id=${comment.id}');

      if (_commentListeners.containsKey(postId)) {
        for (var listener in _commentListeners[postId]!) {
          listener.call(comment);
        }
      }
    } catch (e) {
      print('Error handling comment added: $e');
    }
  }

  /// Handle comment updated event
  void _handleCommentUpdated(dynamic data) {
    try {
      final postId = data['post_id'] ?? 0;
      final comment = PostComment.fromJson(data['comment']);

      print('Comment updated: comment_id=${comment.id}');

      if (_commentListeners.containsKey(postId)) {
        for (var listener in _commentListeners[postId]!) {
          listener.call(comment);
        }
      }
    } catch (e) {
      print('Error handling comment updated: $e');
    }
  }

  /// Handle comment removed event
  void _handleCommentRemoved(dynamic data) {
    try {
      final postId = data['post_id'] ?? 0;
      final commentId = data['comment_id'] ?? 0;

      print('Comment removed: post_id=$postId, comment_id=$commentId');

      if (_commentListeners.containsKey(postId)) {
        for (var listener in _commentListeners[postId]!) {
          listener.call(
            PostComment(
              id: commentId,
              postId: postId,
              userId: 0,
              content: '',
              authorName: '',
              createdAt: DateTime.now(),
            ),
          );
        }
      }
    } catch (e) {
      print('Error handling comment removed: $e');
    }
  }

  /// Handle share added event
  void _handleShareAdded(dynamic data) {
    try {
      final postId = _toInt(data['post_id']);
      final sharesCount = _toInt(data['shares_count']);

      print('Engagement socket - Share added: post_id=$postId, count=$sharesCount');

      // Update engagement count
      if (_engagementListeners.containsKey(postId)) {
        _engagementListeners[postId]?.call(
          Engagement(postId: postId, shareCount: sharesCount),
        );
      }

      // Also handle the share object if provided
      try {
        if (data['share'] != null) {
          final share = PostShare.fromJson(data['share']);
          if (_shareListeners.containsKey(postId)) {
            for (var listener in _shareListeners[postId]!) {
              listener.call(share);
            }
          }
        }
      } catch (e) {
        print('Error handling share object: $e');
      }
    } catch (e) {
      print('Error handling share added: $e');
    }
  }

  /// Like a post
  Future<Engagement> likePost(int postId) async {
    try {
      print('\n🌐 [HTTP REQUEST] POST /posts/$postId/like');
      final response = await http.post(
        Uri.parse('$apiUrl/api/v1/posts/$postId/like'),
        headers: _getHeaders(),
      );

      print('🔗 [HTTP RESPONSE] Status Code: ${response.statusCode}');
      print('📄 [RESPONSE BODY] Raw JSON:\n${response.body}');

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ [JSON PARSED] Successfully parsed response');

        // The API returns a simple response format, so fetch complete engagement stats
        final postIdFromResponse = _toInt(data['post_id']);
        print('🔄 [FETCHING COMPLETE] Fetching complete engagement stats for post #$postIdFromResponse');
        final engagement = await getEngagementStats(postIdFromResponse);

        print('📦 [MODEL CREATED] Engagement model created:');
        print('   - Post ID: ${engagement.postId}');
        print('   - Like Count: ${engagement.likeCount}');
        print('   - Dislike Count: ${engagement.dislikeCount}');
        print('   - Comment Count: ${engagement.commentCount}');
        print('   - Share Count: ${engagement.shareCount}');
        print('   - User Liked: ${engagement.userLiked}');
        return engagement;
      } else {
        throw Exception('Failed to like post: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [ERROR] Error liking post: $e');
      rethrow;
    }
  }

  /// Unlike a post
  Future<Engagement> unlikePost(int postId) async {
    try {
      print('\n🌐 [HTTP REQUEST] DELETE /posts/$postId/like');
      final response = await http.delete(
        Uri.parse('$apiUrl/api/v1/posts/$postId/like'),
        headers: _getHeaders(),
      );

      print('🔗 [HTTP RESPONSE] Status Code: ${response.statusCode}');
      print('📄 [RESPONSE BODY] Raw JSON:\n${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ [JSON PARSED] Successfully parsed response');

        // The API returns a simple response format, so fetch complete engagement stats
        final postIdFromResponse = _toInt(data['post_id']);
        print('🔄 [FETCHING COMPLETE] Fetching complete engagement stats for post #$postIdFromResponse');
        final engagement = await getEngagementStats(postIdFromResponse);

        print('📦 [MODEL CREATED] Engagement model created:');
        print('   - Post ID: ${engagement.postId}');
        print('   - Like Count: ${engagement.likeCount}');
        print('   - Dislike Count: ${engagement.dislikeCount}');
        print('   - Comment Count: ${engagement.commentCount}');
        print('   - Share Count: ${engagement.shareCount}');
        print('   - User Liked: ${engagement.userLiked}');
        return engagement;
      } else {
        throw Exception('Failed to unlike post: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [ERROR] Error unliking post: $e');
      rethrow;
    }
  }

  /// Dislike a post
  Future<Engagement> dislikePost(int postId) async {
    try {
      print('\n🌐 [HTTP REQUEST] POST /posts/$postId/dislike');
      final response = await http.post(
        Uri.parse('$apiUrl/api/v1/posts/$postId/dislike'),
        headers: _getHeaders(),
      );

      print('🔗 [HTTP RESPONSE] Status Code: ${response.statusCode}');
      print('📄 [RESPONSE BODY] Raw JSON:\n${response.body}');

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ [JSON PARSED] Successfully parsed response');

        // The API returns a simple response format, so fetch complete engagement stats
        final postIdFromResponse = _toInt(data['post_id']);
        print('🔄 [FETCHING COMPLETE] Fetching complete engagement stats for post #$postIdFromResponse');
        final engagement = await getEngagementStats(postIdFromResponse);

        print('📦 [MODEL CREATED] Engagement model created:');
        print('   - Post ID: ${engagement.postId}');
        print('   - Like Count: ${engagement.likeCount}');
        print('   - Dislike Count: ${engagement.dislikeCount}');
        print('   - Comment Count: ${engagement.commentCount}');
        print('   - Share Count: ${engagement.shareCount}');
        print('   - User Liked: ${engagement.userLiked}');
        return engagement;
      } else {
        throw Exception('Failed to dislike post: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [ERROR] Error disliking post: $e');
      rethrow;
    }
  }

  /// Remove dislike from a post
  Future<Engagement> removeDislikePost(int postId) async {
    try {
      print('\n🌐 [HTTP REQUEST] DELETE /posts/$postId/dislike');
      final response = await http.delete(
        Uri.parse('$apiUrl/api/v1/posts/$postId/dislike'),
        headers: _getHeaders(),
      );

      print('🔗 [HTTP RESPONSE] Status Code: ${response.statusCode}');
      print('📄 [RESPONSE BODY] Raw JSON:\n${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ [JSON PARSED] Successfully parsed response');

        // The API returns a simple response format, so fetch complete engagement stats
        final postIdFromResponse = _toInt(data['post_id']);
        print('🔄 [FETCHING COMPLETE] Fetching complete engagement stats for post #$postIdFromResponse');
        final engagement = await getEngagementStats(postIdFromResponse);

        print('📦 [MODEL CREATED] Engagement model created:');
        print('   - Post ID: ${engagement.postId}');
        print('   - Like Count: ${engagement.likeCount}');
        print('   - Dislike Count: ${engagement.dislikeCount}');
        print('   - Comment Count: ${engagement.commentCount}');
        print('   - Share Count: ${engagement.shareCount}');
        print('   - User Liked: ${engagement.userLiked}');
        return engagement;
      } else {
        throw Exception('Failed to remove dislike: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ [ERROR] Error removing dislike: $e');
      rethrow;
    }
  }

  /// Share a post
  Future<Map<String, dynamic>> sharePost(
    int postId, {
    String sharedVia = 'direct',
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$apiUrl/api/v1/posts/$postId/share'),
        headers: _getHeaders(),
        body: jsonEncode({'shared_via': sharedVia}),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to share post: ${response.statusCode}');
      }
    } catch (e) {
      print('Error sharing post: $e');
      rethrow;
    }
  }

  /// Get engagement stats for a post
  Future<Engagement> getEngagementStats(int postId) async {
    try {
      final url = '$apiUrl/api/v1/posts/$postId/engagement';
      print('EngagementService - Fetching engagement stats from: $url');
      final response = await http.get(
        Uri.parse(url),
        headers: _getHeaders(),
      );

      print('EngagementService - Response status: ${response.statusCode}');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('EngagementService - Engagement data: $data');
        return Engagement.fromJson(data);
      } else {
        print('EngagementService - Response body: ${response.body}');
        throw Exception('Failed to fetch engagement stats: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching engagement stats: $e');
      rethrow;
    }
  }

  /// Get all comments for a post
  Future<List<PostComment>> getPostComments(
    int postId, {
    int page = 1,
    int perPage = 15,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$apiUrl/api/v1/posts/$postId/comments?page=$page&per_page=$perPage'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> comments = data['data'] ?? [];
        return comments.map((c) => PostComment.fromJson(c)).toList();
      } else {
        throw Exception('Failed to fetch comments: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching comments: $e');
      rethrow;
    }
  }

  /// Create a comment
  Future<PostComment> createComment(
    int postId,
    String content, {
    int? parentId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$apiUrl/api/v1/posts/$postId/comments'),
        headers: _getHeaders(),
        body: jsonEncode({
          'content': content,
          'parent_id': parentId,
        }),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return PostComment.fromJson(data['comment']);
      } else {
        throw Exception('Failed to create comment: ${response.statusCode}');
      }
    } catch (e) {
      print('Error creating comment: $e');
      rethrow;
    }
  }

  /// Update a comment
  Future<PostComment> updateComment(int commentId, String content) async {
    try {
      final response = await http.put(
        Uri.parse('$apiUrl/api/v1/comments/$commentId'),
        headers: _getHeaders(),
        body: jsonEncode({'content': content}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return PostComment.fromJson(data['comment']);
      } else {
        throw Exception('Failed to update comment: ${response.statusCode}');
      }
    } catch (e) {
      print('Error updating comment: $e');
      rethrow;
    }
  }

  /// Delete a comment
  Future<void> deleteComment(int commentId) async {
    try {
      final response = await http.delete(
        Uri.parse('$apiUrl/api/v1/comments/$commentId'),
        headers: _getHeaders(),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to delete comment: ${response.statusCode}');
      }
    } catch (e) {
      print('Error deleting comment: $e');
      rethrow;
    }
  }

  /// Get all likes for a post
  Future<List<PostLike>> getPostLikes(
    int postId, {
    int page = 1,
    int perPage = 15,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$apiUrl/api/v1/posts/$postId/likes?page=$page&per_page=$perPage'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> likes = data['likes'] ?? [];
        return likes.map((l) => PostLike.fromJson(l)).toList();
      } else {
        throw Exception('Failed to fetch likes: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching likes: $e');
      rethrow;
    }
  }

  /// Get all shares for a post
  Future<List<PostShare>> getPostShares(
    int postId, {
    int page = 1,
    int perPage = 15,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$apiUrl/api/v1/posts/$postId/shares?page=$page&per_page=$perPage'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> shares = data['shares'] ?? [];
        return shares.map((s) => PostShare.fromJson(s)).toList();
      } else {
        throw Exception('Failed to fetch shares: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching shares: $e');
      rethrow;
    }
  }

  /// Listen for engagement changes
  void onEngagementChanged(int postId, EngagementCallback callback) {
    _engagementListeners[postId] = callback;
  }

  /// Listen for comment changes
  void onCommentChanged(int postId, CommentCallback callback) {
    if (!_commentListeners.containsKey(postId)) {
      _commentListeners[postId] = [];
    }
    _commentListeners[postId]!.add(callback);
  }

  /// Listen for share changes
  void onShareChanged(int postId, ShareCallback callback) {
    if (!_shareListeners.containsKey(postId)) {
      _shareListeners[postId] = [];
    }
    _shareListeners[postId]!.add(callback);
  }

  /// Remove engagement listener
  void removeEngagementListener(int postId) {
    _engagementListeners.remove(postId);
  }

  /// Remove comment listeners
  void removeCommentListeners(int postId) {
    _commentListeners.remove(postId);
  }

  /// Remove share listeners
  void removeShareListeners(int postId) {
    _shareListeners.remove(postId);
  }

  /// Get headers for API requests
  Map<String, String> _getHeaders() {
    final headers = {'Content-Type': 'application/json'};
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  /// Check if socket is connected
  bool get isSocketConnected => _socketConnected;

  /// Disconnect socket
  void disconnect() {
    _socket?.disconnect();
  }

  /// Reconnect socket
  void reconnect() {
    _socket?.connect();
  }
}
