<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\FriendController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\ShopPostController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public routes
Route::prefix('v1')->group(function () {
    // Authentication
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Posts
    Route::get('/posts', [PostController::class, 'index']);
    Route::get('/posts/{id}', [PostController::class, 'show'])->where('id', '[0-9]+');
    Route::get('/posts/slug/{slug}', [PostController::class, 'bySlug']);
    Route::get('/posts/type/{type}', [PostController::class, 'byType']);

    // Users
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/search', [UserController::class, 'search']);
    Route::get('/users/{id}', [UserController::class, 'show'])->where('id', '[0-9]+');
    Route::get('/users/username/{username}', [UserController::class, 'byUsername']);

    // Shops (public)
    Route::get('/shops', [ShopController::class, 'index']);
    Route::get('/shops/{id}', [ShopController::class, 'show'])->where('id', '[0-9]+');

    // Shop Posts/Pages (public)
    Route::get('/shops/{shopId}/posts', [ShopPostController::class, 'index'])->where('shopId', '[0-9]+');
    Route::get('/shops/{shopId}/posts/{id}', [ShopPostController::class, 'show'])->where(['shopId' => '[0-9]+', 'id' => '[0-9]+']);
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

    // User Profile (authenticated)
    Route::put('/profile', [UserController::class, 'updateProfile']);
    Route::post('/profile/avatar', [UserController::class, 'uploadAvatar']);
    Route::put('/profile/password', [UserController::class, 'updatePassword']);

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
    });
});
