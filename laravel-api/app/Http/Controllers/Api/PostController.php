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

        // Validate request data
        $validationRules = [
            'title' => 'required|string|max:255',
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

        $validated = $request->validate($validationRules);

        $user = $request->user();

        // Generate slug from title
        $slug = Str::slug($validated['title']);
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
            'wall_id' => $wallId,
        ]);

        // If post is created on another user's wall, create a ShareWall record
        if ($wallId !== $user->ID) {
            ShareWall::create([
                'user_id' => $wallId,
                'post_id' => $post->ID,
            ]);
        }

        // Handle multiple image uploads
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
                \Log::warning('Invalid file object received', [
                    'file_type' => gettype($file),
                    'file_class' => get_class($file),
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
        ];

        // Only add image validation if we actually have files
        if ($filesToProcess !== null) {
            $validationRules['images'] = 'nullable|array|max:10';
            $validationRules['images.*'] = 'file|max:5120';
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
}
