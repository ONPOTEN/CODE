<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\EngagementController;
use App\Http\Controllers\Api\FriendController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\GroupPostController;
use App\Http\Controllers\Api\GroupPostEngagementController;
use App\Http\Controllers\Api\GroupCommentController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\ShopPostController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WallPostModerationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public routes
Route::prefix('v1')->group(function () {
    // Authentication
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Firebase Authentication
    Route::post('/auth/firebase-register', [AuthController::class, 'firebaseRegister']);
    Route::post('/auth/firebase-login', [AuthController::class, 'firebaseLogin']);
    Route::post('/auth/test-reset-endpoint', [AuthController::class, 'testResetEndpoint']);
    Route::post('/auth/reset-password-by-phone', [AuthController::class, 'resetPasswordByPhone']);
    Route::post('/auth/setup-password-by-phone', [AuthController::class, 'setupPasswordByPhone']);

    // Debug endpoints
    Route::get('/debug/users-with-phone', [AuthController::class, 'debugUsersWithPhone']);
    Route::get('/debug/login-query', [AuthController::class, 'debugLoginQuery']);
    Route::get('/debug/test-auth', [AuthController::class, 'debugTestAuth']);
    Route::get('/debug/tokens', [AuthController::class, 'debugTokens']);
    Route::post('/debug/test-token', [AuthController::class, 'debugTestToken']);
    Route::get('/debug/password-reset', [AuthController::class, 'debugPasswordReset']);

    // Posts
    Route::get('/posts', [PostController::class, 'index']);
    Route::get('/posts/{id}', [PostController::class, 'show'])->where('id', '[0-9]+');
    Route::get('/posts/slug/{slug}', [PostController::class, 'bySlug']);
    Route::get('/posts/type/{type}', [PostController::class, 'byType']);

    // Comments (public)
    Route::get('/posts/{postId}/comments', [CommentController::class, 'getPostComments'])->where('postId', '[0-9]+');

    // Engagement stats (public)
    Route::get('/posts/{postId}/engagement', [EngagementController::class, 'getEngagementStats'])->where('postId', '[0-9]+');
    Route::get('/posts/{postId}/likes', [EngagementController::class, 'getPostLikes'])->where('postId', '[0-9]+');
    Route::get('/posts/{postId}/shares', [EngagementController::class, 'getPostShares'])->where('postId', '[0-9]+');

    // Users
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/search', [UserController::class, 'search']);
    Route::get('/users/{id}', [UserController::class, 'show'])->where('id', '[0-9]+');
    Route::get('/users/{id}/wall', [PostController::class, 'userWall'])->where('id', '[0-9]+');
    Route::get('/users/{id}/shared-wall', [PostController::class, 'sharedWall'])->where('id', '[0-9]+');
    Route::get('/users/username/{username}', [UserController::class, 'byUsername']);
    Route::get('/users/by-nickname/{nickname}', [UserController::class, 'byNickname']);
    Route::get('/users/by-phone', [UserController::class, 'byPhoneQuery']); // Query parameter version (preferred)
    Route::get('/users/by-phone/{phone}', [UserController::class, 'byPhone']); // Path parameter version (legacy)

    // Shops (public)
    Route::get('/shops', [ShopController::class, 'index']);
    Route::get('/shops/{id}', [ShopController::class, 'show'])->where('id', '[0-9]+');

    // Shop Posts/Pages (public)
    Route::get('/shops/{shopId}/posts', [ShopPostController::class, 'index'])->where('shopId', '[0-9]+');
    Route::get('/shops/{shopId}/posts/{id}', [ShopPostController::class, 'show'])->where(['shopId' => '[0-9]+', 'id' => '[0-9]+']);

    // Groups (public)
    Route::get('/groups', [GroupController::class, 'index']);
    Route::get('/groups/popular', [GroupController::class, 'popular']);
    Route::get('/groups/{group}', [GroupController::class, 'show']);
    Route::get('/users/{userId}/groups', [GroupController::class, 'userGroups'])->where('userId', '[0-9]+');

    // Group Posts (public)
    Route::get('/group-posts', [GroupPostController::class, 'index']);
    Route::get('/group-posts/popular', [GroupPostController::class, 'popular']);
    Route::get('/group-posts/{id}', [GroupPostController::class, 'show'])->where('id', '[0-9]+');
    Route::get('/group-posts/{id}/engagement', [GroupPostController::class, 'getEngagementStats'])->where('id', '[0-9]+');
    Route::get('/group-posts/{id}/likes', [GroupPostController::class, 'getLikes'])->where('id', '[0-9]+');
    Route::get('/groups/{groupId}/posts', [GroupPostController::class, 'groupPosts'])->where('groupId', '[0-9]+');
    Route::get('/users/{userId}/group-posts', [GroupPostController::class, 'userPosts'])->where('userId', '[0-9]+');

    // Group Post Comments (public - read only)
    Route::get('/group-posts/{postId}/comments', [GroupCommentController::class, 'index'])->where('postId', '[0-9]+');
    Route::get('/group-posts/{postId}/comments/{commentId}', [GroupCommentController::class, 'show'])->where(['postId' => '[0-9]+', 'commentId' => '[0-9]+']);
    Route::get('/group-posts/{postId}/comments/{commentId}/replies', [GroupCommentController::class, 'replies'])->where(['postId' => '[0-9]+', 'commentId' => '[0-9]+']);
});

