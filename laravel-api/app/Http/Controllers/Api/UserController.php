<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\WpUser;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = WpUser::with(['meta']);

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('user_login', 'like', "%{$search}%")
                  ->orWhere('user_email', 'like', "%{$search}%")
                  ->orWhere('display_name', 'like', "%{$search}%");
            });
        }

        $perPage = min($request->input('per_page', 15), 100);
        $users = $query->paginate($perPage);

        return UserResource::collection($users);
    }

    public function show(Request $request, $id): UserResource
    {
        $user = WpUser::with(['meta', 'posts' => function ($query) {
            $query->published()->orderBy('post_date', 'desc')->limit(10);
        }])->findOrFail($id);

        return new UserResource($user);
    }

    public function byUsername(Request $request, $username): UserResource
    {
        $user = WpUser::with(['meta'])
            ->where('user_login', $username)
            ->firstOrFail();

        return new UserResource($user);
    }

    /**
     * Search users by name for autocomplete
     */
    public function search(Request $request)
    {
        $query = $request->input('q', '');

        if (strlen($query) < 2) {
            return response()->json(['data' => []]);
        }

        $users = WpUser::where('display_name', 'like', "%{$query}%")
            ->orWhere('user_login', 'like', "%{$query}%")
            ->limit(10)
            ->get(['ID', 'user_login', 'display_name', 'user_email']);

        return UserResource::collection($users);
    }

    /**
     * Update authenticated user's profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'display_name' => 'sometimes|string|max:250',
            'user_email' => 'sometimes|email|unique:wp_users,user_email,' . $user->ID . ',ID',
            'hobby' => 'sometimes|nullable|string|max:255',
            'company' => 'sometimes|nullable|string|max:255',
            'location' => 'sometimes|nullable|string|max:255',
            // REMOVED: 'role' - Users cannot change their own role
            'profile_visibility' => 'sometimes|nullable|string|in:public,private',
            'phone' => 'sometimes|nullable|string|max:20',
            'email_public' => 'sometimes|boolean',
            'hobby_public' => 'sometimes|boolean',
            'company_public' => 'sometimes|boolean',
            'location_public' => 'sometimes|boolean',
            'phone_public' => 'sometimes|boolean',
        ]);

        if (isset($validated['display_name'])) {
            $user->display_name = $validated['display_name'];
        }

        if (isset($validated['user_email'])) {
            $user->user_email = $validated['user_email'];
        }

        if (isset($validated['hobby'])) {
            $user->hobby = $validated['hobby'];
        }

        if (isset($validated['company'])) {
            $user->company = $validated['company'];
        }

        if (isset($validated['location'])) {
            $user->location = $validated['location'];
        }

        // REMOVED: Role update logic - Users cannot change their own role

        if (isset($validated['profile_visibility'])) {
            $user->profile_visibility = $validated['profile_visibility'];
        }

        if (isset($validated['phone'])) {
            $user->phone = $validated['phone'];
        }

        if (isset($validated['email_public'])) {
            $user->email_public = $validated['email_public'];
        }

        if (isset($validated['hobby_public'])) {
            $user->hobby_public = $validated['hobby_public'];
        }

        if (isset($validated['company_public'])) {
            $user->company_public = $validated['company_public'];
        }

        if (isset($validated['location_public'])) {
            $user->location_public = $validated['location_public'];
        }

        if (isset($validated['phone_public'])) {
            $user->phone_public = $validated['phone_public'];
        }

        $user->save();

        return new UserResource($user);
    }

    /**
     * Upload user avatar
     */
    public function uploadAvatar(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048', // Max 2MB
        ]);

        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');

            // Delete old avatar if exists
            if ($user->avatar && file_exists(public_path('storage/avatars/' . $user->avatar))) {
                unlink(public_path('storage/avatars/' . $user->avatar));
            }

            // Create avatars directory if it doesn't exist
            if (!file_exists(public_path('storage/avatars'))) {
                mkdir(public_path('storage/avatars'), 0755, true);
            }

            // Generate unique filename
            $filename = $user->ID . '_' . time() . '.' . $file->getClientOriginalExtension();

            // Move file to storage/avatars
            $file->move(public_path('storage/avatars'), $filename);

            // Update user avatar
            $user->avatar = $filename;
            $user->save();

            return response()->json([
                'message' => 'Avatar uploaded successfully',
                'avatar' => $filename,
                'avatar_url' => url('storage/avatars/' . $filename),
            ]);
        }

        return response()->json([
            'message' => 'No file uploaded',
        ], 400);
    }

    /**
     * Update authenticated user's password
     */
    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        // Verify current password
        if (!password_verify($validated['current_password'], $user->user_pass)) {
            return response()->json([
                'message' => 'Current password is incorrect',
                'errors' => [
                    'current_password' => ['The current password is incorrect']
                ]
            ], 422);
        }

        // Update password
        $user->user_pass = password_hash($validated['new_password'], PASSWORD_BCRYPT);
        $user->save();

        return response()->json([
            'message' => 'Password updated successfully'
        ]);
    }

    /**
     * ADMIN ONLY: Update user role
     * Only accessible by admin users through admin middleware
     */
    public function updateUserRole(Request $request, $userId)
    {
        // Validate the role
        $validated = $request->validate([
            'role' => 'required|string|in:user,admin,moderator,editor',
        ]);

        // Find the target user
        $targetUser = WpUser::findOrFail($userId);

        // Prevent admin from demoting themselves
        if ($request->user()->ID === $targetUser->ID) {
            return response()->json([
                'message' => 'You cannot change your own role',
                'errors' => [
                    'role' => ['You cannot change your own role']
                ]
            ], 403);
        }

        // Update the role
        $oldRole = $targetUser->role;
        $targetUser->role = $validated['role'];
        $targetUser->save();

        return response()->json([
            'message' => 'User role updated successfully',
            'user' => [
                'id' => $targetUser->ID,
                'username' => $targetUser->user_login,
                'email' => $targetUser->user_email,
                'display_name' => $targetUser->display_name,
                'old_role' => $oldRole,
                'new_role' => $targetUser->role,
            ]
        ]);
    }

    /**
     * ADMIN ONLY: Get all users with their roles
     * Only accessible by admin users through admin middleware
     */
    public function getAllUsersWithRoles(Request $request)
    {
        $query = WpUser::query();

        // Filter by role if specified
        if ($request->has('role')) {
            $query->where('role', $request->input('role'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('user_login', 'like', "%{$search}%")
                  ->orWhere('user_email', 'like', "%{$search}%")
                  ->orWhere('display_name', 'like', "%{$search}%");
            });
        }

        // Order by role and username
        $query->orderByRaw("FIELD(role, 'admin', 'moderator', 'editor', 'user')")
              ->orderBy('user_login');

        $perPage = min($request->input('per_page', 15), 100);
        $users = $query->paginate($perPage);

        return response()->json([
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ]
        ]);
    }

    /**
     * ADMIN ONLY: Bulk update user roles
     * Only accessible by admin users through admin middleware
     */
    public function bulkUpdateRoles(Request $request)
    {
        $validated = $request->validate([
            'users' => 'required|array',
            'users.*.user_id' => 'required|integer|exists:wp_users,ID',
            'users.*.role' => 'required|string|in:user,admin,moderator,editor',
        ]);

        $currentUserId = $request->user()->ID;
        $updatedUsers = [];
        $errors = [];

        foreach ($validated['users'] as $userData) {
            // Prevent admin from changing their own role
            if ($userData['user_id'] === $currentUserId) {
                $errors[] = [
                    'user_id' => $userData['user_id'],
                    'message' => 'Cannot change your own role',
                ];
                continue;
            }

            $user = WpUser::find($userData['user_id']);
            if ($user) {
                $oldRole = $user->role;
                $user->role = $userData['role'];
                $user->save();

                $updatedUsers[] = [
                    'user_id' => $user->ID,
                    'username' => $user->user_login,
                    'old_role' => $oldRole,
                    'new_role' => $user->role,
                ];
            }
        }

        return response()->json([
            'message' => count($updatedUsers) . ' user(s) updated successfully',
            'updated_users' => $updatedUsers,
            'errors' => $errors,
        ]);
    }
}
