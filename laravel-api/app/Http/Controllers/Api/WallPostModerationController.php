<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WallPostResource;
use App\Models\ShareWall;
use App\Models\WpPost;
use App\Models\GroupPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class WallPostModerationController extends Controller
{
    /**
     * Get all wall posts on current user's wall (for moderation)
     * Includes both WpPost and GroupPost ordered by latest
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = auth()->user();

        $query = ShareWall::with([
            'post' => function ($q) {
                $q->with(['author', 'meta']);
            },
            'groupPost' => function ($q) {
                $q->with(['author']);
            },
            'moderator'
        ])
            ->where('user_id', $user->ID);

        // Filter by status
        if ($request->has('status')) {
            $status = $request->input('status');
            if (in_array($status, ['pending', 'accepted', 'rejected'])) {
                $query->where('status', $status);
            }
        }

        // Filter by post type
        if ($request->has('post_type')) {
            $postType = $request->input('post_type');
            if ($postType === 'wppost') {
                $query->whereNull('post_type');
            } elseif ($postType === 'grouppost') {
                $query->where('post_type', 'grouppost');
            }
        }

        // Order by - default is created_at descending (latest first)
        $orderBy = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');
        $query->orderBy($orderBy, $order);

        $perPage = min($request->input('per_page', 15), 100);
        $wallPosts = $query->paginate($perPage);

        return WallPostResource::collection($wallPosts);
    }

    /**
     * Get pending wall posts count
     */
    public function pendingCount(Request $request): JsonResponse
    {
        $user = auth()->user();

        $count = ShareWall::where('user_id', $user->ID)
            ->where('status', 'pending')
            ->count();

        return response()->json([
            'pending_count' => $count,
        ]);
    }

    /**
     * Accept a wall post
     */
    public function accept(Request $request, $wallPostId): JsonResponse
    {
        $user = auth()->user();

        $wallPost = ShareWall::findOrFail($wallPostId);

        // Check if this wall post belongs to the current user
        if ($wallPost->user_id !== $user->ID) {
            return response()->json([
                'message' => 'You can only manage posts on your own wall',
            ], 403);
        }

        // Check if already moderated
        if ($wallPost->status !== 'pending') {
            return response()->json([
                'message' => 'This post has already been moderated',
            ], 409);
        }

        $wallPost->update([
            'status' => 'accepted',
            'moderated_by' => $user->ID,
            'moderated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Wall post accepted successfully',
            'data' => new WallPostResource($wallPost->load([
                'post' => function ($q) {
                    $q->with(['author', 'meta']);
                },
                'groupPost' => function ($q) {
                    $q->with(['author']);
                },
                'moderator'
            ])),
        ]);
    }

    /**
     * Reject a wall post
     */
    public function reject(Request $request, $wallPostId): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $user = auth()->user();

        $wallPost = ShareWall::findOrFail($wallPostId);

        // Check if this wall post belongs to the current user
        if ($wallPost->user_id !== $user->ID) {
            return response()->json([
                'message' => 'You can only manage posts on your own wall',
            ], 403);
        }

        // Check if already moderated
        if ($wallPost->status !== 'pending') {
            return response()->json([
                'message' => 'This post has already been moderated',
            ], 409);
        }

        $wallPost->update([
            'status' => 'rejected',
            'rejection_reason' => $request->input('reason'),
            'moderated_by' => $user->ID,
            'moderated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Wall post rejected successfully',
            'data' => new WallPostResource($wallPost->load([
                'post' => function ($q) {
                    $q->with(['author', 'meta']);
                },
                'groupPost' => function ($q) {
                    $q->with(['author']);
                },
                'moderator'
            ])),
        ]);
    }

    /**
     * Get wall post details
     */
    public function show(Request $request, $wallPostId): JsonResponse
    {
        $user = auth()->user();

        $wallPost = ShareWall::with([
            'post' => function ($q) {
                $q->with(['author', 'meta']);
            },
            'groupPost' => function ($q) {
                $q->with(['author']);
            },
            'moderator'
        ])->findOrFail($wallPostId);

        // Check if this wall post belongs to the current user
        if ($wallPost->user_id !== $user->ID) {
            return response()->json([
                'message' => 'You can only view posts on your own wall',
            ], 403);
        }

        return response()->json([
            'data' => new WallPostResource($wallPost),
        ]);
    }

    /**
     * Get wall posts statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = auth()->user();

        $stats = [
            'total' => ShareWall::where('user_id', $user->ID)->count(),
            'pending' => ShareWall::where('user_id', $user->ID)->where('status', 'pending')->count(),
            'accepted' => ShareWall::where('user_id', $user->ID)->where('status', 'accepted')->count(),
            'rejected' => ShareWall::where('user_id', $user->ID)->where('status', 'rejected')->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Batch moderation actions
     */
    public function batchAction(Request $request): JsonResponse
    {
        $request->validate([
            'action' => 'required|in:accept,reject',
            'wall_post_ids' => 'required|array',
            'wall_post_ids.*' => 'integer',
            'reason' => 'required_if:action,reject|string|max:500',
        ]);

        $user = auth()->user();
        $action = $request->input('action');
        $wallPostIds = $request->input('wall_post_ids');
        $reason = $request->input('reason');

        // Get all wall posts for the current user
        $wallPosts = ShareWall::whereIn('id', $wallPostIds)
            ->where('user_id', $user->ID)
            ->where('status', 'pending')
            ->get();

        if ($wallPosts->isEmpty()) {
            return response()->json([
                'message' => 'No pending wall posts found for the given IDs',
            ], 404);
        }

        $updated = 0;
        $errors = [];

        foreach ($wallPosts as $wallPost) {
            try {
                if ($action === 'accept') {
                    $wallPost->update([
                        'status' => 'accepted',
                        'moderated_by' => $user->ID,
                        'moderated_at' => now(),
                    ]);
                } else {
                    $wallPost->update([
                        'status' => 'rejected',
                        'rejection_reason' => $reason,
                        'moderated_by' => $user->ID,
                        'moderated_at' => now(),
                    ]);
                }
                $updated++;
            } catch (\Exception $e) {
                $errors[] = [
                    'wall_post_id' => $wallPost->id,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'message' => "$updated wall posts {$action}ed successfully",
            'updated_count' => $updated,
            'errors' => $errors,
        ]);
    }
}
