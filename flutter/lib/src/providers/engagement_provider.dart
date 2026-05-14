/// Engagement Provider for managing engagement state
/// Handles state management for likes, dislikes, comments, and shares

import 'package:flutter/material.dart';
import '../models/engagement.dart';
import '../services/engagement_service.dart';
import '../services/api_config.dart';
import '../services/auth_storage.dart';

class EngagementProvider extends ChangeNotifier {
  final EngagementService _service = EngagementService();

  // State maps
  final Map<int, Engagement> _engagements = {};
  final Map<int, List<PostComment>> _comments = {};
  final Map<int, List<PostShare>> _shares = {};
  final Map<int, List<PostLike>> _likes = {};

  // Loading states
  final Set<int> _loadingEngagement = {};
  final Set<int> _loadingComments = {};
  final Set<int> _loadingShares = {};
  final Set<int> _loadingLikes = {};
  final Set<int> _loadingLikeAction = {};
  final Set<int> _loadingDislikeAction = {};

  // Real-time connection state
  bool _socketConnected = false;
  String? _socketError;
  bool _isInitialized = false;
  bool _isInitializing = false;

  // Getters
  Map<int, Engagement> get engagements => _engagements;
  Map<int, List<PostComment>> get comments => _comments;
  Map<int, List<PostShare>> get shares => _shares;
  Map<int, List<PostLike>> get likes => _likes;
  bool get socketConnected => _socketConnected;
  String? get socketError => _socketError;

  // Get engagement for post
  Engagement? getEngagement(int postId) => _engagements[postId];

  // Get comments for post
  List<PostComment> getComments(int postId) => _comments[postId] ?? [];

  // Check if loading engagement
  bool isLoadingEngagement(int postId) => _loadingEngagement.contains(postId);

  // Check if loading comments
  bool isLoadingComments(int postId) => _loadingComments.contains(postId);

  // Check if loading like action
  bool isLoadingLikeAction(int postId) => _loadingLikeAction.contains(postId);

  // Check if loading dislike action
  bool isLoadingDislikeAction(int postId) => _loadingDislikeAction.contains(postId);

