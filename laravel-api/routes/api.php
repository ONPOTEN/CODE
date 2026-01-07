<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\EngagementController;
use App\Http\Controllers\Api\FriendController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\GroupMessageController;
use App\Http\Controllers\Api\GroupPostController;
use App\Http\Controllers\Api\GroupPostEngagementController;
use App\Http\Controllers\Api\GroupCommentController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\QRCodeController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\S3Controller;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\StaticPageController;
use App\Http\Controllers\Api\ShopPaymentSettingController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\ShopPostController;
use App\Http\Controllers\Api\ShopPostEngagementController;
use App\Http\Controllers\Api\ShopMessageController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WallPostModerationController;
use App\Http\Controllers\ShareImageController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public routes
Route::prefix('v1')->group(function () {
    // Authentication (with strict rate limiting to prevent brute force)
    Route::post('/auth/register', [AuthController::class, 'register'])
        ->middleware('throttle.advanced:auth');
    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle.advanced:auth');
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Firebase Authentication (with rate limiting)
    Route::post('/auth/firebase-register', [AuthController::class, 'firebaseRegister'])
        ->middleware('throttle.advanced:auth');
    Route::post('/auth/firebase-login', [AuthController::class, 'firebaseLogin'])
        ->middleware('throttle.advanced:auth');
    Route::post('/auth/test-reset-endpoint', [AuthController::class, 'testResetEndpoint'])
        ->middleware('throttle.advanced:auth');
    Route::post('/auth/reset-password-by-phone', [AuthController::class, 'resetPasswordByPhone'])
        ->middleware('throttle.advanced:auth');
    Route::post('/auth/setup-password-by-phone', [AuthController::class, 'setupPasswordByPhone'])
        ->middleware('throttle.advanced:auth');

    // Facebook OAuth (with rate limiting)
    Route::post('/auth/facebook-login', [AuthController::class, 'facebookLogin'])
        ->middleware('throttle.advanced:auth');

    // Google OAuth (with rate limiting)
    Route::post('/auth/google-login', [AuthController::class, 'googleLogin'])
        ->middleware('throttle.advanced:auth');

    // SECURITY: Debug endpoints - DISABLE in production or add authentication!
    // WARNING: These expose sensitive information and should be protected
    Route::middleware('throttle.advanced:debug')->group(function () {
        Route::get('/debug/users-with-phone', [AuthController::class, 'debugUsersWithPhone']);
        Route::get('/debug/login-query', [AuthController::class, 'debugLoginQuery']);
        Route::get('/debug/test-auth', [AuthController::class, 'debugTestAuth']);
        Route::get('/debug/tokens', [AuthController::class, 'debugTokens']);
        Route::post('/debug/test-token', [AuthController::class, 'debugTestToken']);
        Route::get('/debug/password-reset', [AuthController::class, 'debugPasswordReset']);
        Route::get('/debug/php-limits', function () {
            return response()->json([
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'post_max_size' => ini_get('post_max_size'),
                'max_execution_time' => ini_get('max_execution_time'),
                'max_input_time' => ini_get('max_input_time'),
                'memory_limit' => ini_get('memory_limit'),
                'file_uploads' => ini_get('file_uploads'),
                'max_file_uploads' => ini_get('max_file_uploads'),
                'upload_tmp_dir' => ini_get('upload_tmp_dir') ?: sys_get_temp_dir(),
                'temp_dir_writable' => is_writable(ini_get('upload_tmp_dir') ?: sys_get_temp_dir()),
            ]);
        });

        // Debug video upload endpoint
        Route::post('/debug/upload-video', function (\Illuminate\Http\Request $request) {
            $response = [
                'php_limits' => [
                    'upload_max_filesize' => ini_get('upload_max_filesize'),
                    'post_max_size' => ini_get('post_max_size'),
                    'max_execution_time' => ini_get('max_execution_time'),
                    'memory_limit' => ini_get('memory_limit'),
                ],
                'request_info' => [
                    'content_length' => $request->header('Content-Length'),
                    'content_type' => $request->header('Content-Type'),
                    'method' => $request->method(),
                ],
                'files_info' => [],
                'all_files_keys' => array_keys($request->allFiles()),
                'all_input_keys' => array_keys($request->all()),
                'errors' => [],
            ];

            // Check all uploaded files
            $allFiles = $request->allFiles();
            foreach ($allFiles as $key => $file) {
                if (is_array($file)) {
                    foreach ($file as $index => $f) {
                        $response['files_info']["{$key}[{$index}]"] = [
                            'original_name' => $f->getClientOriginalName(),
                            'size' => $f->getSize(),
                            'size_mb' => round($f->getSize() / 1024 / 1024, 2),
                            'mime_type' => $f->getMimeType(),
                            'extension' => $f->getClientOriginalExtension(),
                            'error' => $f->getError(),
                            'error_message' => $f->getErrorMessage(),
                            'is_valid' => $f->isValid(),
                            'real_path' => $f->getRealPath(),
                            'real_path_exists' => $f->getRealPath() ? file_exists($f->getRealPath()) : false,
                        ];
                        if (!$f->isValid()) {
                            $response['errors'][] = "{$key}[{$index}]: " . $f->getErrorMessage();
                        }
                    }
                } else {
                    $response['files_info'][$key] = [
                        'original_name' => $file->getClientOriginalName(),
                        'size' => $file->getSize(),
                        'size_mb' => round($file->getSize() / 1024 / 1024, 2),
                        'mime_type' => $file->getMimeType(),
                        'extension' => $file->getClientOriginalExtension(),
                        'error' => $file->getError(),
                        'error_message' => $file->getErrorMessage(),
                        'is_valid' => $file->isValid(),
                        'real_path' => $file->getRealPath(),
                        'real_path_exists' => $file->getRealPath() ? file_exists($file->getRealPath()) : false,
                    ];
                    if (!$file->isValid()) {
                        $response['errors'][] = "{$key}: " . $file->getErrorMessage();
                    }
                }
            }

            // Check if video specifically exists
            if ($request->hasFile('video')) {
                $video = $request->file('video');
                $response['video_specific'] = [
                    'exists' => true,
                    'is_valid' => $video->isValid(),
                    'error' => $video->getError(),
                    'error_message' => $video->getErrorMessage(),
                ];
            } else {
                $response['video_specific'] = [
                    'exists' => false,
                    'reason' => 'No video file in request or upload failed before reaching Laravel',
                ];
            }

            return response()->json($response);
        });

        // Debug video upload to S3 endpoint
        Route::post('/debug/upload-video-s3', function (\Illuminate\Http\Request $request) {
            $response = [
                'php_limits' => [
                    'upload_max_filesize' => ini_get('upload_max_filesize'),
                    'post_max_size' => ini_get('post_max_size'),
                    'max_execution_time' => ini_get('max_execution_time'),
                    'memory_limit' => ini_get('memory_limit'),
                ],
                'request_info' => [
                    'content_length' => $request->header('Content-Length'),
                    'content_type' => $request->header('Content-Type'),
                ],
                's3_config' => [
                    'disk' => config('filesystems.default'),
                    's3_bucket' => config('filesystems.disks.s3.bucket'),
                    's3_region' => config('filesystems.disks.s3.region'),
                    's3_endpoint' => config('filesystems.disks.s3.endpoint'),
                ],
                'upload_result' => null,
                'errors' => [],
            ];

            // Check if video file exists
            if (!$request->hasFile('video')) {
                $response['errors'][] = 'No video file received';
                $response['all_files_keys'] = array_keys($request->allFiles());
                return response()->json($response, 400);
            }

            $video = $request->file('video');

            // File info
            $response['video_info'] = [
                'original_name' => $video->getClientOriginalName(),
                'size' => $video->getSize(),
                'size_mb' => round($video->getSize() / 1024 / 1024, 2),
                'mime_type' => $video->getMimeType(),
                'extension' => $video->getClientOriginalExtension(),
                'error' => $video->getError(),
                'error_message' => $video->getErrorMessage(),
                'is_valid' => $video->isValid(),
                'real_path' => $video->getRealPath(),
                'real_path_exists' => $video->getRealPath() ? file_exists($video->getRealPath()) : false,
            ];

            // Check if file is valid
            if (!$video->isValid()) {
                $response['errors'][] = 'Video file is not valid: ' . $video->getErrorMessage();
                return response()->json($response, 400);
            }

            // Check if real path exists
            if (!$video->getRealPath() || !file_exists($video->getRealPath())) {
                $response['errors'][] = 'Video temp file does not exist at: ' . ($video->getRealPath() ?: 'empty path');
                return response()->json($response, 400);
            }

            // Try to upload to S3
            try {
                $filename = 'debug_' . time() . '_' . \Illuminate\Support\Str::random(10) . '.' . $video->getClientOriginalExtension();
                $uploadPath = 'debug-uploads';

                \Log::info('Debug: Attempting S3 upload', [
                    'filename' => $filename,
                    'uploadPath' => $uploadPath,
                    'size' => $video->getSize(),
                    'realPath' => $video->getRealPath(),
                ]);

                $path = $video->storeAs($uploadPath, $filename, 's3');

                if ($path) {
                    // Get the full URL
                    $url = \Illuminate\Support\Facades\Storage::disk('s3')->url($path);

                    $response['upload_result'] = [
                        'success' => true,
                        'path' => $path,
                        'url' => $url,
                        'message' => 'Video uploaded successfully to S3',
                    ];

                    // Optionally delete the test file
                    // \Illuminate\Support\Facades\Storage::disk('s3')->delete($path);
                } else {
                    $response['upload_result'] = [
                        'success' => false,
                        'message' => 'storeAs returned false/empty',
                    ];
                    $response['errors'][] = 'S3 upload failed: storeAs returned false';
                }
            } catch (\Throwable $e) {
                $response['upload_result'] = [
                    'success' => false,
                    'message' => $e->getMessage(),
                    'exception_class' => get_class($e),
                    'trace' => array_slice(explode("\n", $e->getTraceAsString()), 0, 10),
                ];
                $response['errors'][] = 'S3 upload exception: ' . $e->getMessage();
            }

            return response()->json($response);
        });
    });

    // QR Code (public - no auth required)
    Route::post('/qr-code/generate-vietqr', [QRCodeController::class, 'generateVietQR']);
    Route::get('/qr-code/supported-banks', [QRCodeController::class, 'getSupportedBanks']);

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

    // Share Image (public - with rate limiting to prevent DoS)
    // Returns JSON with S3 URL (generates if not cached)
    Route::get('/share-image/{postId}', [ShareImageController::class, 'getUrl'])
        ->where('postId', '[0-9]+')
        ->middleware('throttle.advanced:share_image');

    // Returns actual image binary (for direct use in OG meta tags)
    Route::get('/share-image/{postId}/image', [ShareImageController::class, 'generate'])
        ->where('postId', '[0-9]+')
        ->middleware('throttle.advanced:share_image');

    // Shop Post share image (returns actual image binary)
    Route::get('/share-image/shop-post/{postId}/image', [ShareImageController::class, 'generateShopPost'])
        ->where('postId', '[0-9]+')
        ->middleware('throttle.advanced:share_image');

    // Share Image Debug (for troubleshooting OG image generation)
    Route::get('/share-image/{postId}/debug', [ShareImageController::class, 'debug'])
        ->where('postId', '[0-9]+')
        ->middleware('throttle.advanced:debug');
    Route::get('/share-image/{postId}/debug-shop', [ShareImageController::class, 'debugShopPost'])
        ->where('postId', '[0-9]+')
        ->middleware('throttle.advanced:debug');
    Route::post('/share-image/{postId}/invalidate', [ShareImageController::class, 'invalidateCache'])
        ->where('postId', '[0-9]+')
        ->middleware('throttle.advanced:debug');

    // Users
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/search', [UserController::class, 'search']);
    // User profile with optional auth - allows friendship status when logged in
    Route::get('/users/{id}', [UserController::class, 'show'])->where('id', '[0-9]+')->middleware('optional.auth');
    Route::get('/users/{id}/wall', [PostController::class, 'userWall'])->where('id', '[0-9]+');
    Route::get('/users/{id}/shared-wall', [PostController::class, 'sharedWall'])->where('id', '[0-9]+');
    Route::get('/users/username/{username}', [UserController::class, 'byUsername'])->middleware('optional.auth');
    Route::get('/users/by-nickname/{nickname}', [UserController::class, 'byNickname']);
    Route::get('/users/by-phone', [UserController::class, 'byPhoneQuery']); // Query parameter version (preferred)
    Route::get('/users/by-phone/{phone}', [UserController::class, 'byPhone']); // Path parameter version (legacy)

    // Shops (public)
    Route::get('/shops', [ShopController::class, 'index']);
    Route::get('/shops/{id}', [ShopController::class, 'show'])->where('id', '[0-9]+');

    // Shop Posts/Pages (public)
    Route::get('/shops/products/feed', [ShopPostController::class, 'feed']); // Latest products feed
    Route::get('/shops/products/trending', [ShopPostController::class, 'trending']); // Trending products by views
    Route::get('/shops/{shopId}/posts', [ShopPostController::class, 'index'])->where('shopId', '[0-9]+');
    Route::get('/shops/{shopId}/posts/{id}', [ShopPostController::class, 'show'])->where(['shopId' => '[0-9]+', 'id' => '[0-9]+']);

    // Shop Post Engagement (public - read only)
    Route::get('/shop-posts/{postId}/engagement', [ShopPostEngagementController::class, 'getStats'])->where('postId', '[0-9]+');
    Route::get('/shop-posts/{postId}/comments', [ShopPostEngagementController::class, 'getComments'])->where('postId', '[0-9]+');

    // Categories (public)
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{id}', [CategoryController::class, 'show'])->where('id', '[0-9]+');
    Route::get('/categories/slug/{slug}', [CategoryController::class, 'bySlug']);

    // Groups (public)
    Route::get('/groups', [GroupController::class, 'index']);
    Route::get('/groups/popular', [GroupController::class, 'popular']);
    Route::get('/groups/{group}', [GroupController::class, 'show']);
    Route::get('/users/{userId}/groups', [GroupController::class, 'userGroups'])->where('userId', '[0-9]+');

    // Static Pages (public)
    Route::get('/pages/{slug}', [StaticPageController::class, 'show']);

    // Settings (public - image and video settings)
    Route::get('/settings/image', [SettingController::class, 'getImageSettings']);
    Route::get('/settings/video', [SettingController::class, 'getVideoSettings']);

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

    // S3 (authenticated - with rate limiting)
    Route::post('/s3/presigned-url', [S3Controller::class, 'generatePresignedUrl'])
        ->middleware('throttle.advanced:upload');
    Route::post('/s3/upload', [S3Controller::class, 'uploadFile'])
        ->middleware('throttle.advanced:upload');
    Route::delete('/s3/delete-object', [S3Controller::class, 'deleteObject'])
        ->middleware('throttle.advanced:upload');

    // Posts (authenticated)
    Route::get('/my-posts', [PostController::class, 'myPosts']);
    Route::post('/posts', [PostController::class, 'store']);
    Route::post('/posts/{id}', [PostController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/posts/{id}', [PostController::class, 'destroy'])->where('id', '[0-9]+');
    Route::post('/posts/{id}/share-to-wall', [PostController::class, 'shareToWall'])->where('id', '[0-9]+');
    Route::delete('/posts/{id}/shared-wall', [PostController::class, 'deleteSharedPost'])->where('id', '[0-9]+');
    Route::delete('/posts/{id}/share-image-cache', [ShareImageController::class, 'invalidateCache'])->where('id', '[0-9]+');

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

    // Purchase Orders (authenticated)
    Route::prefix('orders')->group(function () {
        Route::get('/', [PurchaseOrderController::class, 'index']);  // Get all my orders
        Route::post('/', [PurchaseOrderController::class, 'store']);  // Place a new order
        Route::get('/status/{status}', [PurchaseOrderController::class, 'byStatus']);  // Get orders by status
        Route::get('/simple-products', [PurchaseOrderController::class, 'simpleProducts']);  // Get simple product orders
        Route::get('/variant-products', [PurchaseOrderController::class, 'variantProducts']);  // Get variant product orders
        Route::get('/download-products', [PurchaseOrderController::class, 'downloadProducts']);  // Get download product orders
        Route::get('/{orderId}', [PurchaseOrderController::class, 'show']);  // Get specific order
        Route::post('/{orderId}/status', [PurchaseOrderController::class, 'updateStatus']);  // Update order status
    });

    // Friends (authenticated)
    Route::get('/friends', [FriendController::class, 'index']);
    Route::get('/friends/pending', [FriendController::class, 'pending']);
    Route::get('/friends/status/{userId}', [FriendController::class, 'status'])->where('userId', '[0-9]+');
    Route::post('/friends/request/{userId}', [FriendController::class, 'sendRequest'])->where('userId', '[0-9]+');
    Route::post('/friends/accept/{userId}', [FriendController::class, 'acceptRequest'])->where('userId', '[0-9]+');
    Route::post('/friends/reject/{userId}', [FriendController::class, 'rejectRequest'])->where('userId', '[0-9]+');
    Route::delete('/friends/unfriend/{userId}', [FriendController::class, 'unfriend'])->where('userId', '[0-9]+');
    Route::post('/friends/block/{userId}', [FriendController::class, 'block'])->where('userId', '[0-9]+');
    Route::delete('/friends/unblock/{userId}', [FriendController::class, 'unblock'])->where('userId', '[0-9]+');
    Route::get('/friends/blocked', [FriendController::class, 'blockedUsers']);

    // Shops (authenticated)
    Route::get('/my-shops', [ShopController::class, 'myShops']);
    Route::post('/shops', [ShopController::class, 'store']);
    Route::put('/shops/{id}', [ShopController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/shops/{id}', [ShopController::class, 'destroy'])->where('id', '[0-9]+');

    // Shop Posts/Pages (authenticated)
    Route::post('/shops/{shopId}/posts', [ShopPostController::class, 'store'])->where('shopId', '[0-9]+');
    Route::put('/shops/{shopId}/posts/{id}', [ShopPostController::class, 'update'])->where(['shopId' => '[0-9]+', 'id' => '[0-9]+']);
    Route::delete('/shops/{shopId}/posts/{id}', [ShopPostController::class, 'destroy'])->where(['shopId' => '[0-9]+', 'id' => '[0-9]+']);

    // Shop Payment Settings (authenticated)
    Route::get('/shops/{shopId}/payment-settings', [ShopPaymentSettingController::class, 'show'])->where('shopId', '[0-9]+');
    Route::post('/shops/{shopId}/payment-settings', [ShopPaymentSettingController::class, 'store'])->where('shopId', '[0-9]+');
    Route::delete('/shops/{shopId}/payment-settings', [ShopPaymentSettingController::class, 'destroy'])->where('shopId', '[0-9]+');

    // Rooms (authenticated) - For shop message chat rooms
    Route::prefix('rooms')->group(function () {
        Route::get('/', [RoomController::class, 'index']);  // Get all my rooms
        Route::post('/shop-message', [RoomController::class, 'createShopMessageRoom']);  // Create shop message room
        Route::get('/by-name/{roomName}', [RoomController::class, 'getByRoomName']);  // Get room by name
        Route::get('/{id}', [RoomController::class, 'show']);  // Get room by ID or name
        Route::put('/{id}', [RoomController::class, 'update']);  // Update room
        Route::get('/{id}/stats', [RoomController::class, 'getStats']);  // Get room stats
        Route::delete('/{id}', [RoomController::class, 'destroy']);  // Close room
    });

    // Shop Rooms - Get all rooms for a specific shop
    Route::get('/shops/{shopId}/rooms', [RoomController::class, 'getShopRooms'])->where('shopId', '[0-9]+');

    // Shop Messages (authenticated)
    Route::prefix('shops/{shopId}/messages')->group(function () {
        Route::get('/', [ShopMessageController::class, 'getShopMessages'])->where('shopId', '[0-9]+');
        Route::get('/unread-count', [ShopMessageController::class, 'getUnreadCount'])->where('shopId', '[0-9]+');
        Route::get('/customer/{senderId}', [ShopMessageController::class, 'getCustomerMessages'])->where(['shopId' => '[0-9]+', 'senderId' => '[0-9]+']);
        Route::post('/', [ShopMessageController::class, 'store'])->where('shopId', '[0-9]+');
        Route::put('/{messageId}/read', [ShopMessageController::class, 'markAsRead'])->where('messageId', '[0-9]+');
        Route::put('/{messageId}/delivered', [ShopMessageController::class, 'markAsDelivered'])->where('messageId', '[0-9]+');
        Route::delete('/{messageId}', [ShopMessageController::class, 'destroy'])->where('messageId', '[0-9]+');
    });

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

    // Group Messages (authenticated)
    Route::get('/groups/{group}/messages', [GroupMessageController::class, 'index']);
    Route::post('/groups/{group}/messages', [GroupMessageController::class, 'store']);
    Route::put('/groups/{group}/messages/{message}', [GroupMessageController::class, 'update']);
    Route::delete('/groups/{group}/messages/{message}', [GroupMessageController::class, 'destroy']);

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

    // Shop Post Engagement (authenticated)
    Route::prefix('shop-posts')->group(function () {
        Route::post('/{postId}/like', [ShopPostEngagementController::class, 'like'])->where('postId', '[0-9]+');
        Route::post('/{postId}/dislike', [ShopPostEngagementController::class, 'dislike'])->where('postId', '[0-9]+');
        Route::post('/{postId}/share', [ShopPostEngagementController::class, 'share'])->where('postId', '[0-9]+');
        Route::post('/{postId}/comments', [ShopPostEngagementController::class, 'addComment'])->where('postId', '[0-9]+');
        Route::delete('/{postId}/comments/{commentId}', [ShopPostEngagementController::class, 'deleteComment'])->where(['postId' => '[0-9]+', 'commentId' => '[0-9]+']);
    });

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

    // Admin routes (with IP whitelist for additional security)
    // IMPORTANT: Configure allowed IPs in AdminIpWhitelist middleware
    Route::middleware(['admin', 'admin.ip'])->group(function () {
        // Shop management
        Route::get('/admin/shops', [ShopController::class, 'pendingShops']);
        Route::get('/admin/shops/pending', [ShopController::class, 'pendingShops']);
        Route::post('/admin/shops/{id}/approve', [ShopController::class, 'approve'])->where('id', '[0-9]+');
        Route::post('/admin/shops/{id}/reject', [ShopController::class, 'reject'])->where('id', '[0-9]+');

        // User management (CRUD)
        Route::get('/admin/users', [UserController::class, 'getAllUsersWithRoles']);
        Route::post('/admin/users', [UserController::class, 'adminCreateUser']);
        Route::get('/admin/users/{userId}', [UserController::class, 'adminGetUser'])->where('userId', '[0-9]+');
        Route::put('/admin/users/{userId}', [UserController::class, 'adminUpdateUser'])->where('userId', '[0-9]+');
        Route::delete('/admin/users/{userId}', [UserController::class, 'adminDeleteUser'])->where('userId', '[0-9]+');
        Route::put('/admin/users/{userId}/role', [UserController::class, 'updateUserRole'])->where('userId', '[0-9]+');
        Route::post('/admin/users/roles/bulk-update', [UserController::class, 'bulkUpdateRoles']);

        // Comment moderation
        Route::post('/admin/comments/{commentId}/approve', [CommentController::class, 'approveComment'])->where('commentId', '[0-9]+');
        Route::post('/admin/comments/{commentId}/reject', [CommentController::class, 'rejectComment'])->where('commentId', '[0-9]+');

        // Group Post Comment moderation
        Route::post('/admin/group-posts/{postId}/comments/{commentId}/approve', [GroupCommentController::class, 'approve'])->where(['postId' => '[0-9]+', 'commentId' => '[0-9]+']);
        Route::post('/admin/group-posts/{postId}/comments/{commentId}/reject', [GroupCommentController::class, 'reject'])->where(['postId' => '[0-9]+', 'commentId' => '[0-9]+']);

        // Post management (CRUD) - WpPost
        Route::get('/admin/posts', [PostController::class, 'adminIndex']);
        Route::post('/admin/posts', [PostController::class, 'adminStore']);
        Route::get('/admin/posts/{id}', [PostController::class, 'adminShow'])->where('id', '[0-9]+');
        Route::put('/admin/posts/{id}', [PostController::class, 'adminUpdate'])->where('id', '[0-9]+');
        Route::delete('/admin/posts/{id}', [PostController::class, 'adminDestroy'])->where('id', '[0-9]+');

        // Group Post management (CRUD)
        Route::get('/admin/group-posts', [GroupPostController::class, 'adminIndex']);
        Route::post('/admin/group-posts', [GroupPostController::class, 'adminStore']);
        Route::get('/admin/group-posts/{id}', [GroupPostController::class, 'adminShow'])->where('id', '[0-9]+');
        Route::put('/admin/group-posts/{id}', [GroupPostController::class, 'adminUpdate'])->where('id', '[0-9]+');
        Route::delete('/admin/group-posts/{id}', [GroupPostController::class, 'adminDestroy'])->where('id', '[0-9]+');

        // Shop Post management (CRUD)
        Route::get('/admin/shop-posts', [ShopPostController::class, 'adminIndex']);
        Route::post('/admin/shop-posts', [ShopPostController::class, 'adminStore']);
        Route::get('/admin/shop-posts/{id}', [ShopPostController::class, 'adminShow'])->where('id', '[0-9]+');
        Route::put('/admin/shop-posts/{id}', [ShopPostController::class, 'adminUpdate'])->where('id', '[0-9]+');
        Route::delete('/admin/shop-posts/{id}', [ShopPostController::class, 'adminDestroy'])->where('id', '[0-9]+');

        // Category management (CRUD)
        Route::get('/admin/categories', [CategoryController::class, 'adminIndex']);
        Route::post('/admin/categories', [CategoryController::class, 'store']);
        Route::get('/admin/categories/{id}', [CategoryController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/admin/categories/{id}', [CategoryController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/admin/categories/{id}', [CategoryController::class, 'destroy'])->where('id', '[0-9]+');
        Route::post('/admin/categories/reorder', [CategoryController::class, 'reorder']);
        Route::post('/admin/categories/generate-slug', [CategoryController::class, 'generateSlug']);

        // Static Pages management (CRUD)
        Route::get('/admin/pages', [StaticPageController::class, 'index']);
        Route::get('/admin/pages/{slug}', [StaticPageController::class, 'show']);
        Route::put('/admin/pages/{slug}', [StaticPageController::class, 'update']);

        // Settings management (CRUD)
        Route::get('/admin/settings', [SettingController::class, 'index']);
        Route::get('/admin/settings/group/{group}', [SettingController::class, 'getByGroup']);
        Route::get('/admin/settings/{key}', [SettingController::class, 'show']);
        Route::post('/admin/settings', [SettingController::class, 'store']);
        Route::post('/admin/settings/batch', [SettingController::class, 'updateBatch']);
        Route::put('/admin/settings/image', [SettingController::class, 'updateImageSettings']);
        Route::put('/admin/settings/video', [SettingController::class, 'updateVideoSettings']);
        Route::delete('/admin/settings/{key}', [SettingController::class, 'destroy']);
    });

    // Group Post moderation - group owner/admin/moderator approve or reject posts
    Route::get('/groups/{group}/posts/pending', [GroupPostController::class, 'getPendingPosts']);
    Route::post('/groups/{groupId}/posts/{postId}/approve', [GroupPostController::class, 'approvePost'])->where(['groupId' => '[0-9]+', 'postId' => '[0-9]+']);
    Route::post('/groups/{groupId}/posts/{postId}/reject', [GroupPostController::class, 'rejectPost'])->where(['groupId' => '[0-9]+', 'postId' => '[0-9]+']);
});
