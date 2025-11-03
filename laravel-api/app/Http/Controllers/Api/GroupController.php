<?php

namespace App\Http\Controllers\Api;

use App\Models\Group;
use App\Models\GroupUser;
use App\Http\Controllers\Controller;
use App\Http\Resources\GroupResource;
use App\Http\Requests\StoreGroupRequest;
use App\Http\Requests\UpdateGroupRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    /**
     * Display a listing of all groups
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $status = $request->input('status');
        $visibility = $request->input('visibility');
        $search = $request->input('search');
        $sortBy = $request->input('sort_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = Group::query();

        // Filter by status
        if ($status) {
            $query->where('status', $status);
        }

        // Filter by visibility
        if ($visibility) {
            $query->where('visibility', $visibility);
        }

        // Search by name or description
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('group_name', 'like', "%$search%")
                  ->orWhere('description', 'like', "%$search%");
            });
        }

        // Sort results
        $query->orderBy($sortBy, $order);

        $groups = $query->paginate($perPage);

        return response()->json([
            'data' => GroupResource::collection($groups->items()),
            'pagination' => [
                'total' => $groups->total(),
                'per_page' => $groups->perPage(),
                'current_page' => $groups->currentPage(),
                'last_page' => $groups->lastPage(),
                'from' => $groups->firstItem(),
                'to' => $groups->lastItem(),
            ],
        ]);
    }

    /**
     * Show a single group
     */
    public function show(Group $group): JsonResponse
    {
        $group->load('owner', 'posts', 'members');

        return response()->json([
            'data' => new GroupResource($group),
        ]);
    }

    /**
     * Store a newly created group
     */
    public function store(StoreGroupRequest $request): JsonResponse
    {
        try {
            // Create the group
            $group = Group::create([
                'group_name' => $request->input('group_name'),
                'description' => $request->input('description'),
                'group_owner_id' => auth()->id(),
                'status' => 'active',
                'visibility' => $request->input('visibility', 'public'),
            ]);

            if (!$group) {
                return response()->json([
                    'error' => 'Failed to create group',
                    'message' => 'Could not create group record',
                ], 400);
            }

            // Handle avatar upload
            if ($request->hasFile('avatar')) {
                $avatarPath = $request->file('avatar')->store('group-avatars', 'public');
                $group->update(['avatar' => $avatarPath]);
            }

            // Handle cover image upload
            if ($request->hasFile('cover_image')) {
                $coverPath = $request->file('cover_image')->store('group-covers', 'public');
                $group->update(['cover_image' => $coverPath]);
            }

            // Add group creator as admin member
            $groupUser = GroupUser::create([
                'group_id' => $group->group_id,
                'group_user_id' => auth()->id(),
                'group_role' => GroupUser::ROLE_ADMIN,
                'status' => 'approved',
            ]);

            if (!$groupUser) {
                return response()->json([
                    'error' => 'Failed to create group',
                    'message' => 'Could not add group creator as admin member',
                ], 400);
            }

            $group->load('owner');

            return response()->json([
                'data' => new GroupResource($group),
                'message' => 'Group created successfully',
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Group creation error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Failed to create group',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Update the specified group
     */
    public function update(UpdateGroupRequest $request, Group $group): JsonResponse
    {
        try {
            // Check authorization - only group owner or admin can update
            if ($group->group_owner_id !== auth()->id() && !auth()->user()->isAdmin()) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to update this group',
                ], 403);
            }

            // Update basic fields
            $group->update([
                'group_name' => $request->input('group_name', $group->group_name),
                'description' => $request->input('description', $group->description),
                'visibility' => $request->input('visibility', $group->visibility),
                'status' => $request->input('status', $group->status),
            ]);

            // Handle avatar upload
            if ($request->hasFile('avatar')) {
                $avatarPath = $request->file('avatar')->store('group-avatars', 'public');
                $group->update(['avatar' => $avatarPath]);
            }

            // Handle cover image upload
            if ($request->hasFile('cover_image')) {
                $coverPath = $request->file('cover_image')->store('group-covers', 'public');
                $group->update(['cover_image' => $coverPath]);
            }

            $group->load('owner');

            return response()->json([
                'data' => new GroupResource($group),
                'message' => 'Group updated successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update group',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Delete the specified group
     */
    public function destroy(Group $group): JsonResponse
    {
        try {
            // Check authorization - only group owner or admin can delete
            if ($group->group_owner_id !== auth()->id() && !auth()->user()->isAdmin()) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to delete this group',
                ], 403);
            }

            $group->delete();

            return response()->json([
                'message' => 'Group deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete group',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get groups owned by the current user
     */
    public function myGroups(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $status = $request->input('status');

        $query = Group::where('group_owner_id', auth()->id());

        if ($status) {
            $query->where('status', $status);
        }

        $groups = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => GroupResource::collection($groups->items()),
            'pagination' => [
                'total' => $groups->total(),
                'per_page' => $groups->perPage(),
                'current_page' => $groups->currentPage(),
                'last_page' => $groups->lastPage(),
            ],
        ]);
    }

    /**
     * Get groups by owner user ID
     */
    public function userGroups(Request $request, $userId): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $status = $request->input('status', 'active');

        $query = Group::where('group_owner_id', $userId);

        if ($status) {
            $query->where('status', $status);
        }

        $groups = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => GroupResource::collection($groups->items()),
            'pagination' => [
                'total' => $groups->total(),
                'per_page' => $groups->perPage(),
                'current_page' => $groups->currentPage(),
                'last_page' => $groups->lastPage(),
            ],
        ]);
    }

    /**
     * Get popular groups
     */
    public function popular(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 15);

        $groups = Group::where('status', 'active')
            ->where('visibility', 'public')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => GroupResource::collection($groups->items()),
            'pagination' => [
                'total' => $groups->total(),
                'per_page' => $groups->perPage(),
                'current_page' => $groups->currentPage(),
                'last_page' => $groups->lastPage(),
            ],
        ]);
    }

    /**
     * Bulk delete groups
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        try {
            $groupIds = $request->input('group_ids', []);

            if (empty($groupIds)) {
                return response()->json([
                    'error' => 'No groups selected',
                ], 400);
            }

            // Only allow deletion of own groups or admin
            $query = Group::whereIn('group_id', $groupIds);

            if (!auth()->user()->isAdmin()) {
                $query->where('group_owner_id', auth()->id());
            }

            $deletedCount = $query->delete();

            return response()->json([
                'message' => "Deleted $deletedCount groups successfully",
                'deleted_count' => $deletedCount,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to bulk delete groups',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Check if user is a member of the group
     */
    public function checkMembership(Group $group): JsonResponse
    {
        try {
            $userId = auth()->id();

            $isMember = GroupUser::where('group_id', $group->group_id)
                ->where('group_user_id', $userId)
                ->where('status', 'approved')
                ->exists();

            return response()->json([
                'is_member' => $isMember,
                'group_id' => $group->group_id,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to check membership',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Join a group (creates pending request if group requires approval)
     */
    public function joinGroup(Group $group): JsonResponse
    {
        try {
            $userId = auth()->id();

            // Check if already a member
            $existingMember = GroupUser::where('group_id', $group->group_id)
                ->where('group_user_id', $userId)
                ->first();

            if ($existingMember) {
                if ($existingMember->status === 'approved') {
                    return response()->json([
                        'error' => 'Already a member',
                        'message' => 'You are already a member of this group',
                    ], 400);
                } else if ($existingMember->status === 'pending') {
                    return response()->json([
                        'error' => 'Request pending',
                        'message' => 'Your join request is pending approval',
                    ], 400);
                } else {
                    // Block banned member if trying to rejoin
                    if ($existingMember->status === 'banned') {
                        return response()->json([
                            'error' => 'Access denied',
                            'message' => 'You have been banned from this group',
                        ], 403);
                    }
                    // Reactivate inactive member
                    $existingMember->update(['status' => 'approved']);
                    return response()->json([
                        'message' => 'Successfully joined group',
                        'is_member' => true,
                    ], 200);
                }
            }

            // Create new membership - set as pending if group requires approval, approved otherwise
            $status = $group->requires_approval ? 'pending' : 'approved';

            GroupUser::create([
                'group_id' => $group->group_id,
                'group_user_id' => $userId,
                'group_role' => 'user',
                'status' => $status,
            ]);

            $message = $status === 'pending'
                ? 'Join request submitted. Awaiting approval from group admin.'
                : 'Successfully joined group';

            return response()->json([
                'message' => $message,
                'is_member' => $status === 'approved',
                'status' => $status,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to join group',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Leave a group
     */
    public function leaveGroup(Group $group): JsonResponse
    {
        try {
            $userId = auth()->id();

            // Check if user is a member
            $membership = GroupUser::where('group_id', $group->group_id)
                ->where('group_user_id', $userId)
                ->first();

            if (!$membership) {
                return response()->json([
                    'error' => 'Not a member',
                    'message' => 'You are not a member of this group',
                ], 400);
            }

            // Check if user is the group owner
            if ($group->group_owner_id === $userId) {
                return response()->json([
                    'error' => 'Cannot leave',
                    'message' => 'Group owner cannot leave the group. Delete the group instead.',
                ], 400);
            }

            // Soft delete membership (mark as inactive)
            $membership->update(['status' => 'inactive']);

            return response()->json([
                'message' => 'Successfully left group',
                'is_member' => false,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to leave group',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get pending join requests for a group (admin/moderator only)
     */
    public function getPendingRequests(Group $group): JsonResponse
    {
        try {
            // Check authorization - only group owner, admin, or moderator can view requests
            $currentUser = auth()->user();
            $userRole = GroupUser::where('group_id', $group->group_id)
                ->where('group_user_id', $currentUser->ID)
                ->first();

            if ($group->group_owner_id !== $currentUser->ID && !$currentUser->isAdmin() && (!$userRole || !in_array($userRole->group_role, ['admin', 'moderator']))) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to view join requests',
                ], 403);
            }

            $pendingRequests = GroupUser::where('group_id', $group->group_id)
                ->where('status', 'pending')
                ->with('user')
                ->orderBy('created_at', 'asc')
                ->get();

            return response()->json([
                'data' => $pendingRequests->map(function ($request) {
                    return [
                        'id' => $request->id,
                        'group_id' => $request->group_id,
                        'user_id' => $request->group_user_id,
                        'user' => [
                            'id' => $request->user->ID,
                            'name' => $request->user->display_name,
                            'username' => $request->user->user_login,
                            'avatar' => $request->user->avatar,
                            'email' => $request->user->user_email,
                        ],
                        'requested_at' => $request->created_at,
                    ];
                }),
                'total' => count($pendingRequests),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get pending requests',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Accept a pending join request (admin/moderator only)
     */
    public function acceptJoinRequest(Request $request, Group $group, $userId): JsonResponse
    {
        try {
            // Check authorization
            $currentUser = auth()->user();
            $userRole = GroupUser::where('group_id', $group->group_id)
                ->where('group_user_id', $currentUser->ID)
                ->first();

            if ($group->group_owner_id !== $currentUser->ID && !$currentUser->isAdmin() && (!$userRole || !in_array($userRole->group_role, ['admin', 'moderator']))) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to accept join requests',
                ], 403);
            }

            // Find the pending request
            $membership = GroupUser::where('group_id', $group->group_id)
                ->where('group_user_id', $userId)
                ->where('status', 'pending')
                ->first();

            if (!$membership) {
                return response()->json([
                    'error' => 'Request not found',
                    'message' => 'No pending join request found for this user',
                ], 404);
            }

            // Accept the request - update status to approved
            $membership->update(['status' => 'approved']);

            return response()->json([
                'message' => 'Join request accepted successfully',
                'user_id' => $userId,
                'status' => 'approved',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to accept join request',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Reject a pending join request (admin/moderator only)
     */
    public function rejectJoinRequest(Request $request, Group $group, $userId): JsonResponse
    {
        try {
            // Check authorization
            $currentUser = auth()->user();
            $userRole = GroupUser::where('group_id', $group->group_id)
                ->where('group_user_id', $currentUser->ID)
                ->first();

            if ($group->group_owner_id !== $currentUser->ID && !$currentUser->isAdmin() && (!$userRole || !in_array($userRole->group_role, ['admin', 'moderator']))) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to reject join requests',
                ], 403);
            }

            // Find the pending request
            $membership = GroupUser::where('group_id', $group->group_id)
                ->where('group_user_id', $userId)
                ->where('status', 'pending')
                ->first();

            if (!$membership) {
                return response()->json([
                    'error' => 'Request not found',
                    'message' => 'No pending join request found for this user',
                ], 404);
            }

            // Delete/reject the request
            $membership->delete();

            return response()->json([
                'message' => 'Join request rejected successfully',
                'user_id' => $userId,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to reject join request',
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
