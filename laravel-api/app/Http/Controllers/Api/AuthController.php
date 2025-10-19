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

        // Search by username, email, or phone
        $user = WpUser::where('user_login', $request->username)
            ->orWhere('user_email', $request->username)
            ->orWhere('phone', $request->username)
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
            'phone' => 'nullable|string|max:20|unique:wp_users,phone',
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
            'phone' => $validated['phone'] ?? null,
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
     * Debug endpoint to see all users and test login queries
     */
    public function debugUsersWithPhone(): JsonResponse
    {
        $allUsers = WpUser::select('ID', 'user_login', 'user_email', 'phone', 'display_name')->get();
        $usersWithPhone = WpUser::whereNotNull('phone')
            ->select('ID', 'user_login', 'user_email', 'phone', 'display_name')
            ->get();

        return response()->json([
            'total_users' => $allUsers->count(),
            'users_with_phone' => $usersWithPhone->count(),
            'all_users' => $allUsers,
            'users_with_phone_details' => $usersWithPhone,
            'message' => 'Debug: Check if phone field exists and has data',
        ]);
    }

    /**
     * Debug endpoint to test login query with a specific value
     */
    public function debugLoginQuery(Request $request): JsonResponse
    {
        $input = $request->query('username', '');

        $user = WpUser::where('user_login', $input)
            ->orWhere('user_email', $input)
            ->orWhere('phone', $input)
            ->select('ID', 'user_login', 'user_email', 'phone', 'display_name')
            ->first();

        return response()->json([
            'search_input' => $input,
            'user_found' => $user ? true : false,
            'user_data' => $user,
            'message' => 'Debug: Test login query',
        ]);
    }

    /**
     * Debug endpoint to test Sanctum authentication
     */
    public function debugTestAuth(Request $request): JsonResponse
    {
        $authHeader = $request->header('Authorization');
        $user = $request->user();

        return response()->json([
            'auth_header' => $authHeader ? substr($authHeader, 0, 30) . '...' : 'NOT FOUND',
            'user_authenticated' => $user ? true : false,
            'user_id' => $user?->ID,
            'user_email' => $user?->user_email,
            'all_headers' => collect($request->headers->all())->map(function ($value) {
                return is_array($value) ? $value[0] : $value;
            }),
            'message' => 'Debug: Test if Sanctum authentication is working',
        ]);
    }

    /**
     * Debug endpoint to list all tokens in database
     */
    public function debugTokens(Request $request): JsonResponse
    {
        // Get all tokens with user info
        $tokens = \DB::table('personal_access_tokens')
            ->select('id', 'tokenable_id', 'tokenable_type', 'token', 'created_at')
            ->get()
            ->map(function ($token) {
                return [
                    'id' => $token->id,
                    'user_id' => $token->tokenable_id,
                    'token_hash' => substr($token->token, 0, 20) . '...',
                    'created_at' => $token->created_at,
                ];
            });

        return response()->json([
            'total_tokens' => $tokens->count(),
            'tokens' => $tokens,
            'message' => 'Debug: All tokens in database',
        ]);
    }

    /**
     * Debug endpoint to manually test token validation
     */
    public function debugTestToken(Request $request): JsonResponse
    {
        $plainToken = $request->input('token');
        if (!$plainToken) {
            return response()->json(['error' => 'Token parameter required'], 400);
        }

        // Extract token hash from plain token
        $parts = explode('|', $plainToken);
        if (count($parts) !== 2) {
            return response()->json(['error' => 'Invalid token format'], 400);
        }

        $tokenHash = hash('sha256', $parts[1]);

        // Try to find the token
        $tokenRecord = \DB::table('personal_access_tokens')
            ->where('token', $tokenHash)
            ->first();

        return response()->json([
            'plain_token_sent' => substr($plainToken, 0, 30) . '...',
            'token_hash_generated' => substr($tokenHash, 0, 20) . '...',
            'token_found_in_db' => $tokenRecord ? true : false,
            'token_record' => $tokenRecord ? [
                'id' => $tokenRecord->id,
                'tokenable_id' => $tokenRecord->tokenable_id,
                'user_exists' => \App\Models\WpUser::find($tokenRecord->tokenable_id) ? true : false,
            ] : null,
            'message' => 'Debug: Manual token validation test',
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
