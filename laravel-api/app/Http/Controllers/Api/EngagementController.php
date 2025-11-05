<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dislike;
use App\Models\Like;
use App\Models\Share;
use App\Models\WpPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EngagementController extends Controller
{
    /**
     * Like a post
     */
    public function likePost(Request $request, $postId): JsonResponse
    {
        try {
            // Debug logging
            \Log::debug('likePost called', [
                'postId' => $postId,
                'headers' => $request->headers->all(),
                'auth_header' => $request->header('Authorization') ? substr($request->header('Authorization'), 0, 20) . '...' : 'none',
            ]);

            $user = $request->user();

            // Check if user is authenticated
            if (!$user) {
                \Log::warning('User not authenticated in likePost', [
                    'postId' => $postId,
                    'auth_header' => $request->header('Authorization') ? 'present' : 'missing',
                ]);
                return response()->json([
                    'message' => 'Unauthorized',
                    'error' => 'User not authenticated',
                ], 401);
            }

            // Check if post exists
            $post = WpPost::findOrFail($postId);

            // Check if user already liked this post
            $existingLike = Like::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->first();

            if ($existingLike) {
                return response()->json([
                    'message' => 'You have already liked this post',
                    'post_id' => $postId,
                    'user_id' => $user->ID,
                    'liked' => true,
                ], 200);
            }

            // Remove dislike if exists
            Dislike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->delete();

            // Create like
            Like::create([
                'post_id' => $postId,
                'user_id' => $user->ID,
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
        } catch (\Illuminate\Database\QueryException $e) {
            \Log::error('Database error in likePost:', [
                'error' => $e->getMessage(),
                'postId' => $postId,
                'userId' => $request->user()?->ID,
            ]);
            return response()->json([
                'message' => 'Failed to like post',
                'error' => 'Database error: ' . $e->getMessage(),
            ], 500);
        } catch (\Exception $e) {
            \Log::error('Unexpected error in likePost:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Failed to like post',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Unlike a post
     */
    public function unlikePost(Request $request, $postId): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized',
                    'error' => 'User not authenticated',
                ], 401);
            }

            $deleted = Like::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->delete();

            if (!$deleted) {
                return response()->json([
                    'message' => 'You have not liked this post',
                ], 404);
            }

            $post = WpPost::findOrFail($postId);

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
     * Dislike a post
     */
    public function dislikePost(Request $request, $postId): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized',
                    'error' => 'User not authenticated',
                ], 401);
            }

            $post = WpPost::findOrFail($postId);

            // Check if user already disliked this post
            $existingDislike = Dislike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->first();

            if ($existingDislike) {
                return response()->json([
                    'message' => 'You have already disliked this post',
                    'post_id' => $postId,
                    'user_id' => $user->ID,
                    'disliked' => true,
                ], 200);
            }

            // Remove like if exists
            Like::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->delete();

            // Create dislike
            Dislike::create([
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
     * Remove dislike from a post
     */
    public function removeDislikePost(Request $request, $postId): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'message' => 'Unauthorized',
                    'error' => 'User not authenticated',
                ], 401);
            }

            $deleted = Dislike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->delete();

            if (!$deleted) {
                return response()->json([
                    'message' => 'You have not disliked this post',
                ], 404);
            }

            $post = WpPost::findOrFail($postId);

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
     * Share a post
     */
    public function sharePost(Request $request, $postId): JsonResponse
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

            $post = WpPost::findOrFail($postId);

            // Create share record
            Share::create([
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
     * Get engagement stats for a post
     */
    public function getEngagementStats(Request $request, $postId): JsonResponse
    {
        try {
            $post = WpPost::with(['likes', 'dislikes', 'shares', 'comments'])->findOrFail($postId);
            $user = $request->user();

            $userLiked = false;
            $userDisliked = false;

            if ($user) {
                $userLiked = Like::where('post_id', $postId)
                    ->where('user_id', $user->ID)
                    ->exists();

                $userDisliked = Dislike::where('post_id', $postId)
                    ->where('user_id', $user->ID)
                    ->exists();
            }

            return response()->json([
                'post_id' => $postId,
                'likes' => [
                    'count' => count($post->likes ?? []),
                    'user_liked' => $userLiked,
                ],
                'dislikes' => [
                    'count' => count($post->dislikes ?? []),
                    'user_disliked' => $userDisliked,
                ],
                'comments' => [
                    'count' => count($post->comments ?? []),
                ],
                'shares' => [
                    'count' => count($post->shares ?? []),
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
     * Get all likes for a post
     */
    public function getPostLikes(Request $request, $postId)
    {
        $perPage = min($request->input('per_page', 15), 100);

        $likes = Like::where('post_id', $postId)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'post_id' => $postId,
            'total' => $likes->total(),
            'likes' => $likes->through(function ($like) {
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
    }

    /**
     * Get all shares for a post
     */
    public function getPostShares(Request $request, $postId)
    {
        $perPage = min($request->input('per_page', 15), 100);

        $shares = Share::where('post_id', $postId)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'post_id' => $postId,
            'total' => $shares->total(),
            'shares' => $shares->through(function ($share) {
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
    }
}
