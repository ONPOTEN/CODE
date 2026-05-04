<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommentResource;
use App\Models\Notify;
use App\Models\WpComment;
use App\Models\WpPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

class CommentController extends Controller
{
    /**
     * Get all comments for a post
     */
    public function getPostComments(Request $request, $postId): AnonymousResourceCollection
    {
        $perPage = $request->input('per_page', 10000); // Default to very high number to get all comments

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
            'content' => 'nullable|string|max:5000',
            'parent_id' => 'nullable|integer|exists:wp_comments,comment_ID',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
        ]);

        // Require either content or image
        if (empty($validated['content']) && !$request->hasFile('image')) {
            return response()->json([
                'message' => 'Comment must have either content or an image',
            ], 422);
        }

        $user = $request->user();
        $post = WpPost::findOrFail($postId);

        // Check if comments are allowed on this post
        if ($post->comment_status !== 'open') {
            return response()->json([
                'message' => 'Comments are not allowed on this post',
            ], 403);
        }

        // Handle image upload
        $imagePath = null;
        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $filename = 'comment_' . time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $path = $image->storeAs('comments', $filename, 's3');
            $imagePath = Storage::disk('s3')->url($path);
        }

        $comment = WpComment::create([
            'comment_post_ID' => $postId,
            'comment_author' => $user->user_nicename ?? $user->user_login,
            'comment_author_email' => $user->user_email,
            'comment_author_url' => '',
            'comment_author_IP' => $request->ip(),
            'comment_date' => now(),
            'comment_date_gmt' => now(),
            'comment_content' => $validated['content'] ?? '',
            'image' => $imagePath,
            'comment_approved' => 1, // Auto-approve for now
            'comment_agent' => $request->userAgent(),
            'comment_type' => '',
            'comment_parent' => $validated['parent_id'] ?? 0,
            'user_id' => $user->ID,
        ]);

        // Increment post comment count
        $post->increment('comment_count');

        // DEBUG: Log before creating notification
        \Log::info('[COMMENT DEBUG] About to create notification', [
            'timestamp' => now()->toIso8601String(),
            'postId' => $postId,
            'commenterId' => $user->ID,
            'postOwnerId' => $post->post_author,
            'content' => $validated['content'] ?? '',
        ]);

        // Create notification for post comment
        $notify = Notify::create([
            'userid' => $user->ID,
            'ownid' => $post->post_author,
            'type' => 'comment',
            'posttype' => 'post',
            'postid' => $postId,
            'content' => $validated['content'] ?? '',
            'status' => 0,
        ]);

        // DEBUG: Log notification created
        \Log::info('[COMMENT DEBUG] Notification created in DB', [
            'notifyId' => $notify->id,
            'userId' => $user->ID,
            'ownid' => $post->post_author,
        ]);

        // Emit notification via Socket.IO to post author (ownid)
        \App\Http\Controllers\Api\NotifyController::emitNotification($post->post_author, [
            'id' => $notify->id,
            'userid' => $user->ID,
            'ownid' => $post->post_author,
            'type' => 'comment',
            'posttype' => 'post',
            'postid' => $postId,
            'content' => $validated['content'] ?? '',
            'status' => 0,
            'created_at' => $notify->created_at->toIso8601String(),
        ]);

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
