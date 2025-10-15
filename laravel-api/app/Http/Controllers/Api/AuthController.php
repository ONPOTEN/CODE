<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WpUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = WpUser::where('user_login', $request->username)
            ->orWhere('user_email', $request->username)
            ->first();

        if (!$user || !$this->verifyWordPressPassword($request->password, $user->user_pass)) {
            throw ValidationException::withMessages([
                'username' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Revoke all existing tokens for this user
        $user->tokens()->delete();

        // Create a new token
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => $user->ID,
                'username' => $user->user_login,
                'email' => $user->user_email,
                'display_name' => $user->display_name,
                'hobby' => $user->hobby,
                'company' => $user->company,
                'location' => $user->location,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'profile_visibility' => $user->profile_visibility,
                'phone' => $user->phone,
                'email_public' => $user->email_public,
                'hobby_public' => $user->hobby_public,
                'company_public' => $user->company_public,
                'location_public' => $user->location_public,
                'phone_public' => $user->phone_public,
            ],
            'token' => $token,
            'message' => 'Login successful',
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|max:60|unique:wp_users,user_login',
            'email' => 'required|email|max:100|unique:wp_users,user_email',
            'password' => 'required|string|min:8|confirmed',
            'display_name' => 'nullable|string|max:250',
            'hobby' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'role' => 'nullable|string|in:user,admin,moderator,editor',
        ]);

        // Create new user
        $user = WpUser::create([
            'user_login' => $validated['username'],
            'user_pass' => Hash::make($validated['password']),
            'user_nicename' => $validated['username'],
            'user_email' => $validated['email'],
            'user_registered' => now(),
            'user_status' => 0,
            'display_name' => $validated['display_name'] ?? $validated['username'],
            'hobby' => $validated['hobby'] ?? null,
            'company' => $validated['company'] ?? null,
            'location' => $validated['location'] ?? null,
            'role' => $validated['role'] ?? 'user',
        ]);

        // Create token
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => $user->ID,
                'username' => $user->user_login,
                'email' => $user->user_email,
                'display_name' => $user->display_name,
                'hobby' => $user->hobby,
                'company' => $user->company,
                'location' => $user->location,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'profile_visibility' => $user->profile_visibility,
                'phone' => $user->phone,
                'email_public' => $user->email_public,
                'hobby_public' => $user->hobby_public,
                'company_public' => $user->company_public,
                'location_public' => $user->location_public,
                'phone_public' => $user->phone_public,
            ],
            'token' => $token,
            'message' => 'Registration successful',
        ], 201);
    }

    public function logout(Request $request): JsonResponse
    {
        // Revoke current user's token
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Verify WordPress password hash
     */
    protected function verifyWordPressPassword(string $password, string $hash): bool
    {
        // WordPress uses phpass for password hashing
        // For production, you'd need to include WordPress password hashing library
        // or use a package like "hautelook/phpass"

        // Simple check for development (not secure for production)
        if (Hash::check($password, $hash)) {
            return true;
        }

        // For WordPress compatibility, install: composer require hautelook/phpass
        // Then use: $hasher = new PasswordHash(8, true);
        // return $hasher->CheckPassword($password, $hash);

        return false;
    }
}
