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
     * Get user by nickname
     */
    public function byNickname(Request $request, $nickname)
    {
        $user = WpUser::where('user_nicename', $nickname)->firstOrFail();

        return response()->json([
            'user_id' => $user->ID,
            'user_login' => $user->user_login,
            'user_email' => $user->user_email,
            'user_nicename' => $user->user_nicename,
            'display_name' => $user->display_name,
        ]);
    }

    /**
     * Get user by phone number (query parameter version - PREFERRED)
     * Uses query parameter instead of URL path to avoid encoding issues with '+'
     * Example: /api/v1/users/by-phone?phone=%2B840867631313
     */
    public function byPhoneQuery(Request $request)
    {
        $phone = $request->query('phone');

        if (!$phone) {
            return response()->json([
                'message' => 'Phone number is required. Use: /api/v1/users/by-phone?phone=+840867631313',
            ], 400);
        }

        \Log::info('[UserController] byPhoneQuery lookup', [
            'phone_from_query' => $phone,
        ]);

        // Use the model's findByPhone helper which handles normalization
        $user = WpUser::findByPhone($phone);

        if (!$user) {
            \Log::warning('[UserController] User not found by phone', [
                'phone' => $phone,
            ]);

            return response()->json([
                'message' => 'User not found with phone: ' . $phone,
            ], 404);
        }

        \Log::info('[UserController] User found by phone', [
            'phone' => $phone,
            'user_id' => $user->ID,
        ]);

        return response()->json([
            'user_id' => $user->ID,
            'user_login' => $user->user_login,
            'user_email' => $user->user_email,
            'user_nicename' => $user->user_nicename,
            'display_name' => $user->display_name,
            'phone' => $user->phone,
            'firebase_uid' => $user->firebase_uid, // Required for phone+password login
        ]);
    }

    /**
     * Get user by phone number (path parameter version - LEGACY)
     * Kept for backward compatibility but not recommended for '+' in phone numbers
     * Example: /api/v1/users/by-phone/840867631313
     */
    public function byPhone(Request $request, $phone)
    {
        // Phone number comes URL-encoded from the route parameter
        // Laravel automatically decodes %2B to +
        // Use the model's findByPhone helper which handles normalization

        \Log::info('[UserController] byPhone (legacy) lookup', [
            'phone_from_path' => $phone,
        ]);

        $user = WpUser::findByPhone($phone);

        if (!$user) {
            \Log::warning('[UserController] User not found by phone (legacy)', [
                'phone' => $phone,
            ]);

            return response()->json([
                'message' => 'User not found with phone: ' . $phone,
            ], 404);
        }

        return response()->json([
            'user_id' => $user->ID,
            'user_login' => $user->user_login,
            'user_email' => $user->user_email,
            'user_nicename' => $user->user_nicename,
            'display_name' => $user->display_name,
            'phone' => $user->phone,
            'firebase_uid' => $user->firebase_uid, // Required for phone+password login
        ]);
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

        // Check if phone is being submitted - reject if it is
        if ($request->has('phone')) {
            return response()->json([
                'message' => 'Phone number cannot be changed',
                'error' => 'Phone number is locked for security. Contact support to change your phone number.',
            ], 422);
        }

        $validated = $request->validate([
            'user_login' => 'sometimes|string|max:60|unique:wp_users,user_login,' . $user->ID . ',ID|regex:/^[a-zA-Z0-9_-]+$/',
            'display_name' => 'sometimes|string|max:250',
            'user_email' => 'sometimes|email|unique:wp_users,user_email,' . $user->ID . ',ID',
            'hobby' => 'sometimes|nullable|string|max:255',
            'company' => 'sometimes|nullable|string|max:255',
            'location' => 'sometimes|nullable|string|max:255',
            // REMOVED: 'role' - Users cannot change their own role
            'profile_visibility' => 'sometimes|nullable|string|in:public,private',
            // REMOVED: 'phone' - Users cannot change their phone number
            'email_public' => 'sometimes|boolean',
            'hobby_public' => 'sometimes|boolean',
            'company_public' => 'sometimes|boolean',
            'location_public' => 'sometimes|boolean',
            'phone_public' => 'sometimes|boolean',
        ]);

        // Handle username change (user_login)
        if (isset($validated['user_login'])) {
            $oldUsername = $user->user_login;
            $user->user_login = $validated['user_login'];

            // Also update user_nicename for consistency (WordPress convention)
            $user->user_nicename = $validated['user_login'];

            \Log::info('[UserController::updateProfile] Username changed', [
                'user_id' => $user->ID,
                'old_username' => $oldUsername,
                'new_username' => $validated['user_login'],
            ]);
        }

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

        // REMOVED: Phone update logic - Phone number is locked for security

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

        \Log::info('[UserController::updateProfile] Profile updated successfully', [
            'user_id' => $user->ID,
            'username' => $user->user_login,
            'fields_updated' => array_keys($validated),
        ]);

        return new UserResource($user);
    }

    /**
     * Upload user avatar
     */
    public function uploadAvatar(Request $request)
    {
        try {
            $user = $request->user();

            // Debug: Log the request details
            \Log::info('Avatar upload request', [
                'has_file_avatar' => $request->hasFile('avatar'),
                'all_files' => array_keys($request->allFiles()),
                'content_type' => $request->header('Content-Type'),
                'content_length' => $request->header('Content-Length'),
            ]);

            // Check if file exists before validation
            if (!$request->hasFile('avatar')) {
                \Log::error('Avatar file not found in request');
                return response()->json([
                    'message' => 'The avatar field is required.',
                    'errors' => ['avatar' => ['The avatar field is required.']],
                ], 422);
            }

            // Validate the file
            $validated = $request->validate([
                'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048', // Max 2MB
            ]);

            $file = $request->file('avatar');

            // Delete old avatar if exists
            if ($user->avatar) {
                // Extract filename from either full URL or just filename
                $oldFilename = $user->avatar;
                if (strpos($oldFilename, 'http') === 0) {
                    // If it's a full URL, extract just the filename
                    $oldFilename = basename($oldFilename);
                }
                \Storage::disk('s3')->delete('avatars/' . $oldFilename);
            }

            // Store file using Laravel Storage (handles directory creation)
            $filename = $user->ID . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('avatars', $filename, 's3');

            if (!$path) {
                \Log::error('Failed to store avatar file');
                return response()->json([
                    'message' => 'Failed to save avatar file',
                ], 500);
            }

            // Get the full S3 URL
            $avatarUrl = \Storage::disk('s3')->url('avatars/' . $filename);

            // Update user avatar with full S3 URL
            $user->avatar = $avatarUrl;
            $user->save();

            \Log::info('Avatar uploaded successfully', ['user_id' => $user->ID, 'filename' => $filename, 'avatar_url' => $avatarUrl]);

            // Return complete user data with avatar_url
            return response()->json([
                'message' => 'Avatar uploaded successfully',
                'user' => new \App\Http\Resources\UserResource($user),
                'avatar' => $filename,
                'avatar_url' => $avatarUrl,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Avatar validation error', ['errors' => $e->errors()]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Avatar upload error: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json([
                'message' => 'Avatar upload failed: ' . $e->getMessage(),
            ], 500);
        }
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

    /**
     * Reset password via SMS verification (forgot password flow)
     * Does NOT require current password - SMS verification serves as proof
     */
    public function resetPasswordViaSMS(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'password' => 'required|string|min:6',
            'password_confirmation' => 'required|string|min:6|same:password',
        ]);

        // Update password without verifying current password
        $user->user_pass = password_hash($validated['password'], PASSWORD_BCRYPT);
        $user->save();

        return response()->json([
            'message' => 'Password reset successfully via SMS verification',
            'success' => true,
        ]);
    }
}