// Protected routes
Route::middleware('auth:sanctum')->prefix('v1')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Posts (authenticated)
    Route::get('/my-posts', [PostController::class, 'myPosts']);
    Route::post('/posts', [PostController::class, 'store']);
    Route::post('/posts/{id}', [PostController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/posts/{id}', [PostController::class, 'destroy'])->where('id', '[0-9]+');
    Route::post('/posts/{id}/share-to-wall', [PostController::class, 'shareToWall'])->where('id', '[0-9]+');
    Route::delete('/posts/{id}/shared-wall', [PostController::class, 'deleteSharedPost'])->where('id', '[0-9]+');

    // Comments (authenticated)
    Route::post('/posts/{postId}/comments', [CommentController::class, 'storeComment'])->where('postId', '[0-9]+');
    Route::put('/comments/{commentId}', [CommentController::class, 'updateComment'])->where('commentId', '[0-9]+');
    Route::delete('/comments/{commentId}', [CommentController::class, 'deleteComment'])->where('commentId', '[0-9]+');

    // Engagement (authenticated) - WpPost engagement using EngagementController
    Route::prefix('posts')->group(function () {
        Route::post('/{postId}/like', [EngagementController::class, 'likePost'])->where('postId', '[0-9]+');
        Route::delete('/{postId}/like', [EngagementController::class, 'unlikePost'])->where('postId', '[0-9]+');
        Route::post('/{postId}/dislike', [EngagementController::class, 'dislikePost'])->where('postId', '[0-9]+');
        Route::delete('/{postId}/dislike', [EngagementController::class, 'removeDislikePost'])->where('postId', '[0-9]+');
        Route::post('/{postId}/share', [EngagementController::class, 'sharePost'])->where('postId', '[0-9]+');
    });

    // User Profile (authenticated)
    Route::put('/profile', [UserController::class, 'updateProfile']);
    Route::post('/profile/avatar', [UserController::class, 'uploadAvatar']);
    Route::put('/profile/password', [UserController::class, 'updatePassword']);
    Route::put('/profile/password-reset', [UserController::class, 'resetPasswordViaSMS']);

    // Friends (authenticated)
    Route::get('/friends', [FriendController::class, 'index']);
    Route::get('/friends/pending', [FriendController::class, 'pending']);
    Route::get('/friends/status/{userId}', [FriendController::class, 'status'])->where('userId', '[0-9]+');
    Route::post('/friends/request/{userId}', [FriendController::class, 'sendRequest'])->where('userId', '[0-9]+');
    Route::post('/friends/accept/{userId}', [FriendController::class, 'acceptRequest'])->where('userId', '[0-9]+');
    Route::post('/friends/reject/{userId}', [FriendController::class, 'rejectRequest'])->where('userId', '[0-9]+');
    Route::delete('/friends/unfriend/{userId}', [FriendController::class, 'unfriend'])->where('userId', '[0-9]+');

    // Shops (authenticated)
    Route::get('/my-shops', [ShopController::class, 'myShops']);
    Route::post('/shops', [ShopController::class, 'store']);
    Route::put('/shops/{id}', [ShopController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/shops/{id}', [ShopController::class, 'destroy'])->where('id', '[0-9]+');

    // Shop Posts/Pages (authenticated)
    Route::post('/shops/{shopId}/posts', [ShopPostController::class, 'store'])->where('shopId', '[0-9]+');
    Route::put('/shops/{shopId}/posts/{id}', [ShopPostController::class, 'update'])->where(['shopId' => '[0-9]+', 'id' => '[0-9]+']);
    Route::delete('/shops/{shopId}/posts/{id}', [ShopPostController::class, 'destroy'])->where(['shopId' => '[0-9]+', 'id' => '[0-9]+']);

    // Groups (authenticated)
    Route::post('/groups', [GroupController::class, 'store']);
    Route::get('/my-groups', [GroupController::class, 'myGroups']);
    Route::post('/groups/bulk-delete', [GroupController::class, 'bulkDelete']);
    Route::post('/groups/{group}', [GroupController::class, 'update']);
    Route::delete('/groups/{group}', [GroupController::class, 'destroy']);
    Route::get('/groups/{group}/check-membership', [GroupController::class, 'checkMembership']);
    Route::post('/groups/{group}/join', [GroupController::class, 'joinGroup']);
    Route::post('/groups/{group}/leave', [GroupController::class, 'leaveGroup']);
    Route::get('/groups/{group}/pending-requests', [GroupController::class, 'getPendingRequests']);
    Route::post('/groups/{group}/requests/{userId}/accept', [GroupController::class, 'acceptJoinRequest']);
    Route::post('/groups/{group}/requests/{userId}/reject', [GroupController::class, 'rejectJoinRequest']);
    Route::get('/groups/{group}/members', [GroupController::class, 'getMembers']);
    Route::delete('/groups/{group}/members/{userId}', [GroupController::class, 'removeMember']);

    // Group Posts (authenticated)
    Route::post('/group-posts', [GroupPostController::class, 'store']);
    Route::post('/group-posts/bulk-delete', [GroupPostController::class, 'bulkDelete']);
    Route::post('/group-posts/{id}', [GroupPostController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/group-posts/{id}', [GroupPostController::class, 'destroy'])->where('id', '[0-9]+');

    // Group Post Engagement (authenticated)
    Route::post('/group-posts/{id}/like', [GroupPostController::class, 'like'])->where('id', '[0-9]+');
    Route::delete('/group-posts/{id}/like', [GroupPostController::class, 'unlike'])->where('id', '[0-9]+');
    Route::post('/group-posts/{id}/dislike', [GroupPostController::class, 'dislike'])->where('id', '[0-9]+');
    Route::delete('/group-posts/{id}/dislike', [GroupPostController::class, 'removeDislike'])->where('id', '[0-9]+');
    Route::post('/group-posts/{id}/featured-image', [GroupPostController::class, 'setFeaturedImage'])->where('id', '[0-9]+');
    Route::post('/group-posts/{id}/share-to-wall', [GroupPostController::class, 'shareToWall'])->where('id', '[0-9]+');

    // Group Post Engagement API v2 (using dedicated engagement controller)
    Route::prefix('group-posts')->group(function () {
        Route::post('/{postId}/engage/like', [GroupPostEngagementController::class, 'likePost'])->where('postId', '[0-9]+');
        Route::delete('/{postId}/engage/like', [GroupPostEngagementController::class, 'unlikePost'])->where('postId', '[0-9]+');
        Route::post('/{postId}/engage/dislike', [GroupPostEngagementController::class, 'dislikePost'])->where('postId', '[0-9]+');
        Route::delete('/{postId}/engage/dislike', [GroupPostEngagementController::class, 'removeDislikePost'])->where('postId', '[0-9]+');
        Route::post('/{postId}/engage/share', [GroupPostEngagementController::class, 'sharePost'])->where('postId', '[0-9]+');
        Route::get('/{postId}/engage/stats', [GroupPostEngagementController::class, 'getEngagementStats'])->where('postId', '[0-9]+');
        Route::get('/{postId}/engage/likes', [GroupPostEngagementController::class, 'getPostLikes'])->where('postId', '[0-9]+');
        Route::get('/{postId}/engage/shares', [GroupPostEngagementController::class, 'getPostShares'])->where('postId', '[0-9]+');
    });

    // Group Post Comments (authenticated - read, create, update, delete)
    Route::post('/group-posts/{postId}/comments', [GroupCommentController::class, 'store'])->where('postId', '[0-9]+');
    Route::put('/group-posts/{postId}/comments/{commentId}', [GroupCommentController::class, 'update'])->where(['postId' => '[0-9]+', 'commentId' => '[0-9]+']);
    Route::delete('/group-posts/{postId}/comments/{commentId}', [GroupCommentController::class, 'destroy'])->where(['postId' => '[0-9]+', 'commentId' => '[0-9]+']);

    // Wall Post Moderation (authenticated - for current user's wall)
    Route::prefix('wall-posts')->group(function () {
        Route::get('/', [WallPostModerationController::class, 'index']);
        Route::get('/pending-count', [WallPostModerationController::class, 'pendingCount']);
        Route::get('/statistics', [WallPostModerationController::class, 'statistics']);
        Route::get('/{wallPostId}', [WallPostModerationController::class, 'show'])->where('wallPostId', '[0-9]+');
        Route::post('/{wallPostId}/accept', [WallPostModerationController::class, 'accept'])->where('wallPostId', '[0-9]+');
        Route::post('/{wallPostId}/reject', [WallPostModerationController::class, 'reject'])->where('wallPostId', '[0-9]+');
        Route::post('/batch-action', [WallPostModerationController::class, 'batchAction']);
    });

    // Chat routes (authenticated)
    Route::get('/conversations', [ChatController::class, 'getConversations']);
    Route::get('/conversations/with/{userId}', [ChatController::class, 'getOrCreateConversation'])->where('userId', '[0-9]+');
    Route::get('/conversations/{conversationId}/messages', [ChatController::class, 'getMessages'])->where('conversationId', '[0-9]+');
    Route::post('/conversations/{conversationId}/messages', [ChatController::class, 'sendMessage'])->where('conversationId', '[0-9]+');
    Route::put('/conversations/{conversationId}/messages/{messageId}', [ChatController::class, 'editMessage'])->where(['conversationId' => '[0-9]+', 'messageId' => '[0-9]+']);
    Route::delete('/conversations/{conversationId}/messages/{messageId}', [ChatController::class, 'deleteMessage'])->where(['conversationId' => '[0-9]+', 'messageId' => '[0-9]+']);
    Route::get('/conversations/{conversationId}/stats', [ChatController::class, 'getConversationStats'])->where('conversationId', '[0-9]+');
    Route::get('/conversations/{conversationId}/search', [ChatController::class, 'searchMessages'])->where('conversationId', '[0-9]+');
    Route::post('/conversations/{conversationId}/messages/delivered', [ChatController::class, 'markAsDelivered'])->where('conversationId', '[0-9]+');

    // Admin routes
    Route::middleware('admin')->group(function () {
        // Shop management
        Route::get('/admin/shops', [ShopController::class, 'pendingShops']);
        Route::get('/admin/shops/pending', [ShopController::class, 'pendingShops']);
        Route::post('/admin/shops/{id}/approve', [ShopController::class, 'approve'])->where('id', '[0-9]+');
        Route::post('/admin/shops/{id}/reject', [ShopController::class, 'reject'])->where('id', '[0-9]+');

        // User role management
        Route::get('/admin/users', [UserController::class, 'getAllUsersWithRoles']);
        Route::put('/admin/users/{userId}/role', [UserController::class, 'updateUserRole'])->where('userId', '[0-9]+');
        Route::post('/admin/users/roles/bulk-update', [UserController::class, 'bulkUpdateRoles']);

        // Comment moderation
        Route::post('/admin/comments/{commentId}/approve', [CommentController::class, 'approveComment'])->where('commentId', '[0-9]+');
        Route::post('/admin/comments/{commentId}/reject', [CommentController::class, 'rejectComment'])->where('commentId', '[0-9]+');

        // Group Post Comment moderation
        Route::post('/admin/group-posts/{postId}/comments/{commentId}/approve', [GroupCommentController::class, 'approve'])->where(['postId' => '[0-9]+', 'commentId' => '[0-9]+']);
        Route::post('/admin/group-posts/{postId}/comments/{commentId}/reject', [GroupCommentController::class, 'reject'])->where(['postId' => '[0-9]+', 'commentId' => '[0-9]+']);

        // Group Post Comment moderation (admin only)
    });

    // Group Post moderation - group owner/admin/moderator approve or reject posts
    Route::get('/groups/{group}/posts/pending', [GroupPostController::class, 'getPendingPosts']);
    Route::post('/groups/{groupId}/posts/{postId}/approve', [GroupPostController::class, 'approvePost'])->where(['groupId' => '[0-9]+', 'postId' => '[0-9]+']);
    Route::post('/groups/{groupId}/posts/{postId}/reject', [GroupPostController::class, 'rejectPost'])->where(['groupId' => '[0-9]+', 'postId' => '[0-9]+']);
});