  /// Initialize the engagement provider
  Future<void> initialize({
    required String apiUrl,
    required String socketUrl,
    String? token,
  }) async {
    try {
      await _service.initialize(
        apiUrl: apiUrl,
        socketUrl: socketUrl,
        token: token,
      );

      _socketConnected = _service.isSocketConnected;
      _socketError = null;
      _isInitialized = true;

      notifyListeners();
    } catch (e) {
      _socketError = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  /// Determine if we should use socket count or keep current count
  /// Socket handlers send ONLY the specific count they updated (likes, dislikes, etc.)
  /// Problem: Can't distinguish "count is 0" from "field not sent (default 0)"
  /// Solution: Use a heuristic based on the value difference
  int _shouldUpdateCount(int socketCount, int currentCount) {
    // If socket value equals current, might be duplicate or not updated
    if (socketCount == currentCount) {
      return currentCount; // No change, keep current
    }
    // Socket value differs from current - definitely an update
    // Use the socket value (server is authoritative, even if 0)
    return socketCount;
  }

  /// Lazy initialization - Initialize if not already done
  Future<void> _ensureInitialized() async {
    if (_isInitialized || _isInitializing) {
      return;
    }

    _isInitializing = true;

    try {
      final token = await AuthStorage.getToken();
      // Extract base URL without /api/v1 (ApiConfig.baseUrl already includes /api/v1)
      // EngagementService expects just the base URL
      final baseUrlWithoutApi = ApiConfig.baseUrl.replaceAll('/api/v1', '');
      print('EngagementProvider - Base URL before: ${ApiConfig.baseUrl}');
      print('EngagementProvider - Base URL after: $baseUrlWithoutApi');
      print('EngagementProvider - Token: ${token != null ? "exists" : "null"}');
      await initialize(
        apiUrl: baseUrlWithoutApi,
        socketUrl: 'https://socket.centimet2.com',
        token: token,
      );
      print('EngagementProvider - Initialized successfully');
    } catch (e) {
      print('Error in lazy initialization: $e');
      _isInitializing = false;
      rethrow;
    }

    _isInitializing = false;
  }

  /// Fetch engagement stats for a post
  Future<void> fetchEngagementStats(int postId) async {
    try {
      // Ensure provider is initialized
      await _ensureInitialized();

      _loadingEngagement.add(postId);
      notifyListeners();

      print('═══════════════════════════════════════════════════════════');
      print('🔄 [FETCH ENGAGEMENT] Starting fetch for post #$postId');
      print('═══════════════════════════════════════════════════════════');

      final engagement = await _service.getEngagementStats(postId);

      print('✅ [API RESPONSE] Raw engagement data received:');
      print('   - Post ID: ${engagement.postId}');
      print('   - Like Count: ${engagement.likeCount}');
      print('   - Dislike Count: ${engagement.dislikeCount}');
      print('   - Comment Count: ${engagement.commentCount}');
      print('   - Share Count: ${engagement.shareCount}');
      print('   - User Liked: ${engagement.userLiked}');
      print('   - User Disliked: ${engagement.userDisliked}');

      _engagements[postId] = engagement;

      print('💾 [STATE SAVED] Engagement saved to provider for post #$postId');
      print('───────────────────────────────────────────────────────────');

      // Listen for real-time changes via Socket.io
      // Socket handlers send partial Engagement objects with only updated field(s)
      _service.onEngagementChanged(postId, (updatedEngagement) {
        final currentEngagement = _engagements[postId];
        if (currentEngagement != null) {
          // Merge socket update with current engagement, preserving fields that weren't updated
          // Socket handlers set ONLY the updated count and leave others at default 0/false
          // We need to use current values for any field that's still at default

          final mergedEngagement = Engagement(
            postId: currentEngagement.postId,
            // If socket sent a non-zero count, use it. Otherwise keep current value.
            // Special case: if socket count is 0 and current is > 0, socket is authoritative
            // So we accept any count value from socket (even 0) since handlers only send updated fields
            likeCount: _shouldUpdateCount(updatedEngagement.likeCount, currentEngagement.likeCount),
            dislikeCount: _shouldUpdateCount(updatedEngagement.dislikeCount, currentEngagement.dislikeCount),
            commentCount: _shouldUpdateCount(updatedEngagement.commentCount, currentEngagement.commentCount),
            shareCount: _shouldUpdateCount(updatedEngagement.shareCount, currentEngagement.shareCount),
            // Important: Socket handlers DON'T send userLiked/userDisliked
            // (only counts are sent for other users' actions)
            // So we always keep the current user state unchanged
            // User's own state is updated via API responses in toggleLike/toggleDislike
            userLiked: currentEngagement.userLiked,
            userDisliked: currentEngagement.userDisliked,
          );

          _engagements[postId] = mergedEngagement;
          print('EngagementProvider - Socket update for post $postId: Likes=${mergedEngagement.likeCount}, Dislikes=${mergedEngagement.dislikeCount}, Comments=${mergedEngagement.commentCount}, Shares=${mergedEngagement.shareCount}');
        } else {
          _engagements[postId] = updatedEngagement;
          print('EngagementProvider - New engagement data for post $postId: Likes=${updatedEngagement.likeCount}, Dislikes=${updatedEngagement.dislikeCount}');
        }
        notifyListeners();
      });

      notifyListeners();
    } catch (e) {
      print('EngagementProvider - Error fetching engagement stats for post $postId: $e');
      // Create default empty engagement on error so UI doesn't break
      _engagements[postId] = Engagement(postId: postId);
      _loadingEngagement.remove(postId);
      notifyListeners();
      // Don't rethrow - gracefully handle the error
    } finally {
      _loadingEngagement.remove(postId);
      notifyListeners();
    }
  }

  /// Toggle like on a post
  /// Automatically removes dislike if present (mutual exclusion)
  Future<void> toggleLike(int postId) async {
    try {
      await _ensureInitialized();

      _loadingLikeAction.add(postId);
      notifyListeners();

      final currentEngagement = _engagements[postId];

      print('\n═══════════════════════════════════════════════════════════');
      print('👍 [TOGGLE LIKE] Starting like toggle for post #$postId');
      print('═══════════════════════════════════════════════════════════');
      print('📊 [CURRENT STATE] Before API call:');
      print('   - Like Count: ${currentEngagement?.likeCount}');
      print('   - Dislike Count: ${currentEngagement?.dislikeCount}');
      print('   - Comment Count: ${currentEngagement?.commentCount}');
      print('   - Share Count: ${currentEngagement?.shareCount}');
      print('   - User Liked: ${currentEngagement?.userLiked}');
      print('   - User Disliked: ${currentEngagement?.userDisliked}');

      if (currentEngagement?.userLiked ?? false) {
        // Unlike
        print('🔄 [ACTION] User is UNLIKING (removing their like)');
        final apiResponse = await _service.unlikePost(postId);

        print('✅ [API RESPONSE] Unlike API response received:');
        print('   - Like Count: ${apiResponse.likeCount}');
        print('   - Dislike Count: ${apiResponse.dislikeCount}');
        print('   - Comment Count: ${apiResponse.commentCount}');
        print('   - Share Count: ${apiResponse.shareCount}');
        print('   - User Liked: ${apiResponse.userLiked}');
        print('   - User Disliked: ${apiResponse.userDisliked}');

        // Merge API response with current state to preserve other counts
        final merged = currentEngagement!.copyWith(
          likeCount: apiResponse.likeCount,
          dislikeCount: apiResponse.dislikeCount,
          userLiked: apiResponse.userLiked,
          userDisliked: apiResponse.userDisliked,
        );

        print('🔗 [MERGE] Merging API response with current state:');
        print('   - OLD Like Count: ${currentEngagement.likeCount}');
        print('   - NEW Like Count: ${merged.likeCount}');
        print('   - OLD Dislike Count: ${currentEngagement.dislikeCount}');
        print('   - NEW Dislike Count: ${merged.dislikeCount}');
        print('   - OLD Comment Count: ${currentEngagement.commentCount}');
        print('   - NEW Comment Count: ${merged.commentCount}');
        print('   - OLD Share Count: ${currentEngagement.shareCount}');
        print('   - NEW Share Count: ${merged.shareCount}');

        _engagements[postId] = merged;

        print('💾 [STATE UPDATED] After unlike:');
        print('   - Like Count: ${merged.likeCount}');
        print('   - Dislike Count: ${merged.dislikeCount}');
        print('   - Comment Count: ${merged.commentCount}');
        print('   - Share Count: ${merged.shareCount}');
        print('   - User Liked: ${merged.userLiked}');
        print('   - User Disliked: ${merged.userDisliked}');
      } else {
        // Like - will automatically remove dislike on server
        print('🔄 [ACTION] User is LIKING the post');
        print('   - Note: Server will auto-remove dislike if present');
        final apiResponse = await _service.likePost(postId);

        print('✅ [API RESPONSE] Like API response received:');
        print('   - Like Count: ${apiResponse.likeCount}');
        print('   - Dislike Count: ${apiResponse.dislikeCount}');
        print('   - Comment Count: ${apiResponse.commentCount}');
        print('   - Share Count: ${apiResponse.shareCount}');
        print('   - User Liked: ${apiResponse.userLiked}');
        print('   - User Disliked: ${apiResponse.userDisliked}');

        // Merge API response with current state to preserve other counts
        final merged = currentEngagement!.copyWith(
          likeCount: apiResponse.likeCount,
          dislikeCount: apiResponse.dislikeCount,
          userLiked: apiResponse.userLiked,
          userDisliked: apiResponse.userDisliked,
        );

        print('🔗 [MERGE] Merging API response with current state:');
        print('   - OLD Like Count: ${currentEngagement.likeCount}');
        print('   - NEW Like Count: ${merged.likeCount}');
        print('   - OLD Dislike Count: ${currentEngagement.dislikeCount}');
        print('   - NEW Dislike Count: ${merged.dislikeCount}');
        print('   - OLD Comment Count: ${currentEngagement.commentCount}');
        print('   - NEW Comment Count: ${merged.commentCount}');
        print('   - OLD Share Count: ${currentEngagement.shareCount}');
        print('   - NEW Share Count: ${merged.shareCount}');

        _engagements[postId] = merged;

        print('💾 [STATE UPDATED] After like:');
        print('   - Like Count: ${merged.likeCount}');
        print('   - Dislike Count: ${merged.dislikeCount}');
        print('   - Comment Count: ${merged.commentCount}');
        print('   - Share Count: ${merged.shareCount}');
        print('   - User Liked: ${merged.userLiked}');
        print('   - User Disliked: ${merged.userDisliked}');
      }

      print('───────────────────────────────────────────────────────────');
      notifyListeners();
    } catch (e) {
      print('❌ [ERROR] Error toggling like: $e');
      print('🔄 [RECOVERY] Re-fetching engagement stats to sync with server');
      // Re-fetch engagement stats to sync with server
      try {
        await fetchEngagementStats(postId);
      } catch (_) {}
    } finally {
      _loadingLikeAction.remove(postId);
      notifyListeners();
    }
  }

  /// Toggle dislike on a post
  /// Automatically removes like if present (mutual exclusion)
  Future<void> toggleDislike(int postId) async {
    try {
      await _ensureInitialized();

      _loadingDislikeAction.add(postId);
      notifyListeners();

      final currentEngagement = _engagements[postId];

      print('\n═══════════════════════════════════════════════════════════');
      print('👎 [TOGGLE DISLIKE] Starting dislike toggle for post #$postId');
      print('═══════════════════════════════════════════════════════════');
      print('📊 [CURRENT STATE] Before API call:');
      print('   - Like Count: ${currentEngagement?.likeCount}');
      print('   - Dislike Count: ${currentEngagement?.dislikeCount}');
      print('   - Comment Count: ${currentEngagement?.commentCount}');
      print('   - Share Count: ${currentEngagement?.shareCount}');
      print('   - User Liked: ${currentEngagement?.userLiked}');
      print('   - User Disliked: ${currentEngagement?.userDisliked}');

      if (currentEngagement?.userDisliked ?? false) {
        // Remove dislike
        print('🔄 [ACTION] User is REMOVING DISLIKE');
        final apiResponse = await _service.removeDislikePost(postId);

        print('✅ [API RESPONSE] Remove dislike API response received:');
        print('   - Like Count: ${apiResponse.likeCount}');
        print('   - Dislike Count: ${apiResponse.dislikeCount}');
        print('   - Comment Count: ${apiResponse.commentCount}');
        print('   - Share Count: ${apiResponse.shareCount}');
        print('   - User Liked: ${apiResponse.userLiked}');
        print('   - User Disliked: ${apiResponse.userDisliked}');

        // Merge API response with current state to preserve other counts
        final merged = currentEngagement!.copyWith(
          likeCount: apiResponse.likeCount,
          dislikeCount: apiResponse.dislikeCount,
          userDisliked: apiResponse.userDisliked,
          userLiked: apiResponse.userLiked,
        );

        print('🔗 [MERGE] Merging API response with current state:');
        print('   - OLD Like Count: ${currentEngagement.likeCount}');
        print('   - NEW Like Count: ${merged.likeCount}');
        print('   - OLD Comment Count: ${currentEngagement.commentCount}');
        print('   - NEW Comment Count: ${merged.commentCount}');
        print('   - OLD Share Count: ${currentEngagement.shareCount}');
        print('   - NEW Share Count: ${merged.shareCount}');

        _engagements[postId] = merged;

        print('💾 [STATE UPDATED] After remove dislike:');
        print('   - Like Count: ${merged.likeCount}');
        print('   - Dislike Count: ${merged.dislikeCount}');
        print('   - Comment Count: ${merged.commentCount}');
        print('   - Share Count: ${merged.shareCount}');
        print('   - User Liked: ${merged.userLiked}');
        print('   - User Disliked: ${merged.userDisliked}');
      } else {
        // Dislike - will automatically remove like on server
        print('🔄 [ACTION] User is DISLIKING the post');
        print('   - Note: Server will auto-remove like if present');
        final apiResponse = await _service.dislikePost(postId);

        print('✅ [API RESPONSE] Dislike API response received:');
        print('   - Like Count: ${apiResponse.likeCount}');
        print('   - Dislike Count: ${apiResponse.dislikeCount}');
        print('   - Comment Count: ${apiResponse.commentCount}');
        print('   - Share Count: ${apiResponse.shareCount}');
        print('   - User Liked: ${apiResponse.userLiked}');
        print('   - User Disliked: ${apiResponse.userDisliked}');

        // Merge API response with current state to preserve other counts
        final merged = currentEngagement!.copyWith(
          likeCount: apiResponse.likeCount,
          dislikeCount: apiResponse.dislikeCount,
          userDisliked: apiResponse.userDisliked,
          userLiked: apiResponse.userLiked,
        );

        print('🔗 [MERGE] Merging API response with current state:');
        print('   - OLD Like Count: ${currentEngagement.likeCount}');
        print('   - NEW Like Count: ${merged.likeCount}');
        print('   - OLD Comment Count: ${currentEngagement.commentCount}');
        print('   - NEW Comment Count: ${merged.commentCount}');
        print('   - OLD Share Count: ${currentEngagement.shareCount}');
        print('   - NEW Share Count: ${merged.shareCount}');

        _engagements[postId] = merged;

        print('💾 [STATE UPDATED] After dislike:');
        print('   - Like Count: ${merged.likeCount}');
        print('   - Dislike Count: ${merged.dislikeCount}');
        print('   - Comment Count: ${merged.commentCount}');
        print('   - Share Count: ${merged.shareCount}');
        print('   - User Liked: ${merged.userLiked}');
        print('   - User Disliked: ${merged.userDisliked}');
      }

      print('───────────────────────────────────────────────────────────');
      notifyListeners();
    } catch (e) {
      print('❌ [ERROR] Error toggling dislike: $e');
      print('🔄 [RECOVERY] Re-fetching engagement stats to sync with server');
      // Re-fetch engagement stats to sync with server
      try {
        await fetchEngagementStats(postId);
      } catch (_) {}
    } finally {
      _loadingDislikeAction.remove(postId);
      notifyListeners();
    }
  }

  /// Share a post
  Future<void> sharePost(int postId, {String platform = 'direct'}) async {
    try {
      await _ensureInitialized();
      print('EngagementProvider - Sharing post $postId via $platform');
      await _service.sharePost(postId, sharedVia: platform);

      // Refresh engagement stats
      await fetchEngagementStats(postId);
      print('EngagementProvider - Share successful');
    } catch (e) {
      print('EngagementProvider - Error sharing post: $e');
      // Refresh stats anyway to sync with server
      try {
        await fetchEngagementStats(postId);
      } catch (_) {}
      rethrow;
    }
  }

  /// Fetch comments for a post
  Future<void> fetchComments(int postId, {int page = 1}) async {
    try {
      await _ensureInitialized();

      _loadingComments.add(postId);
      notifyListeners();

      final commentList = await _service.getPostComments(postId, page: page);
      _comments[postId] = commentList;

      // Listen for comment changes
      _service.onCommentChanged(postId, (comment) {
        if (comment.content.isEmpty) {
          // Comment removed
          _comments[postId]?.removeWhere((c) => c.id == comment.id);
        } else {
          // Comment added or updated
          final index = _comments[postId]?.indexWhere((c) => c.id == comment.id);
          if (index != null && index >= 0) {
            _comments[postId]![index] = comment;
          } else {
            _comments[postId]?.insert(0, comment);
          }
        }
        notifyListeners();
      });

      notifyListeners();
    } finally {
      _loadingComments.remove(postId);
      notifyListeners();
    }
  }

  /// Add a comment
  Future<void> addComment(
    int postId,
    String content, {
    int? parentId,
  }) async {
    try {
      final comment = await _service.createComment(postId, content, parentId: parentId);

      if (_comments.containsKey(postId)) {
        _comments[postId]!.insert(0, comment);
      } else {
        _comments[postId] = [comment];
      }

      // Update engagement comment count
      final engagement = _engagements[postId];
      if (engagement != null) {
        _engagements[postId] = engagement.copyWith(
          commentCount: engagement.commentCount + 1,
        );
      }

      notifyListeners();
    } catch (e) {
      print('Error adding comment: $e');
      rethrow;
    }
  }

  /// Update a comment
  Future<void> updateComment(int commentId, String content) async {
    try {
      final updated = await _service.updateComment(commentId, content);

      // Update in state
      for (var postComments in _comments.values) {
        final index = postComments.indexWhere((c) => c.id == commentId);
        if (index >= 0) {
          postComments[index] = updated;
          break;
        }
      }

      notifyListeners();
    } catch (e) {
      print('Error updating comment: $e');
      rethrow;
    }
  }

  /// Delete a comment
  Future<void> deleteComment(int postId, int commentId) async {
    try {
      await _service.deleteComment(commentId);

      _comments[postId]?.removeWhere((c) => c.id == commentId);

      // Update engagement comment count
      final engagement = _engagements[postId];
      if (engagement != null) {
        _engagements[postId] = engagement.copyWith(
          commentCount: engagement.commentCount - 1,
        );
      }

      notifyListeners();
    } catch (e) {
      print('Error deleting comment: $e');
      rethrow;
    }
  }

  /// Fetch likes for a post
  Future<void> fetchLikes(int postId, {int page = 1}) async {
    try {
      _loadingLikes.add(postId);
      notifyListeners();

      final likeList = await _service.getPostLikes(postId, page: page);
      _likes[postId] = likeList;

      notifyListeners();
    } finally {
      _loadingLikes.remove(postId);
      notifyListeners();
    }
  }

  /// Fetch shares for a post
  Future<void> fetchShares(int postId, {int page = 1}) async {
    try {
      _loadingShares.add(postId);
      notifyListeners();

      final shareList = await _service.getPostShares(postId, page: page);
      _shares[postId] = shareList;

      notifyListeners();
    } finally {
      _loadingShares.remove(postId);
      notifyListeners();
    }
  }

  /// Dispose
  @override
  void dispose() {
    _service.disconnect();
    super.dispose();
  }
}
