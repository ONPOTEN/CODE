<?php

namespace App\Http\Controllers\Api;

use App\Models\GroupComment;
use App\Models\GroupPost;
use App\Http\Controllers\Controller;
use App\Http\Resources\GroupCommentResource;
use App\Http\Requests\StoreGroupCommentRequest;
use App\Http\Requests\UpdateGroupCommentRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupCommentController extends Controller
{
    /**
     * Get comments for a specific group post
     */
    public function index(Request $request, $postId): JsonResponse
    {
        try {
            $perPage = $request->input('per_page', 15);
            $status = $request->input('status', 'approved');
            $sortBy = $request->input('sort_by', 'created_at');
            $order = $request->input('order', 'desc');

            $query = GroupComment::where('post_id', $postId)
                ->whereNull('parent_id') // Get top-level comments only
                ->with('user', 'replies');

            // Filter by status if provided
            if ($status) {
                $query->where('status', $status);
            }

            // Sort results
            $comments = $query->orderBy($sortBy, $order)->paginate($perPage);

            return response()->json([
                'data' => GroupCommentResource::collection($comments->items()),
                'pagination' => [
                    'total' => $comments->total(),
                    'per_page' => $comments->perPage(),
                    'current_page' => $comments->currentPage(),
                    'last_page' => $comments->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to retrieve comments',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Create a new comment on a group post
     */
    public function store(StoreGroupCommentRequest $request, $postId): JsonResponse
    {
        try {
            // Verify post exists
            $post = GroupPost::findOrFail($postId);

            // Create comment
            $comment = GroupComment::create([
                'post_id' => $postId,
                'user_id' => auth()->id(),
                'comment_content' => $request->input('comment_content'),
                'parent_id' => $request->input('parent_id'),
                'status' => 'approved', // Auto-approve authenticated user comments
            ]);

            return response()->json([
                'data' => new GroupCommentResource($comment->load('user', 'replies')),
                'message' => 'Comment created successfully',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create comment',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get a specific comment
     */
    public function show($postId, $commentId): JsonResponse
    {
        try {
            $comment = GroupComment::where('post_id', $postId)
                ->where('id', $commentId)
                ->with('user', 'replies')
                ->firstOrFail();

            return response()->json([
                'data' => new GroupCommentResource($comment),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Comment not found',
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Update a comment
     */
    public function update(UpdateGroupCommentRequest $request, $postId, $commentId): JsonResponse
    {
        try {
            $comment = GroupComment::where('post_id', $postId)
                ->where('id', $commentId)
                ->firstOrFail();

            // Check authorization - only comment author or admin can update
            if ($comment->user_id !== auth()->id() && !auth()->user()->isAdmin()) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to update this comment',
                ], 403);
            }

            // Update comment
            $comment->update([
                'comment_content' => $request->input('comment_content'),
                'status' => 'approved', // Re-approve after update
            ]);

            return response()->json([
                'data' => new GroupCommentResource($comment->load('user', 'replies')),
                'message' => 'Comment updated successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update comment',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Delete a comment
     */
    public function destroy($postId, $commentId): JsonResponse
    {
        try {
            $comment = GroupComment::where('post_id', $postId)
                ->where('id', $commentId)
                ->firstOrFail();

            // Check authorization - only comment author or admin can delete
            if ($comment->user_id !== auth()->id() && !auth()->user()->isAdmin()) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to delete this comment',
                ], 403);
            }

            // Soft delete by marking as trash
            $comment->update(['status' => 'trash']);

            return response()->json([
                'message' => 'Comment deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete comment',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get replies to a specific comment
     */
    public function replies(Request $request, $postId, $commentId): JsonResponse
    {
        try {
            $perPage = $request->input('per_page', 15);

            $replies = GroupComment::where('post_id', $postId)
                ->where('parent_id', $commentId)
                ->where('status', '!=', 'trash')
                ->with('user')
                ->orderBy('created_at', 'asc')
                ->paginate($perPage);

            return response()->json([
                'data' => GroupCommentResource::collection($replies->items()),
                'pagination' => [
                    'total' => $replies->total(),
                    'per_page' => $replies->perPage(),
                    'current_page' => $replies->currentPage(),
                    'last_page' => $replies->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to retrieve replies',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Approve a comment (admin only)
     */
    public function approve($postId, $commentId): JsonResponse
    {
        try {
            // Check authorization - admin only
            if (!auth()->user()->isAdmin()) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'Only admins can approve comments',
                ], 403);
            }

            $comment = GroupComment::where('post_id', $postId)
                ->where('id', $commentId)
                ->firstOrFail();

            $comment->update(['status' => 'approved']);

            return response()->json([
                'data' => new GroupCommentResource($comment->load('user', 'replies')),
                'message' => 'Comment approved successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to approve comment',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Reject/mark as spam a comment (admin only)
     */
    public function reject($postId, $commentId): JsonResponse
    {
        try {
            // Check authorization - admin only
            if (!auth()->user()->isAdmin()) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'Only admins can reject comments',
                ], 403);
            }

            $comment = GroupComment::where('post_id', $postId)
                ->where('id', $commentId)
                ->firstOrFail();

            $comment->update(['status' => 'spam']);

            return response()->json([
                'message' => 'Comment rejected successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to reject comment',
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
