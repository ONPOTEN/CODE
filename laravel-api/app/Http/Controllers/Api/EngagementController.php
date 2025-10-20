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
        $user = $request->user();
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
    }

    /**
     * Unlike a post
     */
    public function unlikePost(Request $request, $postId): JsonResponse
    {
        $user = $request->user();

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
    }

    /**
     * Dislike a post
     */
    public function dislikePost(Request $request, $postId): JsonResponse
    {
        $user = $request->user();
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
    }

    /**
     * Remove dislike from a post
     */
    public function removeDislikePost(Request $request, $postId): JsonResponse
    {
        $user = $request->user();

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
    }

    /**
     * Share a post
     */
    public function sharePost(Request $request, $postId): JsonResponse
    {
        $validated = $request->validate([
            'shared_via' => 'nullable|string|in:direct,facebook,twitter,whatsapp,linkedin,email',
        ]);

        $user = $request->user();
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
    }

    /**
     * Get engagement stats for a post
     */
    public function getEngagementStats(Request $request, $postId): JsonResponse
    {
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
