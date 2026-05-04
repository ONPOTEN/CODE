<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notify;
use App\Models\ShopPost;
use App\Models\ShopPostLike;
use App\Models\ShopPostDislike;
use App\Models\ShopPostShare;
use App\Models\ShopPostComment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ShopPostEngagementController extends Controller
{
    /**
     * Get engagement stats for a shop post
     */
    public function getStats(int $postId): JsonResponse
    {
        $post = ShopPost::find($postId);

        if (!$post) {
            return response()->json([
                'success' => false,
                'message' => 'Post not found',
            ], 404);
        }

        $userId = auth()->id();

        return response()->json([
            'success' => true,
            'data' => [
                'likes_count' => $post->getLikesCount(),
                'dislikes_count' => $post->getDislikesCount(),
                'shares_count' => $post->getSharesCount(),
                'comments_count' => $post->getCommentsCount(),
                'user_has_liked' => $userId ? $post->hasUserLiked($userId) : false,
                'user_has_disliked' => $userId ? $post->hasUserDisliked($userId) : false,
            ],
        ]);
    }

    /**
     * Like a shop post
     */
    public function like(int $postId): JsonResponse
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required',
            ], 401);
        }

        $post = ShopPost::find($postId);

        if (!$post) {
            return response()->json([
                'success' => false,
                'message' => 'Post not found',
            ], 404);
        }

        try {
            DB::beginTransaction();

            // Check if already liked
            $existingLike = ShopPostLike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->first();

            if ($existingLike) {
                // Unlike - remove the like
                $existingLike->delete();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Like removed',
                    'data' => [
                        'liked' => false,
                        'likes_count' => $post->getLikesCount(),
                        'dislikes_count' => $post->getDislikesCount(),
                    ],
                ]);
            }

            // Remove dislike if exists
            ShopPostDislike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->delete();

            // Add like
            ShopPostLike::create([
                'post_id' => $postId,
                'user_id' => $user->ID,
            ]);

            // Create notification for shop post like
            $notify = Notify::create([
                'userid' => $user->ID,
                'ownid' => $post->user_id,
                'type' => 'like',
                'posttype' => 'shoppost',
                'postid' => $postId,
                'content' => $post->post_content ?? '',
                'status' => 0,
            ]);

            // Emit notification via Socket.IO to shop owner (ownid)
            \App\Http\Controllers\Api\NotifyController::emitNotification($post->user_id, [
                'id' => $notify->id,
                'userid' => $user->ID,
                'ownid' => $post->user_id,
                'type' => 'like',
                'posttype' => 'shoppost',
                'postid' => $postId,
                'content' => $post->post_content ?? '',
                'status' => 0,
                'created_at' => $notify->created_at->toIso8601String(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Post liked',
                'data' => [
                    'liked' => true,
                    'likes_count' => $post->getLikesCount(),
                    'dislikes_count' => $post->getDislikesCount(),
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to like post',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Dislike a shop post
     */
    public function dislike(int $postId): JsonResponse
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required',
            ], 401);
        }

        $post = ShopPost::find($postId);

        if (!$post) {
            return response()->json([
                'success' => false,
                'message' => 'Post not found',
            ], 404);
        }

        try {
            DB::beginTransaction();

            // Check if already disliked
            $existingDislike = ShopPostDislike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->first();

            if ($existingDislike) {
                // Remove dislike
                $existingDislike->delete();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Dislike removed',
                    'data' => [
                        'disliked' => false,
                        'likes_count' => $post->getLikesCount(),
                        'dislikes_count' => $post->getDislikesCount(),
                    ],
                ]);
            }

            // Remove like if exists
            ShopPostLike::where('post_id', $postId)
                ->where('user_id', $user->ID)
                ->delete();

            // Add dislike
            ShopPostDislike::create([
                'post_id' => $postId,
                'user_id' => $user->ID,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Post disliked',
                'data' => [
                    'disliked' => true,
                    'likes_count' => $post->getLikesCount(),
                    'dislikes_count' => $post->getDislikesCount(),
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to dislike post',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Share a shop post
     */
    public function share(Request $request, int $postId): JsonResponse
    {
        $user = auth()->user();

        $post = ShopPost::find($postId);

        if (!$post) {
            return response()->json([
                'success' => false,
                'message' => 'Post not found',
            ], 404);
        }

        $platform = $request->input('platform', 'copy_link');

        // Record share (even for non-authenticated users we can track)
        if ($user) {
            ShopPostShare::create([
                'post_id' => $postId,
                'user_id' => $user->ID,
                'platform' => $platform,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Share recorded',
            'data' => [
                'shares_count' => $post->getSharesCount(),
            ],
        ]);
    }

    /**
     * Get comments for a shop post
     */
    public function getComments(Request $request, int $postId): JsonResponse
    {
        $post = ShopPost::find($postId);

        if (!$post) {
            return response()->json([
                'success' => false,
                'message' => 'Post not found',
            ], 404);
        }

        $perPage = $request->input('per_page', 10);

        $comments = ShopPostComment::with(['user', 'replies.user'])
            ->where('post_id', $postId)
            ->approved()
            ->topLevel()
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $comments->items(),
            'meta' => [
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
                'per_page' => $comments->perPage(),
                'total' => $comments->total(),
            ],
        ]);
    }

    /**
     * Add a comment to a shop post
     */
    public function addComment(Request $request, int $postId): JsonResponse
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required',
            ], 401);
        }

        $post = ShopPost::find($postId);

        if (!$post) {
            return response()->json([
                'success' => false,
                'message' => 'Post not found',
            ], 404);
        }

        $validated = $request->validate([
            'content' => 'required|string|max:2000',
            'parent_id' => 'nullable|integer|exists:shop_post_comments,id',
        ]);

        $comment = ShopPostComment::create([
            'post_id' => $postId,
            'user_id' => $user->ID,
            'parent_id' => $validated['parent_id'] ?? null,
            'content' => $validated['content'],
            'status' => 'approved', // Auto-approve, can be changed to 'pending' for moderation
        ]);

        $comment->load('user');

        // Create notification for shop post comment
        $notify = Notify::create([
            'userid' => $user->ID,
            'ownid' => $post->user_id,
            'type' => 'comment',
            'posttype' => 'shoppost',
            'postid' => $postId,
            'content' => $validated['content'],
            'status' => 0,
        ]);

        // Emit notification via Socket.IO to shop owner (ownid)
        \App\Http\Controllers\Api\NotifyController::emitNotification($post->user_id, [
            'id' => $notify->id,
            'userid' => $user->ID,
            'ownid' => $post->user_id,
            'type' => 'comment',
            'posttype' => 'shoppost',
            'postid' => $postId,
            'content' => $validated['content'],
            'status' => 0,
            'created_at' => $notify->created_at->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Comment added',
            'data' => $comment,
        ], 201);
    }

    /**
     * Delete a comment
     */
    public function deleteComment(int $postId, int $commentId): JsonResponse
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required',
            ], 401);
        }

        $comment = ShopPostComment::where('id', $commentId)
            ->where('post_id', $postId)
            ->first();

        if (!$comment) {
            return response()->json([
                'success' => false,
                'message' => 'Comment not found',
            ], 404);
        }

        // Check if user owns the comment
        if ($comment->user_id !== $user->ID) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to delete this comment',
            ], 403);
        }

        $comment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Comment deleted',
        ]);
    }
}
