<?php

namespace App\Http\Controllers\Api;

use App\Models\GroupPost;
use App\Models\Group;
use App\Models\GroupUser;
use App\Models\GroupPostLike;
use App\Models\GroupPostDislike;
use App\Models\GroupComment;
use App\Models\ShareWall;
use App\Http\Controllers\Controller;
use App\Http\Resources\GroupPostResource;
use App\Http\Requests\StoreGroupPostRequest;
use App\Http\Requests\UpdateGroupPostRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GroupPostController extends Controller
{
    /**
     * Display a listing of group posts with pagination
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $groupId = $request->input('group_id');
        $status = $request->input('status');
        $type = $request->input('type');
        $sortBy = $request->input('sort_by', 'post_date');
        $order = $request->input('order', 'desc');

        $query = GroupPost::query();

        // Filter by group if provided
        if ($groupId) {
            $query->where('group_id', $groupId);
        }

        // Filter by status if provided
        if ($status) {
            $query->where('post_status', $status);
        }

        // Filter by type if provided
        if ($type) {
            $query->where('post_type', $type);
        }

        // Sort results
        $query->orderBy($sortBy, $order);

        $posts = $query->paginate($perPage);

        return response()->json([
            'data' => GroupPostResource::collection($posts->items()),
            'pagination' => [
                'total' => $posts->total(),
                'per_page' => $posts->perPage(),
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'from' => $posts->firstItem(),
                'to' => $posts->lastItem(),
            ],
        ]);
    }

    /**
     * Show a single group post
     */
    public function show($id): JsonResponse
    {
        try {
            // Manually fetch with all necessary relationships
            $post = GroupPost::with(['group', 'author', 'meta'])
                ->findOrFail($id);

            return response()->json([
                'data' => new GroupPostResource($post),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Not found',
                'message' => 'Group post not found',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('[GroupPostController::show] Failed to fetch post', [
                'post_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to fetch post',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a newly created group post
     */
    public function store(StoreGroupPostRequest $request): JsonResponse
    {
        try {
            // Verify group exists
            $group = Group::findOrFail($request->input('group_id'));

            $currentUser = auth()->user();
            $isGroupOwner = $group->group_owner_id === $currentUser->ID;
            $isGlobalAdmin = $currentUser->isAdmin();

            // Check if user is group admin/moderator
            $isGroupAdmin = false;
            if (!$isGroupOwner && !$isGlobalAdmin) {
                $userRole = GroupUser::where('group_id', $group->group_id)
                    ->where('group_user_id', $currentUser->ID)
                    ->first();
                $isGroupAdmin = $userRole && in_array($userRole->group_role, ['admin', 'moderator']);
            }

            // Determine post status:
            // - If group requires approval AND user is not owner/admin/moderator: set to 'pending'
            // - Otherwise: use the provided status (default 'draft')
            $postStatus = $request->input('status', 'draft');

            if ($group->requires_approval_posts && !$isGroupOwner && !$isGlobalAdmin && !$isGroupAdmin) {
                $postStatus = 'pending';

                \Log::info('[GroupPostController::store] Post set to pending for approval', [
                    'user_id' => $currentUser->ID,
                    'group_id' => $group->group_id,
                    'requires_approval_posts' => $group->requires_approval_posts,
                    'user_is_owner' => $isGroupOwner,
                    'user_is_admin' => $isGlobalAdmin,
                    'user_is_group_admin' => $isGroupAdmin,
                ]);
            }

            // Auto-generate title from content if not provided
            $title = $request->input('title');
            if (empty($title)) {
                $title = $this->generateTitleFromContent($request->input('content'));
            }

            // Generate slug from title
            $slug = Str::slug($title);
            $originalSlug = $slug;
            $counter = 1;

            // Ensure unique slug
            while (GroupPost::where('post_name', $slug)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }

            // Create the post
            $post = GroupPost::create([
                'group_id' => $request->input('group_id'),
                'post_author' => auth()->id(),
                'post_date' => now(),
                'post_date_gmt' => now(),
                'post_modified' => now(),
                'post_modified_gmt' => now(),
                'post_title' => $title,
                'post_name' => $slug,
                'post_content' => $request->input('content'),
                'post_excerpt' => $request->input('excerpt'),
                'post_status' => $postStatus,
                'post_type' => $request->input('type', 'post'),
                'comment_status' => $request->input('comment_status', 'closed'),
                'ping_status' => $request->input('ping_status', 'closed'),
                'visibility' => $request->input('visibility', 'public'),
                'comment_count' => 0,
            ]);

            // Handle featured image if provided
            if ($request->hasFile('featured_image')) {
                $path = $request->file('featured_image')->store('group-posts/featured', 's3');
                $post->meta()->create([
                    'meta_key' => 'featured_image',
                    'meta_value' => $path,
                ]);
            }

            // Handle gallery image uploads if provided
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $image) {
                    $path = $image->store('group-posts', 's3');
                    $post->meta()->create([
                        'meta_key' => 'image',
                        'meta_value' => $path,
                    ]);
                }
            }

            // Handle video upload if provided
            if ($request->hasFile('video')) {
                $videoFile = $request->file('video');

                // Validate video file
                if ($videoFile->isValid()) {
                    // Create folder structure for video
                    $userId = auth()->id();
                    $now = now();
                    $year = $now->format('Y');
                    $month = $now->format('m');
                    $date = $now->format('d');
                    $videoUploadPath = "group-posts/videos/{$userId}/{$year}/{$month}/{$date}";
                    $videoFilename = time() . '_' . Str::random(10) . '.' . $videoFile->getClientOriginalExtension();

                    try {
                        $videoPath = $videoFile->storeAs($videoUploadPath, $videoFilename, 's3');

                        if ($videoPath !== false && !empty($videoPath)) {
                            $post->meta()->create([
                                'meta_key' => '_post_video',
                                'meta_value' => $videoPath,
                            ]);

                            \Log::info('[GroupPostController::store] Video uploaded successfully', [
                                'post_id' => $post->id,
                                'video_path' => $videoPath,
                            ]);
                        }
                    } catch (\Exception $e) {
                        \Log::error('[GroupPostController::store] Video upload failed', [
                            'post_id' => $post->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                } else {
                    \Log::warning('[GroupPostController::store] Invalid video file', [
                        'error' => $videoFile->getErrorMessage(),
                    ]);
                }
            }

            $message = $postStatus === 'pending'
                ? 'Group post created successfully and is awaiting approval'
                : 'Group post created successfully';

            return response()->json([
                'data' => new GroupPostResource($post),
                'message' => $message,
            ], 201);
        } catch (\Exception $e) {
            \Log::error('[GroupPostController::store] Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Failed to create group post',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Update the specified group post
     */
    public function update(UpdateGroupPostRequest $request, $id): JsonResponse
    {
        try {
            // Manually fetch the post with group relationship (since route uses {id}, not implicit model binding)
            $post = GroupPost::with('group')->findOrFail($id);

            $userId = auth()->id();
            $isPostAuthor = $post->post_author === $userId;
            $isGroupOwner = $post->group && $post->group->group_owner_id === $userId;
            $isGlobalAdmin = auth()->user() && auth()->user()->isAdmin();

            // Check authorization - post author, group owner, or global admin can update
            if (!$isPostAuthor && !$isGroupOwner && !$isGlobalAdmin) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to update this post',
                ], 403);
            }

            // Update post fields
            $post->update([
                'post_title' => $request->input('title', $post->post_title),
                'post_content' => $request->input('content', $post->post_content),
                'post_excerpt' => $request->input('excerpt', $post->post_excerpt),
                'post_status' => $request->input('status', $post->post_status),
                'post_type' => $request->input('type', $post->post_type),
                'comment_status' => $request->input('comment_status', $post->comment_status),
                'ping_status' => $request->input('ping_status', $post->ping_status),
                'visibility' => $request->input('visibility', $post->visibility),
                'post_modified' => now(),
                'post_modified_gmt' => now(),
            ]);

            // Handle featured image if provided
            if ($request->hasFile('featured_image')) {
                // Remove old featured image if replacing
                $oldFeaturedImage = $post->meta()->where('meta_key', 'featured_image')->first();
                if ($oldFeaturedImage) {
                    \Storage::disk('s3')->delete($oldFeaturedImage->meta_value);
                    $oldFeaturedImage->delete();
                }

                $path = $request->file('featured_image')->store('group-posts/featured', 's3');
                $post->meta()->create([
                    'meta_key' => 'featured_image',
                    'meta_value' => $path,
                ]);
            }

            // Handle gallery image uploads if provided
            if ($request->hasFile('images')) {
                // Remove old images if replacing
                if ($request->input('replace_images') === true) {
                    $oldImages = $post->meta()->where('meta_key', 'image')->get();
                    foreach ($oldImages as $oldImage) {
                        \Storage::disk('s3')->delete($oldImage->meta_value);
                    }
                    $post->meta()->where('meta_key', 'image')->delete();
                }

                foreach ($request->file('images') as $image) {
                    $path = $image->store('group-posts', 's3');
                    $post->meta()->create([
                        'meta_key' => 'image',
                        'meta_value' => $path,
                    ]);
                }
            }

            // Handle video removal if requested
            if ($request->input('remove_video') === true || $request->input('remove_video') === 'true') {
                $oldVideo = $post->meta()->where('meta_key', '_post_video')->first();
                if ($oldVideo) {
                    \Storage::disk('s3')->delete($oldVideo->meta_value);
                    $oldVideo->delete();
                    \Log::info('[GroupPostController::update] Video removed', [
                        'post_id' => $post->id,
                    ]);
                }
            }

            // Handle video upload if provided
            if ($request->hasFile('video')) {
                $videoFile = $request->file('video');

                // Validate video file
                if ($videoFile->isValid()) {
                    // Remove old video first
                    $oldVideo = $post->meta()->where('meta_key', '_post_video')->first();
                    if ($oldVideo) {
                        \Storage::disk('s3')->delete($oldVideo->meta_value);
                        $oldVideo->delete();
                    }

                    // Create folder structure for video
                    $userId = auth()->id();
                    $now = now();
                    $year = $now->format('Y');
                    $month = $now->format('m');
                    $date = $now->format('d');
                    $videoUploadPath = "group-posts/videos/{$userId}/{$year}/{$month}/{$date}";
                    $videoFilename = time() . '_' . Str::random(10) . '.' . $videoFile->getClientOriginalExtension();

                    try {
                        $videoPath = $videoFile->storeAs($videoUploadPath, $videoFilename, 's3');

                        if ($videoPath !== false && !empty($videoPath)) {
                            $post->meta()->create([
                                'meta_key' => '_post_video',
                                'meta_value' => $videoPath,
                            ]);

                            \Log::info('[GroupPostController::update] Video uploaded successfully', [
                                'post_id' => $post->id,
                                'video_path' => $videoPath,
                            ]);
                        }
                    } catch (\Exception $e) {
                        \Log::error('[GroupPostController::update] Video upload failed', [
                            'post_id' => $post->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                } else {
                    \Log::warning('[GroupPostController::update] Invalid video file', [
                        'error' => $videoFile->getErrorMessage(),
                    ]);
                }
            }

            return response()->json([
                'data' => new GroupPostResource($post->fresh()),
                'message' => 'Group post updated successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update group post',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Delete the specified group post
     */
    public function destroy($id): JsonResponse
    {
        try {
            // Manually fetch the post with group relationship (since route uses {id}, not implicit model binding)
            $post = GroupPost::with('group')->findOrFail($id);

            $userId = auth()->id();
            $isPostAuthor = $post->post_author === $userId;
            $isGroupOwner = $post->group && $post->group->group_owner_id === $userId;
            $isGlobalAdmin = auth()->user() && auth()->user()->isAdmin();

            // Check authorization - post author, group owner, or global admin can delete
            if (!$isPostAuthor && !$isGroupOwner && !$isGlobalAdmin) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to delete this post',
                ], 403);
            }

            // Delete images from S3 before deleting post
            $images = $post->meta()->where('meta_key', 'image')->get();
            foreach ($images as $image) {
                \Storage::disk('s3')->delete($image->meta_value);
            }

            // Delete featured image from S3
            $featuredImage = $post->meta()->where('meta_key', 'featured_image')->first();
            if ($featuredImage) {
                \Storage::disk('s3')->delete($featuredImage->meta_value);
            }

            // Delete video from S3
            $video = $post->meta()->where('meta_key', '_post_video')->first();
            if ($video) {
                \Storage::disk('s3')->delete($video->meta_value);
            }

            $post->delete();

            return response()->json([
                'message' => 'Group post deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete group post',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get posts by a specific user in groups
     */
    public function userPosts(Request $request, $userId): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $groupId = $request->input('group_id');
        $status = $request->input('status');

        $query = GroupPost::where('post_author', $userId);

        if ($groupId) {
            $query->where('group_id', $groupId);
        }

        // Only filter by status if explicitly provided
        if ($status) {
            $query->where('post_status', $status);
        }

        $posts = $query->orderBy('post_date', 'desc')->paginate($perPage);

        return response()->json([
            'data' => GroupPostResource::collection($posts->items()),
            'pagination' => [
                'total' => $posts->total(),
                'per_page' => $posts->perPage(),
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
            ],
        ]);
    }

    /**
     * Get posts in a specific group
     */
    public function groupPosts(Request $request, $groupId): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $status = $request->input('status', 'publish');
        $sortBy = $request->input('sort_by', 'post_date');
        $order = $request->input('order', 'desc');

        $query = GroupPost::where('group_id', $groupId);

        if ($status) {
            $query->where('post_status', $status);
        }

        $posts = $query->orderBy($sortBy, $order)->paginate($perPage);

        return response()->json([
            'data' => GroupPostResource::collection($posts->items()),
            'pagination' => [
                'total' => $posts->total(),
                'per_page' => $posts->perPage(),
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
            ],
        ]);
    }

    /**
     * Bulk delete group posts
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        try {
            $postIds = $request->input('post_ids', []);

            if (empty($postIds)) {
                return response()->json([
                    'error' => 'No posts selected',
                ], 400);
            }

            $userId = auth()->id();
            $isGlobalAdmin = auth()->user() && auth()->user()->isAdmin();

            // Build query - if not admin, can only delete own posts or posts in groups user owns
            $query = GroupPost::whereIn('id', $postIds);

            if (!$isGlobalAdmin) {
                // User can delete: posts they authored OR posts in groups they own
                $query->where(function ($q) use ($userId) {
                    $q->where('post_author', $userId)
                      ->orWhereHas('group', function ($g) use ($userId) {
                          $g->where('group_owner_id', $userId);
                      });
                });
            }

            // Get posts before deleting so we can clean up images
            $postsToDelete = $query->get();

            // Delete all images from S3 before deleting posts
            foreach ($postsToDelete as $post) {
                // Delete gallery images
                $images = $post->meta()->where('meta_key', 'image')->get();
                foreach ($images as $image) {
                    \Storage::disk('s3')->delete($image->meta_value);
                }

                // Delete featured image
                $featuredImage = $post->meta()->where('meta_key', 'featured_image')->first();
                if ($featuredImage) {
                    \Storage::disk('s3')->delete($featuredImage->meta_value);
                }
            }

            $deletedCount = GroupPost::whereIn('id', $postsToDelete->pluck('id'))->delete();

            return response()->json([
                'message' => "Deleted $deletedCount group posts successfully",
                'deleted_count' => $deletedCount,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to bulk delete posts',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Like a group post
     */
    public function like(GroupPost $post): JsonResponse
    {
        try {
            $userId = auth()->id();

            // Check if already liked
            $existing = GroupPostLike::where('post_id', $post->id)
                ->where('user_id', $userId)
                ->first();

            if ($existing) {
                return response()->json([
                    'error' => 'Already liked',
                    'message' => 'You have already liked this post',
                ], 400);
            }

            // Remove dislike if exists
            GroupPostDislike::where('post_id', $post->id)
                ->where('user_id', $userId)
                ->delete();

            // Create like
            GroupPostLike::create([
                'post_id' => $post->id,
                'user_id' => $userId,
            ]);

            // Update like count
            $likeCount = GroupPostLike::where('post_id', $post->id)->count();
            $post->update(['comment_count' => $likeCount]); // Using comment_count as engagement metric

            return response()->json([
                'message' => 'Post liked successfully',
                'likes_count' => $likeCount,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to like post',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Unlike a group post
     */
    public function unlike(GroupPost $post): JsonResponse
    {
        try {
            $userId = auth()->id();

            $deleted = GroupPostLike::where('post_id', $post->id)
                ->where('user_id', $userId)
                ->delete();

            if (!$deleted) {
                return response()->json([
                    'error' => 'Not liked',
                    'message' => 'You have not liked this post',
                ], 400);
            }

            // Update like count
            $likeCount = GroupPostLike::where('post_id', $post->id)->count();
            $post->update(['comment_count' => $likeCount]);

            return response()->json([
                'message' => 'Like removed successfully',
                'likes_count' => $likeCount,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to unlike post',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Dislike a group post
     */
    public function dislike(GroupPost $post): JsonResponse
    {
        try {
            $userId = auth()->id();

            // Check if already disliked
            $existing = GroupPostDislike::where('post_id', $post->id)
                ->where('user_id', $userId)
                ->first();

            if ($existing) {
                return response()->json([
                    'error' => 'Already disliked',
                    'message' => 'You have already disliked this post',
                ], 400);
            }

            // Remove like if exists
            GroupPostLike::where('post_id', $post->id)
                ->where('user_id', $userId)
                ->delete();

            // Create dislike
            GroupPostDislike::create([
                'post_id' => $post->id,
                'user_id' => $userId,
            ]);

            return response()->json([
                'message' => 'Post disliked successfully',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to dislike post',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Remove dislike from a group post
     */
    public function removeDislike(GroupPost $post): JsonResponse
    {
        try {
            $userId = auth()->id();

            $deleted = GroupPostDislike::where('post_id', $post->id)
                ->where('user_id', $userId)
                ->delete();

            if (!$deleted) {
                return response()->json([
                    'error' => 'Not disliked',
                    'message' => 'You have not disliked this post',
                ], 400);
            }

            return response()->json([
                'message' => 'Dislike removed successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to remove dislike',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get engagement stats for a post
     */
    public function getEngagementStats(GroupPost $post): JsonResponse
    {
        try {
            $user = auth()->user();

            $likesCount = GroupPostLike::where('post_id', $post->id)->count();
            $dislikesCount = GroupPostDislike::where('post_id', $post->id)->count();
            $commentsCount = GroupComment::where('post_id', $post->id)->count();

            $userLiked = false;
            $userDisliked = false;

            if ($user) {
                $userLiked = GroupPostLike::where('post_id', $post->id)
                    ->where('user_id', $user->ID)
                    ->exists();

                $userDisliked = GroupPostDislike::where('post_id', $post->id)
                    ->where('user_id', $user->ID)
                    ->exists();
            }

            return response()->json([
                'likes' => [
                    'count' => $likesCount,
                    'user_liked' => $userLiked,
                ],
                'dislikes' => [
                    'count' => $dislikesCount,
                    'user_disliked' => $userDisliked,
                ],
                'comments' => [
                    'count' => $commentsCount,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching group post engagement stats: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to get engagement stats',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get likes for a post
     */
    public function getLikes(Request $request, GroupPost $post): JsonResponse
    {
        try {
            $perPage = $request->input('per_page', 15);

            $likes = GroupPostLike::where('post_id', $post->id)
                ->with('user')
                ->orderBy('created_at', 'desc')
                ->paginate($perPage);

            return response()->json([
                'data' => $likes->items(),
                'pagination' => [
                    'total' => $likes->total(),
                    'per_page' => $likes->perPage(),
                    'current_page' => $likes->currentPage(),
                    'last_page' => $likes->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get likes',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Set featured image for a post
     */
    public function setFeaturedImage(Request $request, $id): JsonResponse
    {
        try {
            // Manually fetch the post with group relationship (since route uses {id}, not implicit model binding)
            $post = GroupPost::with('group')->findOrFail($id);

            $userId = auth()->id();
            $isPostAuthor = $post->post_author === $userId;
            $isGroupOwner = $post->group && $post->group->group_owner_id === $userId;
            $isGlobalAdmin = auth()->user() && auth()->user()->isAdmin();

            // Check authorization - post author, group owner, or global admin can update featured image
            if (!$isPostAuthor && !$isGroupOwner && !$isGlobalAdmin) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to update this post',
                ], 403);
            }

            $request->validate([
                'featured_image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            ]);

            // Delete old featured image if exists
            $oldFeaturedImage = $post->meta()->where('meta_key', 'featured_image')->first();
            if ($oldFeaturedImage) {
                \Storage::disk('s3')->delete($oldFeaturedImage->meta_value);
                $oldFeaturedImage->delete();
            }

            // Store the featured image to S3
            $path = $request->file('featured_image')->store('group-posts/featured', 's3');

            // Save featured image path to meta table
            $post->meta()->create([
                'meta_key' => 'featured_image',
                'meta_value' => $path,
            ]);

            return response()->json([
                'data' => new GroupPostResource($post),
                'message' => 'Featured image set successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to set featured image',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get posts sorted by engagement
     */
    public function popular(Request $request): JsonResponse
    {
        try {
            $perPage = $request->input('per_page', 15);
            $days = $request->input('days', 7);

            $posts = GroupPost::where('post_status', 'publish')
                ->where('post_date', '>=', now()->subDays($days))
                ->withCount('likes', 'dislikes', 'comments')
                ->orderByRaw('(SELECT COUNT(*) FROM group_post_likes WHERE group_post_likes.post_id = group_posts.id) DESC')
                ->paginate($perPage);

            return response()->json([
                'data' => GroupPostResource::collection($posts->items()),
                'pagination' => [
                    'total' => $posts->total(),
                    'per_page' => $posts->perPage(),
                    'current_page' => $posts->currentPage(),
                    'last_page' => $posts->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get popular posts',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Approve a pending group post (admin/moderator only)
     */
    public function approvePost($groupId, $postId): JsonResponse
    {
        try {
            // Fetch group
            $group = Group::findOrFail($groupId);

            // Fetch post
            $post = GroupPost::findOrFail($postId);

            // Verify post belongs to the group
            if ($post->group_id !== $group->group_id) {
                return response()->json([
                    'error' => 'Not found',
                    'message' => 'Post does not belong to this group',
                ], 404);
            }

            // Check authorization - only group owner, admin, or moderator can approve
            $currentUser = auth()->user();

            \Log::info('[GroupPostController::approvePost] Checking authorization', [
                'user_id' => $currentUser->ID,
                'post_id' => $post->id,
                'group_id' => $group->group_id,
                'group_owner_id' => $group->group_owner_id,
                'is_group_owner' => $group->group_owner_id === $currentUser->ID,
            ]);

            // Authorization: allow if user is group owner, global admin, or group admin/moderator
            $isGroupOwner = $group->group_owner_id === $currentUser->ID;
            $isGlobalAdmin = $currentUser->isAdmin();

            // Only check group_users table if not owner or global admin
            $isGroupAdmin = false;
            if (!$isGroupOwner && !$isGlobalAdmin) {
                $userRole = GroupUser::where('group_id', $group->group_id)
                    ->where('group_user_id', $currentUser->ID)
                    ->first();

                $isGroupAdmin = $userRole && in_array($userRole->group_role, ['admin', 'moderator']);
            }

            if (!$isGroupOwner && !$isGlobalAdmin && !$isGroupAdmin) {
                \Log::warning('[GroupPostController::approvePost] Authorization failed', [
                    'user_id' => $currentUser->ID,
                    'is_group_owner' => $isGroupOwner,
                    'is_global_admin' => $isGlobalAdmin,
                    'is_group_admin' => $isGroupAdmin,
                ]);

                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to approve posts',
                ], 403);
            }

            // Update post status to published
            $post->update(['post_status' => 'publish']);

            return response()->json([
                'data' => new GroupPostResource($post),
                'message' => 'Post approved successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('[GroupPostController::approvePost] Error', [
                'error' => $e->getMessage(),
                'post_id' => $post->id,
            ]);

            return response()->json([
                'error' => 'Failed to approve post',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Reject/trash a group post (admin/moderator only)
     */
    public function rejectPost($groupId, $postId): JsonResponse
    {
        try {
            // Fetch group
            $group = Group::findOrFail($groupId);

            // Fetch post
            $post = GroupPost::findOrFail($postId);

            // Verify post belongs to the group
            if ($post->group_id !== $group->group_id) {
                return response()->json([
                    'error' => 'Not found',
                    'message' => 'Post does not belong to this group',
                ], 404);
            }

            // Check authorization - only group owner, admin, or moderator can reject
            $currentUser = auth()->user();

            \Log::info('[GroupPostController::rejectPost] Checking authorization', [
                'user_id' => $currentUser->ID,
                'post_id' => $post->id,
                'group_id' => $group->group_id,
                'group_owner_id' => $group->group_owner_id,
                'is_group_owner' => $group->group_owner_id === $currentUser->ID,
            ]);

            // Authorization: allow if user is group owner, global admin, or group admin/moderator
            $isGroupOwner = $group->group_owner_id === $currentUser->ID;
            $isGlobalAdmin = $currentUser->isAdmin();

            // Only check group_users table if not owner or global admin
            $isGroupAdmin = false;
            if (!$isGroupOwner && !$isGlobalAdmin) {
                $userRole = GroupUser::where('group_id', $group->group_id)
                    ->where('group_user_id', $currentUser->ID)
                    ->first();

                $isGroupAdmin = $userRole && in_array($userRole->group_role, ['admin', 'moderator']);
            }

            if (!$isGroupOwner && !$isGlobalAdmin && !$isGroupAdmin) {
                \Log::warning('[GroupPostController::rejectPost] Authorization failed', [
                    'user_id' => $currentUser->ID,
                    'is_group_owner' => $isGroupOwner,
                    'is_global_admin' => $isGlobalAdmin,
                    'is_group_admin' => $isGroupAdmin,
                ]);

                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to reject posts',
                ], 403);
            }

            // Update post status to trash
            $post->update(['post_status' => 'trash']);

            return response()->json([
                'message' => 'Post rejected successfully',
                'post_id' => $post->id,
                'status' => 'trash',
            ]);
        } catch (\Exception $e) {
            \Log::error('[GroupPostController::rejectPost] Error', [
                'error' => $e->getMessage(),
                'post_id' => $post->id,
            ]);

            return response()->json([
                'error' => 'Failed to reject post',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get pending posts for moderation (admin/moderator only)
     */
    public function getPendingPosts(Group $group): JsonResponse
    {
        try {
            // Check authorization - only group owner, admin, or moderator can view pending
            $currentUser = auth()->user();

            \Log::info('[GroupPostController::getPendingPosts] Checking authorization', [
                'user_id' => $currentUser->ID,
                'user_type' => $currentUser->ID ? 'authenticated' : 'guest',
                'group_id' => $group->group_id,
                'group_owner_id' => $group->group_owner_id,
                'comparison_result' => $group->group_owner_id === $currentUser->ID ? 'IS_OWNER' : 'NOT_OWNER',
                'is_global_admin' => $currentUser->isAdmin(),
            ]);

            // Authorization: allow if user is group owner, global admin, or group admin/moderator
            $isGroupOwner = $group->group_owner_id === $currentUser->ID;
            $isGlobalAdmin = $currentUser->isAdmin();

            // Only check group_users table if not owner or global admin
            $isGroupAdmin = false;
            if (!$isGroupOwner && !$isGlobalAdmin) {
                $userRole = GroupUser::where('group_id', $group->group_id)
                    ->where('group_user_id', $currentUser->ID)
                    ->first();

                \Log::info('[GroupPostController::getPendingPosts] Checking group user role', [
                    'user_id' => $currentUser->ID,
                    'user_role' => $userRole ? $userRole->group_role : 'not_found',
                    'user_status' => $userRole ? $userRole->status : 'not_found',
                ]);

                $isGroupAdmin = $userRole && in_array($userRole->group_role, ['admin', 'moderator']);
            }

            if (!$isGroupOwner && !$isGlobalAdmin && !$isGroupAdmin) {
                \Log::warning('[GroupPostController::getPendingPosts] Authorization failed', [
                    'user_id' => $currentUser->ID,
                    'is_group_owner' => $isGroupOwner,
                    'is_global_admin' => $isGlobalAdmin,
                    'is_group_admin' => $isGroupAdmin,
                    'group_id' => $group->group_id,
                    'group_owner_id' => $group->group_owner_id,
                ]);

                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to view pending posts',
                ], 403);
            }

            $pendingPosts = GroupPost::where('group_id', $group->group_id)
                ->where('post_status', 'pending')
                ->with('author')
                ->orderBy('post_date', 'desc')
                ->get();

            return response()->json([
                'data' => GroupPostResource::collection($pendingPosts),
                'total' => count($pendingPosts),
            ]);
        } catch (\Exception $e) {
            \Log::error('[GroupPostController::getPendingPosts] Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Failed to get pending posts',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Share a group post to a user's wall
     */
    public function shareToWall(GroupPost $post, Request $request): JsonResponse
    {
        try {
            $currentUser = auth()->user();
            $wallId = $request->input('wall_id');

            // Validate wall_id
            if (!$wallId) {
                return response()->json([
                    'error' => 'Missing wall_id',
                    'message' => 'Please specify a wall_id',
                ], 400);
            }

            // Check if post is published
            if ($post->post_status !== 'publish') {
                return response()->json([
                    'error' => 'Invalid post',
                    'message' => 'Only published posts can be shared',
                ], 422);
            }

            // Check if post is already shared to that wall
            $existingShare = ShareWall::where('user_id', $wallId)
                ->where('group_post_id', $post->id)
                ->where('post_type', ShareWall::POST_TYPE_GROUPPOST)
                ->exists();

            if ($existingShare) {
                return response()->json([
                    'error' => 'Already shared',
                    'message' => 'This post is already shared to that wall',
                ], 422);
            }

            // Create the share record
            try {
                ShareWall::create([
                    'user_id' => $wallId,
                    'group_post_id' => $post->id,
                    'post_type' => ShareWall::POST_TYPE_GROUPPOST,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Group post shared to wall successfully',
                    'data' => new GroupPostResource($post->load(['author'])),
                ]);
            } catch (\Exception $e) {
                \Log::error('[GroupPostController::shareToWall] Share failed', [
                    'post_id' => $post->id,
                    'wall_id' => $wallId,
                    'error' => $e->getMessage(),
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Failed to share post',
                    'message' => $e->getMessage(),
                ], 500);
            }
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to share post',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    // ============================================
    // ADMIN ONLY METHODS
    // ============================================

    /**
     * ADMIN ONLY: Get all group posts with filtering and pagination
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 15);

        $query = GroupPost::with(['group', 'author', 'meta']);

        // Filter by group
        if ($request->has('group_id')) {
            $query->where('group_id', $request->input('group_id'));
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('post_status', $request->input('status'));
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
        $sortBy = $request->input('sort_by', 'post_date');
        $order = $request->input('order', 'desc');
        $query->orderBy($sortBy, $order);

        $posts = $query->paginate($perPage);

        return response()->json([
            'data' => GroupPostResource::collection($posts->items()),
            'pagination' => [
                'total' => $posts->total(),
                'per_page' => $posts->perPage(),
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'from' => $posts->firstItem(),
                'to' => $posts->lastItem(),
            ],
        ]);
    }

    /**
     * ADMIN ONLY: Get a single group post by ID
     */
    public function adminShow($id): JsonResponse
    {
        $post = GroupPost::with(['group', 'author', 'meta'])->findOrFail($id);

        return response()->json([
            'data' => new GroupPostResource($post),
        ]);
    }

    /**
     * ADMIN ONLY: Create a new group post
     */
    public function adminStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'group_id' => 'required|exists:groups,group_id',
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string',
            'status' => 'nullable|string|in:publish,draft,pending,trash',
            'type' => 'nullable|string|in:post,page',
            'author_id' => 'nullable|integer|exists:wp_users,ID',
            'visibility' => 'nullable|string|in:public,private',
        ]);

        $user = $request->user();
        $authorId = $validated['author_id'] ?? $user->ID;

        $post = GroupPost::create([
            'group_id' => $validated['group_id'],
            'post_author' => $authorId,
            'post_date' => now(),
            'post_date_gmt' => now(),
            'post_modified' => now(),
            'post_modified_gmt' => now(),
            'post_title' => $validated['title'],
            'post_content' => $validated['content'],
            'post_excerpt' => $validated['excerpt'] ?? '',
            'post_status' => $validated['status'] ?? 'publish',
            'post_type' => $validated['type'] ?? 'post',
            'comment_status' => 'closed',
            'ping_status' => 'closed',
            'visibility' => $validated['visibility'] ?? 'public',
            'comment_count' => 0,
        ]);

        \Log::info('[GroupPostController::adminStore] Group post created by admin', [
            'created_by' => $user->ID,
            'post_id' => $post->id,
            'group_id' => $post->group_id,
            'title' => $post->post_title,
        ]);

        return response()->json([
            'data' => new GroupPostResource($post->load(['group', 'author'])),
            'message' => 'Group post created successfully',
        ], 201);
    }

    /**
     * ADMIN ONLY: Update any group post
     */
    public function adminUpdate(Request $request, $id): JsonResponse
    {
        $post = GroupPost::findOrFail($id);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'excerpt' => 'nullable|string',
            'status' => 'nullable|string|in:publish,draft,pending,trash',
            'type' => 'nullable|string|in:post,page',
            'visibility' => 'nullable|string|in:public,private',
        ]);

        // Update fields
        $post->update([
            'post_title' => $validated['title'] ?? $post->post_title,
            'post_content' => $validated['content'] ?? $post->post_content,
            'post_excerpt' => $validated['excerpt'] ?? $post->post_excerpt,
            'post_status' => $validated['status'] ?? $post->post_status,
            'post_type' => $validated['type'] ?? $post->post_type,
            'visibility' => $validated['visibility'] ?? $post->visibility,
            'post_modified' => now(),
            'post_modified_gmt' => now(),
        ]);

        \Log::info('[GroupPostController::adminUpdate] Group post updated by admin', [
            'updated_by' => $request->user()->ID,
            'post_id' => $post->id,
            'fields_updated' => array_keys($validated),
        ]);

        return response()->json([
            'data' => new GroupPostResource($post->load(['group', 'author'])),
            'message' => 'Group post updated successfully',
        ]);
    }

    /**
     * ADMIN ONLY: Delete any group post
     */
    public function adminDestroy(Request $request, $id): JsonResponse
    {
        $post = GroupPost::findOrFail($id);

        $title = $post->post_title;
        $groupId = $post->group_id;
        $authorId = $post->post_author;

        // Delete gallery images from S3
        $images = $post->meta()->where('meta_key', 'image')->get();
        foreach ($images as $image) {
            \Storage::disk('s3')->delete($image->meta_value);
        }

        // Delete featured image from S3
        $featuredImage = $post->meta()->where('meta_key', 'featured_image')->first();
        if ($featuredImage) {
            \Storage::disk('s3')->delete($featuredImage->meta_value);
        }

        // Delete meta
        $post->meta()->delete();

        // Delete likes and dislikes
        GroupPostLike::where('post_id', $post->id)->delete();
        GroupPostDislike::where('post_id', $post->id)->delete();

        // Delete comments
        GroupComment::where('post_id', $post->id)->delete();

        // Delete share walls
        ShareWall::where('group_post_id', $post->id)->delete();

        // Delete post
        $post->delete();

        \Log::info('[GroupPostController::adminDestroy] Group post deleted by admin', [
            'deleted_by' => $request->user()->ID,
            'post_id' => $id,
            'title' => $title,
            'group_id' => $groupId,
            'original_author_id' => $authorId,
        ]);

        return response()->json([
            'message' => 'Group post deleted successfully',
            'deleted_post' => [
                'id' => $id,
                'title' => $title,
                'group_id' => $groupId,
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
