<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GroupPost;
use App\Models\GroupPostLike;
use App\Models\GroupPostDislike;
use App\Models\GroupPostShare;
use App\Models\Notify;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupPostEngagementController extends Controller
{
    /**
     * Like a group post
     */
    public function likePost(Request $request, int $postId): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized',
                    'error' => 'User not authenticated',
                ], 401);
            }

            // Check if post exists
            $post = GroupPost::findOrFail($postId);

            // Check if user already liked this post
            $existingLike = GroupPostLike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->first();

            if ($existingLike) {
                return response()->json([
                    'message' => 'You have already liked this post',
                    'post_id' => $postId,
                    'user_id' => $user->ID,
                    'liked' => true,
                    'likes_count' => $post->likes()->count(),
                ], 200);
            }

            // Remove dislike if exists
            GroupPostDislike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->delete();

            // Create like
            GroupPostLike::create([
                'post_id' => $postId,
                'user_id' => $user->ID,
            ]);

            // Create notification for group post like
            $notify = Notify::create([
                'userid' => $user->ID,
                'ownid' => $post->post_author,
                'type' => 'like',
                'posttype' => 'grouppost',
                'postid' => $postId,
                'content' => $post->post_content ?? '',
                'status' => 0,
            ]);

            // Emit notification via Socket.IO to post author (ownid)
            \App\Http\Controllers\Api\NotifyController::emitNotification($post->post_author, [
                'id' => $notify->id,
                'userid' => $user->ID,
                'ownid' => $post->post_author,
                'type' => 'like',
                'posttype' => 'grouppost',
                'postid' => $postId,
                'content' => $post->post_content ?? '',
                'status' => 0,
                'created_at' => $notify->created_at->toIso8601String(),
            ]);

            return response()->json([
                'message' => 'Post liked successfully',
                'post_id' => $postId,
                'user_id' => $user->ID,
                'liked' => true,
                'likes_count' => $post->likes()->count(),
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Post not found',
                'error' => $e->getMessage(),
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Error in likePost:', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to like post',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Unlike a group post
     */
    public function unlikePost(Request $request, int $postId): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized',
                    'error' => 'User not authenticated',
                ], 401);
            }

            $deleted = GroupPostLike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->delete();

            if (!$deleted) {
                return response()->json([
                    'message' => 'You have not liked this post',
                ], 404);
            }

            $post = GroupPost::findOrFail($postId);

            return response()->json([
                'message' => 'Post unliked successfully',
                'post_id' => $postId,
                'user_id' => $user->ID,
                'liked' => false,
                'likes_count' => $post->likes()->count(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in unlikePost:', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to unlike post',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Dislike a group post
     */
    public function dislikePost(Request $request, int $postId): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized',
                    'error' => 'User not authenticated',
                ], 401);
            }

            $post = GroupPost::findOrFail($postId);

            // Check if user already disliked this post
            $existingDislike = GroupPostDislike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->first();

            if ($existingDislike) {
                return response()->json([
                    'message' => 'You have already disliked this post',
                    'post_id' => $postId,
                    'user_id' => $user->ID,
                    'disliked' => true,
                    'dislikes_count' => $post->dislikes()->count(),
                ], 200);
            }

            // Remove like if exists
            GroupPostLike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->delete();

            // Create dislike
            GroupPostDislike::create([
                'post_id' => $postId,
                'user_id' => $user->ID,
            ]);

            return response()->json([
                'message' => 'Post disliked successfully',
                'post_id' => $postId,
                'user_id' => $user->ID,
                'disliked' => true,
                'dislikes_count' => $post->dislikes()->count(),
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Error in dislikePost:', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to dislike post',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove dislike from a group post
     */
    public function removeDislikePost(Request $request, int $postId): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized',
                    'error' => 'User not authenticated',
                ], 401);
            }

            $deleted = GroupPostDislike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->delete();

            if (!$deleted) {
                return response()->json([
                    'message' => 'You have not disliked this post',
                ], 404);
            }

            $post = GroupPost::findOrFail($postId);

            return response()->json([
                'message' => 'Post dislike removed successfully',
                'post_id' => $postId,
                'user_id' => $user->ID,
                'disliked' => false,
                'dislikes_count' => $post->dislikes()->count(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in removeDislikePost:', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to remove dislike',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Share a group post
     */
    public function sharePost(Request $request, int $postId): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized',
                    'error' => 'User not authenticated',
                ], 401);
            }

            $validated = $request->validate([
                'shared_via' => 'nullable|string|in:direct,facebook,twitter,whatsapp,linkedin,email',
            ]);

            $post = GroupPost::findOrFail($postId);

            // Create share record
            GroupPostShare::create([
                'post_id' => $postId,
                'user_id' => $user->ID,
                'shared_via' => $validated['shared_via'] ?? 'direct',
            ]);

            return response()->json([
                'message' => 'Post shared successfully',
                'post_id' => $postId,
                'user_id' => $user->ID,
                'shared_via' => $validated['shared_via'] ?? 'direct',
                'shares_count' => $post->shares()->count(),
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Error in sharePost:', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to share post',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get engagement stats for a group post
     */
    public function getEngagementStats(Request $request, int $postId): JsonResponse
    {
        try {
            $post = GroupPost::with(['likes', 'dislikes', 'shares', 'comments'])->findOrFail($postId);
            $user = $request->user();

            $userLiked = false;
            $userDisliked = false;

            if ($user) {
                $userLiked = GroupPostLike::where('post_id', $postId)
                    ->where('user_id', $user->ID)
                    ->exists();

                $userDisliked = GroupPostDislike::where('post_id', $postId)
                    ->where('user_id', $user->ID)
                    ->exists();
            }

            return response()->json([
                'post_id' => $postId,
                'likes' => [
                    'count' => $post->likes()->count(),
                    'user_liked' => $userLiked,
                ],
                'dislikes' => [
                    'count' => $post->dislikes()->count(),
                    'user_disliked' => $userDisliked,
                ],
                'comments' => [
                    'count' => $post->comments()->count(),
                ],
                'shares' => [
                    'count' => $post->shares()->count(),
                ],
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Post not found',
                'message' => 'The requested post does not exist',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Error fetching engagement stats: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch engagement stats',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all likes for a group post
     */
    public function getPostLikes(Request $request, int $postId)
    {
        try {
            $perPage = min($request->input('per_page', 15), 100);

            $likes = GroupPostLike::where('post_id', $postId)
                ->with('user')
                ->orderBy('created_at', 'desc')
                ->paginate($perPage);

            return response()->json([
                'post_id' => $postId,
                'total' => $likes->total(),
                'data' => $likes->through(function ($like) {
                    return [
                        'user_id' => $like->user->ID,
                        'user_name' => $like->user->user_nicename ?? $like->user->user_login,
                        'user_email' => $like->user->user_email,
                        'liked_at' => $like->created_at,
                    ];
                }),
                'pagination' => [
                    'current_page' => $likes->currentPage(),
                    'last_page' => $likes->lastPage(),
                    'per_page' => $likes->perPage(),
                    'total' => $likes->total(),
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getPostLikes:', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Failed to retrieve likes',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all shares for a group post
     */
    public function getPostShares(Request $request, int $postId)
    {
        try {
            $perPage = min($request->input('per_page', 15), 100);

            $shares = GroupPostShare::where('post_id', $postId)
                ->with('user')
                ->orderBy('created_at', 'desc')
                ->paginate($perPage);

            return response()->json([
                'post_id' => $postId,
                'total' => $shares->total(),
                'data' => $shares->through(function ($share) {
                    return [
                        'user_id' => $share->user->ID,
                        'user_name' => $share->user->user_nicename ?? $share->user->user_login,
                        'shared_via' => $share->shared_via,
                        'shared_at' => $share->created_at,
                    ];
                }),
                'pagination' => [
                    'current_page' => $shares->currentPage(),
                    'last_page' => $shares->lastPage(),
                    'per_page' => $shares->perPage(),
                    'total' => $shares->total(),
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getPostShares:', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Failed to retrieve shares',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
