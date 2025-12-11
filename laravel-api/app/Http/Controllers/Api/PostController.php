<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PostResource;
use App\Models\WpPost;
use App\Models\ShareWall;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class PostController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = WpPost::with(['author', 'meta'])
            ->published();

        // Filter by post type
        if ($request->has('type')) {
            $query->ofType($request->input('type'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('post_title', 'like', "%{$search}%")
                  ->orWhere('post_content', 'like', "%{$search}%");
            });
        }

        // Order by
        $orderBy = $request->input('order_by', 'post_date');
        $order = $request->input('order', 'desc');
        $query->orderBy($orderBy, $order);

        $perPage = min($request->input('per_page', 15), 100);
        $posts = $query->paginate($perPage);

        return PostResource::collection($posts);
    }

    public function show(Request $request, $id): PostResource
    {
        $post = WpPost::with(['author', 'meta', 'comments' => function ($query) {
            $query->approved()->orderBy('comment_date', 'desc');
        }])->findOrFail($id);

        return new PostResource($post);
    }

    public function bySlug(Request $request, $slug): PostResource
    {
        $post = WpPost::with(['author', 'meta'])
            ->where('post_name', $slug)
            ->published()
            ->firstOrFail();

        return new PostResource($post);
    }

    public function byType(Request $request, $type): AnonymousResourceCollection
    {
        $query = WpPost::with(['author', 'meta'])
            ->published()
            ->ofType($type);

        $perPage = min($request->input('per_page', 15), 100);
        $posts = $query->orderBy('post_date', 'desc')->paginate($perPage);

        return PostResource::collection($posts);
    }

    public function userWall(Request $request, $id): AnonymousResourceCollection
    {
        $query = WpPost::with(['author', 'meta'])
            ->published()
            ->where('wall_id', $id);

        // Filter by post type
        if ($request->has('type')) {
            $query->ofType($request->input('type'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('post_title', 'like', "%{$search}%")
                  ->orWhere('post_content', 'like', "%{$search}%");
            });
        }

        // Order by
        $orderBy = $request->input('order_by', 'post_date');
        $order = $request->input('order', 'desc');
        $query->orderBy($orderBy, $order);

        $perPage = min($request->input('per_page', 15), 100);
        $posts = $query->paginate($perPage);

        return PostResource::collection($posts);
    }

    public function sharedWall(Request $request, $id): AnonymousResourceCollection
    {
        // Get all post IDs shared to this user's wall from ShareWall table
        $sharedPostIds = ShareWall::where('user_id', $id)
            ->pluck('post_id')
            ->toArray();

        // If no shared posts, return empty paginated collection
        if (empty($sharedPostIds)) {
            return PostResource::collection(
                WpPost::whereIn('ID', [])->with(['author', 'meta'])->paginate(15)
            );
        }

        // Get the posts with those IDs
        $query = WpPost::with(['author', 'meta'])
            ->published()
            ->whereIn('ID', $sharedPostIds);

        // Order by creation date descending
        $orderBy = $request->input('order_by', 'post_date');
        $order = $request->input('order', 'desc');
        $query->orderBy($orderBy, $order);

        $perPage = min($request->input('per_page', 15), 100);
        $posts = $query->paginate($perPage);

        return PostResource::collection($posts);
    }

    public function store(Request $request): JsonResponse
    {
        // Get all files first, before validation
        // Handle FormData from API proxy with 'images[]' notation
        $allFiles = $request->allFiles();
        $filesToProcess = null;

        if (!empty($allFiles['images'])) {
            $filesToProcess = $allFiles['images'];
        } elseif (!empty($allFiles['images[]'])) {
            $filesToProcess = $allFiles['images[]'];
        }

        // Get video file if present
        $videoFile = $allFiles['video'] ?? null;

        // Log video file details for debugging
        if ($videoFile !== null) {
            \Log::info('Video upload attempt', [
                'original_name' => $videoFile->getClientOriginalName(),
                'size' => $videoFile->getSize(),
                'mime_type' => $videoFile->getMimeType(),
                'error' => $videoFile->getError(),
                'error_message' => $videoFile->getErrorMessage(),
                'is_valid' => $videoFile->isValid(),
                'php_upload_max_filesize' => ini_get('upload_max_filesize'),
                'php_post_max_size' => ini_get('post_max_size'),
            ]);

            // Check if the file upload failed
            if (!$videoFile->isValid()) {
                return response()->json([
                    'message' => 'Video upload failed',
                    'errors' => [
                        'video' => [$videoFile->getErrorMessage() ?: 'The video file could not be uploaded. Max file size is ' . ini_get('upload_max_filesize')],
                    ],
                    'debug' => [
                        'error_code' => $videoFile->getError(),
                        'php_upload_max' => ini_get('upload_max_filesize'),
                        'php_post_max' => ini_get('post_max_size'),
                    ],
                ], 422);
            }
        }

        // Validate request data
        // Title is optional - will be auto-generated from content if not provided
        $validationRules = [
            'title' => 'nullable|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string',
            'type' => 'nullable|string|in:post,page,product',
            'status' => 'nullable|string|in:publish,draft,pending',
            'wall_id' => 'nullable|integer|exists:wp_users,ID',
        ];

        // Only add image validation if we actually have files
        // This prevents validation errors for missing 'images' field
        if ($filesToProcess !== null) {
            $validationRules['images'] = 'nullable|array|max:10';
            $validationRules['images.*'] = 'file|max:5120';
        }

        // Add video validation if video file is present
        if ($videoFile !== null) {
            $validationRules['video'] = 'file|mimes:mp4,mov,avi,webm|max:102400'; // 100MB max
        }

        $validated = $request->validate($validationRules);

        $user = $request->user();

        // Auto-generate title from content if not provided
        $title = $validated['title'] ?? null;
        if (empty($title)) {
            $title = $this->generateTitleFromContent($validated['content']);
        }

        // Generate slug from title
        $slug = Str::slug($title);
        $originalSlug = $slug;
        $counter = 1;

        // Ensure unique slug
        while (WpPost::where('post_name', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        $now = now();

        // Determine wall_id: use provided wall_id or default to current user's ID
        $wallId = $validated['wall_id'] ?? $user->ID;

        $post = WpPost::create([
            'post_author' => $user->ID,
            'post_date' => $now,
            'post_date_gmt' => $now,
            'post_content' => $validated['content'],
            'post_title' => $title,
            'post_excerpt' => $validated['excerpt'] ?? '',
            'post_status' => $validated['status'] ?? 'draft',
            'post_name' => $slug,
            'post_type' => $validated['type'] ?? 'post',
            'post_modified' => $now,
            'post_modified_gmt' => $now,
            'guid' => '',
            'comment_status' => 'open',
            'ping_status' => 'open',
            'post_password' => '',
            'to_ping' => '',
            'pinged' => '',
            'post_content_filtered' => '',
            'post_parent' => 0,
            'menu_order' => 0,
            'post_mime_type' => '',
            'comment_count' => 0,
            'wall_id' => $wallId,
        ]);

        // If post is created on another user's wall, create a ShareWall record
        if ($wallId !== $user->ID) {
            ShareWall::create([
                'user_id' => $wallId,
                'post_id' => $post->ID,
                'post_type' => null, // null for WpPost
            ]);
        }

        // Handle multiple image uploads
        // Use the files we captured before validation
        $files = $filesToProcess ?? [];

        // Ensure $files is an array
        if (!empty($files) && !is_array($files)) {
            $files = [$files];
        }

        // Validate that we have proper UploadedFile objects with valid paths
        $validFiles = [];
        foreach ($files as $file) {
            if ($file instanceof \Illuminate\Http\UploadedFile) {
                // Check if the file is valid and has a real path
                if (!$file->isValid()) {
                    \Log::warning('Invalid file upload detected', [
                        'original_name' => $file->getClientOriginalName(),
                        'error' => $file->getError(),
                        'error_message' => $file->getErrorMessage(),
                    ]);
                    continue;
                }
                if (!$file->getRealPath() || !file_exists($file->getRealPath())) {
                    \Log::warning('File temp path does not exist', [
                        'original_name' => $file->getClientOriginalName(),
                        'path' => $file->getRealPath(),
                    ]);
                    continue;
                }
                $validFiles[] = $file;
            } else {
                \Log::warning('Invalid file object received', [
                    'file_type' => gettype($file),
                    'file_class' => is_object($file) ? get_class($file) : 'not an object',
                ]);
            }
        }
        $files = $validFiles;

        \Log::info('PostController::store - Image upload attempt', [
            'files_count' => count($files),
            'valid_files_count' => count($validFiles),
            'has_files' => !empty($files),
            'all_request_files' => array_keys($request->allFiles()),
        ]);

        if (!empty($files)) {
            $uploadedImages = [];

            // Create folder structure: userid/year/month/date
            $userId = $user->ID;
            $year = $now->format('Y');
            $month = $now->format('m');
            $date = $now->format('d');
            $uploadPath = "posts/{$userId}/{$year}/{$month}/{$date}";

            foreach ($files as $index => $image) {
                $filename = time() . '_' . $index . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();

                try {
                    \Log::info('Uploading file to S3', [
                        'filename' => $filename,
                        'uploadPath' => $uploadPath,
                        'originalName' => $image->getClientOriginalName(),
                        'size' => $image->getSize(),
                        'disk' => 's3',
                    ]);

                    $path = $image->storeAs($uploadPath, $filename, 's3');

                    // Check if storeAs returned a valid path
                    // storeAs returns the path as a string, or false on failure
                    if ($path === false || empty($path)) {
                        \Log::error('File upload failed: storeAs returned false/empty', [
                            'filename' => $filename,
                            'uploadPath' => $uploadPath,
                            'image' => $image->getClientOriginalName(),
                            'size' => $image->getSize(),
                            'path_type' => gettype($path),
                            'path_value' => var_export($path, true),
                        ]);
                        continue;
                    }

                    \Log::info('File uploaded successfully to S3', [
                        'filename' => $filename,
                        'path' => $path,
                    ]);

                    $uploadedImages[] = [
                        'filename' => $filename,
                        'path' => $path,
                        'url' => \Storage::disk('s3')->url($path),
                    ];
                } catch (\Throwable $e) {
                    \Log::error('Exception uploading file to S3', [
                        'filename' => $filename,
                        'error' => $e->getMessage(),
                        'exception_class' => get_class($e),
                        'code' => $e->getCode(),
                    ]);
                    continue;
                }
            }

            // Store image paths in post meta
            foreach ($uploadedImages as $index => $imageData) {
                $post->meta()->create([
                    'meta_key' => '_post_image_' . $index,
                    'meta_value' => $imageData['path'],
                ]);
            }

            // Set first image as featured image
            if (!empty($uploadedImages)) {
                $post->meta()->create([
                    'meta_key' => '_thumbnail_path',
                    'meta_value' => $uploadedImages[0]['path'],
                ]);
            }
        }

        // Handle video upload
        if ($videoFile instanceof \Illuminate\Http\UploadedFile) {
            // Verify the video file is still valid and readable
            if (!$videoFile->isValid()) {
                \Log::error('Video file is no longer valid', [
                    'error' => $videoFile->getError(),
                    'error_message' => $videoFile->getErrorMessage(),
                ]);
            } elseif (!$videoFile->getRealPath() || !file_exists($videoFile->getRealPath())) {
                \Log::error('Video temp file does not exist', [
                    'path' => $videoFile->getRealPath(),
                    'original_name' => $videoFile->getClientOriginalName(),
                ]);
            } else {
                // Create folder structure for video: videos/userid/year/month/date
                $userId = $user->ID;
                $year = $now->format('Y');
                $month = $now->format('m');
                $date = $now->format('d');
                $videoUploadPath = "videos/{$userId}/{$year}/{$month}/{$date}";
                $videoFilename = time() . '_' . Str::random(10) . '.' . $videoFile->getClientOriginalExtension();

                try {
                    \Log::info('Uploading video to S3 (store)', [
                        'filename' => $videoFilename,
                        'uploadPath' => $videoUploadPath,
                        'originalName' => $videoFile->getClientOriginalName(),
                        'size' => $videoFile->getSize(),
                        'realPath' => $videoFile->getRealPath(),
                    ]);

                    $videoPath = $videoFile->storeAs($videoUploadPath, $videoFilename, 's3');

                    if ($videoPath !== false && !empty($videoPath)) {
                        // Store video path in post meta
                        $post->meta()->create([
                            'meta_key' => '_post_video',
                            'meta_value' => $videoPath,
                        ]);

                        \Log::info('Video uploaded successfully (store)', [
                            'post_id' => $post->ID,
                            'video_path' => $videoPath,
                        ]);
                    } else {
                        \Log::error('Video upload failed (store): storeAs returned false/empty', [
                            'filename' => $videoFilename,
                            'uploadPath' => $videoUploadPath,
                        ]);
                    }
                } catch (\Throwable $e) {
                    \Log::error('Exception uploading video to S3 (store)', [
                        'filename' => $videoFilename,
                        'error' => $e->getMessage(),
                        'exception_class' => get_class($e),
                    ]);
                }
            }
        }

        return response()->json([
            'message' => 'Post created successfully',
            'post' => new PostResource($post->load(['author', 'meta'])),
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $post = WpPost::findOrFail($id);
        $user = $request->user();

        // Check if user owns the post
        if ($post->post_author !== $user->ID) {
            return response()->json([
                'message' => 'Unauthorized. You can only edit your own posts.',
            ], 403);
        }

        // Get all files first, before validation
        // Handle FormData from API proxy with 'images[]' notation
        $allFiles = $request->allFiles();
        $filesToProcess = null;

        if (!empty($allFiles['images'])) {
            $filesToProcess = $allFiles['images'];
        } elseif (!empty($allFiles['images[]'])) {
            $filesToProcess = $allFiles['images[]'];
        }

        // Get video file if present
        $videoFile = $allFiles['video'] ?? null;

        // Build validation rules
        $validationRules = [
            'title' => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'excerpt' => 'nullable|string',
            'type' => 'nullable|string|in:post,page,product',
            'status' => 'nullable|string|in:publish,draft,pending',
            'visibility' => 'nullable|string|in:public,private',
            'remove_images' => 'nullable|array',
            'remove_images.*' => 'integer',
            'remove_video' => 'nullable|boolean',
        ];

        // Only add image validation if we actually have files
        if ($filesToProcess !== null) {
            $validationRules['images'] = 'nullable|array|max:10';
            $validationRules['images.*'] = 'file|max:5120';
        }

        // Add video validation if video file is present
        if ($videoFile !== null) {
            $validationRules['video'] = 'file|mimes:mp4,mov,avi,webm|max:102400'; // 100MB max
        }

        $validated = $request->validate($validationRules);

        $now = now();

        // Update post fields
        if (isset($validated['title'])) {
            $post->post_title = $validated['title'];

            // Regenerate slug if title changed
            $slug = Str::slug($validated['title']);
            $originalSlug = $slug;
            $counter = 1;

            while (WpPost::where('post_name', $slug)->where('ID', '!=', $id)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }
            $post->post_name = $slug;
        }

        if (isset($validated['content'])) {
            $post->post_content = $validated['content'];
        }

        if (isset($validated['excerpt'])) {
            $post->post_excerpt = $validated['excerpt'];
        }

        if (isset($validated['type'])) {
            $post->post_type = $validated['type'];
        }

        if (isset($validated['status'])) {
            $post->post_status = $validated['status'];
        }

        if (isset($validated['visibility'])) {
            $post->visibility = $validated['visibility'];
        }

        $post->post_modified = $now;
        $post->post_modified_gmt = $now;
        $post->save();

        // Handle image removal
        if (!empty($validated['remove_images'])) {
            foreach ($validated['remove_images'] as $imageIndex) {
                $meta = $post->meta()->where('meta_key', '_post_image_' . $imageIndex)->first();
                if ($meta) {
                    // Delete file from storage
                    \Storage::disk('s3')->delete($meta->meta_value);
                    $meta->delete();
                }
            }
        }

        // Handle new image uploads
        // Use the files we captured before validation
        $files = $filesToProcess ?? [];

        // Ensure $files is an array
        if (!empty($files) && !is_array($files)) {
            $files = [$files];
        }

        // Validate that we have proper UploadedFile objects
        $validFiles = [];
        foreach ($files as $file) {
            if ($file instanceof \Illuminate\Http\UploadedFile) {
                $validFiles[] = $file;
            } else {
                \Log::warning('Invalid file object received in update', [
                    'file_type' => gettype($file),
                    'file_class' => get_class($file),
                ]);
            }
        }
        $files = $validFiles;

        if (!empty($files)) {
            $uploadedImages = [];

            // Create folder structure: userid/year/month/date
            $userId = $user->ID;
            $year = $now->format('Y');
            $month = $now->format('m');
            $date = $now->format('d');
            $uploadPath = "posts/{$userId}/{$year}/{$month}/{$date}";

            // Get existing image count
            $existingCount = $post->meta()->where('meta_key', 'like', '_post_image_%')->count();

            foreach ($files as $index => $image) {
                $filename = time() . '_' . ($existingCount + $index) . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();

                try {
                    $path = $image->storeAs($uploadPath, $filename, 's3');

                    // Check if storeAs returned a valid path
                    // storeAs returns the path as a string, or false on failure
                    if ($path === false || empty($path)) {
                        \Log::error('File upload failed in update: storeAs returned false/empty', [
                            'filename' => $filename,
                            'uploadPath' => $uploadPath,
                            'image' => $image->getClientOriginalName(),
                            'path_type' => gettype($path),
                            'path_value' => var_export($path, true),
                        ]);
                        continue;
                    }

                    $uploadedImages[] = [
                        'filename' => $filename,
                        'path' => $path,
                        'url' => \Storage::disk('s3')->url($path),
                    ];

                    // Store image path in post meta
                    $post->meta()->create([
                        'meta_key' => '_post_image_' . ($existingCount + $index),
                        'meta_value' => $path,
                    ]);
                } catch (\Throwable $e) {
                    \Log::error('Exception uploading file to S3 (update)', [
                        'filename' => $filename,
                        'error' => $e->getMessage(),
                        'exception_class' => get_class($e),
                        'code' => $e->getCode(),
                    ]);
                    continue;
                }
            }

            // Update featured image if this is the first image
            if ($existingCount === 0 && !empty($uploadedImages)) {
                $post->meta()->updateOrCreate(
                    ['post_id' => $post->ID, 'meta_key' => '_thumbnail_path'],
                    ['meta_value' => $uploadedImages[0]['path']]
                );
            }
        }

        // Handle video removal
        $removeVideo = $request->input('remove_video');
        if ($removeVideo === true || $removeVideo === 'true' || $removeVideo === '1' || $removeVideo === 1) {
            $videoMeta = $post->meta()->where('meta_key', '_post_video')->first();
            if ($videoMeta) {
                \Storage::disk('s3')->delete($videoMeta->meta_value);
                $videoMeta->delete();
                \Log::info('Video removed from post', ['post_id' => $post->ID]);
            }
        }

        // Handle video upload
        if ($videoFile instanceof \Illuminate\Http\UploadedFile) {
            // Delete existing video if present
            $existingVideoMeta = $post->meta()->where('meta_key', '_post_video')->first();
            if ($existingVideoMeta) {
                \Storage::disk('s3')->delete($existingVideoMeta->meta_value);
                $existingVideoMeta->delete();
            }

            // Create folder structure for video: videos/userid/year/month/date
            $userId = $user->ID;
            $year = $now->format('Y');
            $month = $now->format('m');
            $date = $now->format('d');
            $videoUploadPath = "videos/{$userId}/{$year}/{$month}/{$date}";
            $videoFilename = time() . '_' . Str::random(10) . '.' . $videoFile->getClientOriginalExtension();

            try {
                \Log::info('Uploading video to S3', [
                    'filename' => $videoFilename,
                    'uploadPath' => $videoUploadPath,
                    'originalName' => $videoFile->getClientOriginalName(),
                    'size' => $videoFile->getSize(),
                ]);

                $videoPath = $videoFile->storeAs($videoUploadPath, $videoFilename, 's3');

                if ($videoPath !== false && !empty($videoPath)) {
                    // Store video path in post meta
                    $post->meta()->updateOrCreate(
                        ['post_id' => $post->ID, 'meta_key' => '_post_video'],
                        ['meta_value' => $videoPath]
                    );

                    \Log::info('Video uploaded successfully', [
                        'post_id' => $post->ID,
                        'video_path' => $videoPath,
                    ]);
                } else {
                    \Log::error('Video upload failed: storeAs returned false/empty', [
                        'filename' => $videoFilename,
                        'uploadPath' => $videoUploadPath,
                    ]);
                }
            } catch (\Throwable $e) {
                \Log::error('Exception uploading video to S3', [
                    'filename' => $videoFilename,
                    'error' => $e->getMessage(),
                    'exception_class' => get_class($e),
                ]);
            }
        }

        return response()->json([
            'message' => 'Post updated successfully',
            'post' => new PostResource($post->load(['author', 'meta'])),
        ]);
    }

    public function myPosts(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $query = WpPost::with(['author', 'meta'])
            ->where('post_author', $user->ID);

        // Filter by status
        if ($request->has('status')) {
            $query->where('post_status', $request->input('status'));
        }

        // Filter by type
        if ($request->has('type')) {
            $query->where('post_type', $request->input('type'));
        }

        // Order by
        $orderBy = $request->input('order_by', 'post_date');
        $order = $request->input('order', 'desc');
        $query->orderBy($orderBy, $order);

        $perPage = min($request->input('per_page', 15), 100);
        $posts = $query->paginate($perPage);

        return PostResource::collection($posts);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $post = WpPost::findOrFail($id);
        $user = $request->user();

        // Check if user owns the post
        if ($post->post_author !== $user->ID) {
            return response()->json([
                'message' => 'Unauthorized. You can only delete your own posts.',
            ], 403);
        }

        // Delete associated images
        $imageMeta = $post->meta()->where('meta_key', 'like', '_post_image_%')->get();
        foreach ($imageMeta as $meta) {
            \Storage::disk('s3')->delete($meta->meta_value);
            $meta->delete();
        }

        // Delete thumbnail
        $thumbnailMeta = $post->meta()->where('meta_key', '_thumbnail_path')->first();
        if ($thumbnailMeta) {
            \Storage::disk('s3')->delete($thumbnailMeta->meta_value);
            $thumbnailMeta->delete();
        }

        // Delete video
        $videoMeta = $post->meta()->where('meta_key', '_post_video')->first();
        if ($videoMeta) {
            \Storage::disk('s3')->delete($videoMeta->meta_value);
            $videoMeta->delete();
        }

        // Delete all meta
        $post->meta()->delete();

        // Delete post
        $post->delete();

        return response()->json([
            'message' => 'Post deleted successfully',
        ]);
    }

    /**
     * Share an existing post to a user's wall
     * Creates a ShareWall record to link the post to the target user's wall
     */
    public function shareToWall(Request $request, $id): JsonResponse
    {
        // Find the post
        $post = WpPost::findOrFail($id);
        $user = $request->user();

        // Validate request
        $validated = $request->validate([
            'wall_id' => 'required|integer|exists:wp_users,ID|different:post_author',
        ]);

        $wallId = $validated['wall_id'];

        \Log::info('[PostController::shareToWall] Share request', [
            'post_id' => $post->ID,
            'post_author' => $post->post_author,
            'requesting_user_id' => $user->ID,
            'target_wall_id' => $wallId,
        ]);

        // Check if share already exists
        $existingShare = ShareWall::where('user_id', $wallId)
            ->where('post_id', $post->ID)
            ->first();

        if ($existingShare) {
            return response()->json([
                'success' => false,
                'message' => 'This post is already shared to that wall',
            ], 422);
        }

        // Create the share record
        try {
            ShareWall::create([
                'user_id' => $wallId,
                'post_id' => $post->ID,
                'post_type' => null, // null for WpPost
            ]);

            \Log::info('[PostController::shareToWall] Share successful', [
                'post_id' => $post->ID,
                'wall_id' => $wallId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Post shared to wall successfully',
                'post' => new PostResource($post->load(['author', 'meta'])),
            ]);
        } catch (\Exception $e) {
            \Log::error('[PostController::shareToWall] Share failed', [
                'post_id' => $post->ID,
                'wall_id' => $wallId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to share post: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a shared post from a user's wall
     * Removes the ShareWall record that links a post to a user's wall
     */
    public function deleteSharedPost(Request $request, $id): JsonResponse
    {
        // Find the post
        $post = WpPost::findOrFail($id);
        $user = $request->user();

        // Validate request
        $validated = $request->validate([
            'wall_id' => 'required|integer|exists:wp_users,ID',
        ]);

        $wallId = $validated['wall_id'];

        \Log::info('[PostController::deleteSharedPost] Delete share request', [
            'post_id' => $post->ID,
            'wall_id' => $wallId,
            'requesting_user_id' => $user->ID,
        ]);

        // Check if the user owns the wall (can only delete shared posts from own wall)
        if ($wallId !== $user->ID) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. You can only remove shared posts from your own wall.',
            ], 403);
        }

        // Find and delete the share record
        $shareRecord = ShareWall::where('user_id', $wallId)
            ->where('post_id', $post->ID)
            ->first();

        if (!$shareRecord) {
            return response()->json([
                'success' => false,
                'message' => 'This post is not shared to your wall.',
            ], 404);
        }

        try {
            $shareRecord->delete();

            \Log::info('[PostController::deleteSharedPost] Share deleted successfully', [
                'post_id' => $post->ID,
                'wall_id' => $wallId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Shared post removed from your wall',
            ]);
        } catch (\Exception $e) {
            \Log::error('[PostController::deleteSharedPost] Delete failed', [
                'post_id' => $post->ID,
                'wall_id' => $wallId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to remove shared post: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============================================
    // ADMIN ONLY METHODS
    // ============================================

    /**
     * ADMIN ONLY: Get all posts with filtering and pagination
     */
    public function adminIndex(Request $request): AnonymousResourceCollection
    {
        $query = WpPost::with(['author', 'meta']);

        // Filter by status
        if ($request->has('status')) {
            $query->where('post_status', $request->input('status'));
        }

        // Filter by type
        if ($request->has('type')) {
            $query->where('post_type', $request->input('type'));
        }

        // Filter by author
        if ($request->has('author_id')) {
            $query->where('post_author', $request->input('author_id'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('post_title', 'like', "%{$search}%")
                  ->orWhere('post_content', 'like', "%{$search}%");
            });
        }

        // Order by
        $orderBy = $request->input('order_by', 'post_date');
        $order = $request->input('order', 'desc');
        $query->orderBy($orderBy, $order);

        $perPage = min($request->input('per_page', 15), 100);
        $posts = $query->paginate($perPage);

        return PostResource::collection($posts);
    }

    /**
     * ADMIN ONLY: Get a single post by ID
     */
    public function adminShow(Request $request, $id): PostResource
    {
        $post = WpPost::with(['author', 'meta', 'comments' => function ($query) {
            $query->orderBy('comment_date', 'desc');
        }])->findOrFail($id);

        return new PostResource($post);
    }

    /**
     * ADMIN ONLY: Create a new post
     */
    public function adminStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string',
            'type' => 'nullable|string|in:post,page,product',
            'status' => 'nullable|string|in:publish,draft,pending,trash',
            'author_id' => 'nullable|integer|exists:wp_users,ID',
            'wall_id' => 'nullable|integer|exists:wp_users,ID',
        ]);

        $user = $request->user();
        $authorId = $validated['author_id'] ?? $user->ID;

        // Generate slug from title
        $slug = Str::slug($validated['title']);
        $originalSlug = $slug;
        $counter = 1;

        while (WpPost::where('post_name', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        $now = now();

        $post = WpPost::create([
            'post_author' => $authorId,
            'post_date' => $now,
            'post_date_gmt' => $now,
            'post_content' => $validated['content'],
            'post_title' => $validated['title'],
            'post_excerpt' => $validated['excerpt'] ?? '',
            'post_status' => $validated['status'] ?? 'draft',
            'post_name' => $slug,
            'post_type' => $validated['type'] ?? 'post',
            'post_modified' => $now,
            'post_modified_gmt' => $now,
            'guid' => '',
            'comment_status' => 'open',
            'ping_status' => 'open',
            'post_password' => '',
            'to_ping' => '',
            'pinged' => '',
            'post_content_filtered' => '',
            'post_parent' => 0,
            'menu_order' => 0,
            'post_mime_type' => '',
            'comment_count' => 0,
            'wall_id' => $validated['wall_id'] ?? $authorId,
        ]);

        \Log::info('[PostController::adminStore] Post created by admin', [
            'created_by' => $user->ID,
            'post_id' => $post->ID,
            'title' => $post->post_title,
        ]);

        return response()->json([
            'message' => 'Post created successfully',
            'post' => new PostResource($post->load(['author', 'meta'])),
        ], 201);
    }

    /**
     * ADMIN ONLY: Update any post
     */
    public function adminUpdate(Request $request, $id): JsonResponse
    {
        $post = WpPost::findOrFail($id);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'excerpt' => 'nullable|string',
            'type' => 'nullable|string|in:post,page,product',
            'status' => 'nullable|string|in:publish,draft,pending,trash',
            'visibility' => 'nullable|string|in:public,private',
        ]);

        $now = now();

        if (isset($validated['title'])) {
            $post->post_title = $validated['title'];

            // Regenerate slug if title changed
            $slug = Str::slug($validated['title']);
            $originalSlug = $slug;
            $counter = 1;

            while (WpPost::where('post_name', $slug)->where('ID', '!=', $id)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }
            $post->post_name = $slug;
        }

        if (isset($validated['content'])) {
            $post->post_content = $validated['content'];
        }

        if (isset($validated['excerpt'])) {
            $post->post_excerpt = $validated['excerpt'];
        }

        if (isset($validated['type'])) {
            $post->post_type = $validated['type'];
        }

        if (isset($validated['status'])) {
            $post->post_status = $validated['status'];
        }

        if (isset($validated['visibility'])) {
            $post->visibility = $validated['visibility'];
        }

        $post->post_modified = $now;
        $post->post_modified_gmt = $now;
        $post->save();

        \Log::info('[PostController::adminUpdate] Post updated by admin', [
            'updated_by' => $request->user()->ID,
            'post_id' => $post->ID,
            'fields_updated' => array_keys($validated),
        ]);

        return response()->json([
            'message' => 'Post updated successfully',
            'post' => new PostResource($post->load(['author', 'meta'])),
        ]);
    }

    /**
     * ADMIN ONLY: Delete any post
     */
    public function adminDestroy(Request $request, $id): JsonResponse
    {
        $post = WpPost::findOrFail($id);

        $title = $post->post_title;
        $authorId = $post->post_author;

        // Delete associated images
        $imageMeta = $post->meta()->where('meta_key', 'like', '_post_image_%')->get();
        foreach ($imageMeta as $meta) {
            \Storage::disk('s3')->delete($meta->meta_value);
            $meta->delete();
        }

        // Delete thumbnail
        $thumbnailMeta = $post->meta()->where('meta_key', '_thumbnail_path')->first();
        if ($thumbnailMeta) {
            \Storage::disk('s3')->delete($thumbnailMeta->meta_value);
            $thumbnailMeta->delete();
        }

        // Delete all meta
        $post->meta()->delete();

        // Delete comments
        $post->comments()->delete();

        // Delete likes, dislikes, shares
        $post->likes()->delete();
        $post->dislikes()->delete();
        $post->shares()->delete();

        // Delete share walls
        $post->shareWalls()->delete();

        // Delete post
        $post->delete();

        \Log::info('[PostController::adminDestroy] Post deleted by admin', [
            'deleted_by' => $request->user()->ID,
            'post_id' => $id,
            'title' => $title,
            'original_author_id' => $authorId,
        ]);

        return response()->json([
            'message' => 'Post deleted successfully',
            'deleted_post' => [
                'id' => $id,
                'title' => $title,
            ],
        ]);
    }

    /**
     * Generate a title from content by extracting the first meaningful text
     *
     * @param string $content
     * @return string
     */
    private function generateTitleFromContent(string $content): string
    {
        // Strip HTML tags
        $text = strip_tags($content);

        // Decode HTML entities
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Normalize whitespace
        $text = preg_replace('/\s+/', ' ', trim($text));

        // If empty, return default title with timestamp
        if (empty($text)) {
            return 'Bài viết ' . now()->format('d/m/Y H:i');
        }

        // Get first 100 characters as title (reasonable title length)
        $maxLength = 100;
        if (mb_strlen($text, 'UTF-8') <= $maxLength) {
            return $text;
        }

        // Truncate at word boundary
        $truncated = mb_substr($text, 0, $maxLength, 'UTF-8');

        // Try to cut at last space to avoid cutting words
        $lastSpace = mb_strrpos($truncated, ' ', 0, 'UTF-8');
        if ($lastSpace !== false && $lastSpace > 50) {
            $truncated = mb_substr($truncated, 0, $lastSpace, 'UTF-8');
        }

        return $truncated . '...';
    }
}
