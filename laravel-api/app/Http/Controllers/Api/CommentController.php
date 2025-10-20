<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommentResource;
use App\Models\WpComment;
use App\Models\WpPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CommentController extends Controller
{
    /**
     * Get all comments for a post
     */
    public function getPostComments(Request $request, $postId): AnonymousResourceCollection
    {
        $perPage = min($request->input('per_page', 15), 100);

        $comments = WpComment::where('comment_post_ID', $postId)
            ->approved()
            ->with('author')
            ->orderBy('comment_date', 'desc')
            ->paginate($perPage);

        return CommentResource::collection($comments);
    }

    /**
     * Create a new comment on a post
     */
    public function storeComment(Request $request, $postId): JsonResponse
    {
        $validated = $request->validate([
            'content' => 'required|string|min:1|max:5000',
            'parent_id' => 'nullable|integer|exists:wp_comments,comment_ID',
        ]);

        $user = $request->user();
        $post = WpPost::findOrFail($postId);

        // Check if comments are allowed on this post
        if ($post->comment_status !== 'open') {
            return response()->json([
                'message' => 'Comments are not allowed on this post',
            ], 403);
        }

        $comment = WpComment::create([
            'comment_post_ID' => $postId,
            'comment_author' => $user->user_nicename ?? $user->user_login,
            'comment_author_email' => $user->user_email,
            'comment_author_url' => '',
            'comment_author_IP' => $request->ip(),
            'comment_date' => now(),
            'comment_date_gmt' => now(),
            'comment_content' => $validated['content'],
            'comment_approved' => 1, // Auto-approve for now
            'comment_agent' => $request->userAgent(),
            'comment_type' => '',
            'comment_parent' => $validated['parent_id'] ?? 0,
            'user_id' => $user->ID,
        ]);

        // Increment post comment count
        $post->increment('comment_count');

        return response()->json([
            'message' => 'Comment created successfully',
            'comment' => new CommentResource($comment->load('author')),
        ], 201);
    }

    /**
     * Update a comment
     */
    public function updateComment(Request $request, $commentId): JsonResponse
    {
        $comment = WpComment::findOrFail($commentId);
        $user = $request->user();

        // Check if user owns the comment or is admin
        if ($comment->user_id !== $user->ID && !$user->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. You can only edit your own comments.',
            ], 403);
        }

        $validated = $request->validate([
            'content' => 'required|string|min:1|max:5000',
        ]);

        $comment->update([
            'comment_content' => $validated['content'],
        ]);

        return response()->json([
            'message' => 'Comment updated successfully',
            'comment' => new CommentResource($comment->load('author')),
        ]);
    }

    /**
     * Delete a comment
     */
    public function deleteComment(Request $request, $commentId): JsonResponse
    {
        $comment = WpComment::findOrFail($commentId);
        $user = $request->user();

        // Check if user owns the comment or is admin
        if ($comment->user_id !== $user->ID && !$user->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. You can only delete your own comments.',
            ], 403);
        }

        $postId = $comment->comment_post_ID;
        $comment->delete();

        // Decrement post comment count
        WpPost::findOrFail($postId)->decrement('comment_count');

        return response()->json([
            'message' => 'Comment deleted successfully',
        ]);
    }

    /**
     * Approve a comment (Admin only)
     */
    public function approveComment(Request $request, $commentId): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. Only admins can approve comments.',
            ], 403);
        }

        $comment = WpComment::findOrFail($commentId);
        $comment->update(['comment_approved' => 1]);

        return response()->json([
            'message' => 'Comment approved successfully',
            'comment' => new CommentResource($comment->load('author')),
        ]);
    }

    /**
     * Reject a comment (Admin only)
     */
    public function rejectComment(Request $request, $commentId): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. Only admins can reject comments.',
            ], 403);
        }

        $comment = WpComment::findOrFail($commentId);
        $comment->update(['comment_approved' => 0]);

        return response()->json([
            'message' => 'Comment rejected successfully',
            'comment' => new CommentResource($comment->load('author')),
        ]);
    }
}
