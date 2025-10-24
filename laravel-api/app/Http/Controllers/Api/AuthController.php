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

        \Log::info('[AuthController::login] Login attempt', [
            'username' => $request->username,
            'password_length' => strlen($request->password),
        ]);

        // Search by username, email, or phone
        $user = WpUser::where('user_login', $request->username)
            ->orWhere('user_email', $request->username)
            ->orWhere('phone', $request->username)
            ->first();

        \Log::info('[AuthController::login] User lookup result', [
            'username' => $request->username,
            'user_found' => $user ? true : false,
            'user_id' => $user?->ID,
            'user_login' => $user?->user_login,
        ]);

        if (!$user) {
            \Log::warning('[AuthController::login] User not found', [
                'username' => $request->username,
            ]);
            throw ValidationException::withMessages([
                'username' => ['The provided credentials are incorrect.'],
            ]);
        }

        $passwordVerified = $this->verifyWordPressPassword($request->password, $user->user_pass);
        \Log::info('[AuthController::login] Password verification result', [
            'user_id' => $user->ID,
            'verified' => $passwordVerified,
            'stored_hash_length' => strlen($user->user_pass),
            'input_password_length' => strlen($request->password),
        ]);

        if (!$passwordVerified) {
            \Log::warning('[AuthController::login] Password verification failed', [
                'user_id' => $user->ID,
                'username' => $user->user_login,
            ]);
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
     * Firebase Registration
     * Creates a new user from Firebase authentication
     */
    public function firebaseRegister(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'firebase_uid' => 'required|string|unique:wp_users,firebase_uid',
            'email' => 'required|email|unique:wp_users,user_email',
            'display_name' => 'nullable|string',
            'nickname' => 'required|string|unique:wp_users,user_nicename',
            'username' => 'required|string|unique:wp_users,user_login',
        ]);

        try {
            // Create new Firebase user
            $user = WpUser::create([
                'firebase_uid' => $validated['firebase_uid'],
                'user_login' => $validated['username'],
                'user_nicename' => $validated['nickname'],
                'user_email' => $validated['email'],
                'display_name' => $validated['display_name'],
                'user_registered' => now(),
                'user_status' => 0,
                'role' => 'user',
                'email_verified_at' => now(), // Firebase users are pre-verified
                'password' => Hash::make(\Illuminate\Support\Str::random(32)), // Random password since Firebase handles auth
            ]);

            // Create token
            $token = $user->createToken('firebase-auth')->plainTextToken;

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->ID,
                    'username' => $user->user_login,
                    'email' => $user->user_email,
                    'display_name' => $user->display_name,
                ],
                'token' => $token,
                'message' => 'Firebase registration successful',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Firebase Login
     * Authenticates user via Firebase token and creates/updates user in database
     */
public function firebaseLogin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'firebase_uid' => 'required|string',
            'email' => 'required|email',
            'display_name' => 'nullable|string',
            'auth_method' => 'required|string|in:email,google,facebook,apple,phone',
        ]);

        try {
            // Generate display_name if not provided
            $displayName = $validated['display_name'] ?? $this->generateDisplayName($validated['email']);

            // Find or create user
            $user = WpUser::firstOrCreate(
                ['firebase_uid' => $validated['firebase_uid']],
                [
                    'user_login' => \Illuminate\Support\Str::slug($displayName) . '_' . \Illuminate\Support\Str::random(5),
                    'user_nicename' => \Illuminate\Support\Str::slug($displayName),
                    'user_email' => $validated['email'],
                    'display_name' => $displayName,
                    'user_registered' => now(),
                    'user_status' => 0,
                    'role' => 'user',
                    'email_verified_at' => now(), // Firebase users are pre-verified
                    'password' => Hash::make(\Illuminate\Support\Str::random(32)),
                ]
            );

            // Update last login and auth method
            $user->update([
                'last_login_at' => now(),
                'auth_method' => $validated['auth_method'],
            ]);

            // Revoke old tokens and create new one
            $user->tokens()->delete();
            $token = $user->createToken('firebase-auth')->plainTextToken;

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->ID,
                    'username' => $user->user_login,
                    'email' => $user->user_email,
                    'display_name' => $user->display_name,
                ],
                'token' => $token,
                'message' => 'Firebase login successful',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate display name from email if not provided
     */
    private function generateDisplayName(string $email): string
    {
        // Extract name part from email (before @)
        $namePart = explode('@', $email)[0];
        // Convert underscores and dots to spaces, then capitalize
        return str_replace(['.', '_'], ' ', $namePart);
    }

    /**
     * Reset password via phone number (already verified via SMS/Firebase)
     * Used when user has already verified their phone number
     */
    public function resetPasswordByPhone(Request $request): JsonResponse
    {
        // CRITICAL DEBUG: Write to file immediately to confirm function is called
        file_put_contents(
            storage_path('logs/reset-password-debug.log'),
            "[" . date('Y-m-d H:i:s') . "] resetPasswordByPhone called with data: " . json_encode($request->all()) . "\n",
            FILE_APPEND
        );

        $validated = $request->validate([
            'phone' => 'required|string',
            'new_password' => 'required|string|min:6',
            'firebase_uid' => 'required|string',
        ]);

        file_put_contents(
            storage_path('logs/reset-password-debug.log'),
            "[" . date('Y-m-d H:i:s') . "] Validation passed\n",
            FILE_APPEND
        );

        \Log::info('[AuthController::resetPasswordByPhone] Password reset request received', [
            'phone' => $validated['phone'],
            'firebase_uid' => $validated['firebase_uid'],
            'password_length' => strlen($validated['new_password']),
        ]);

        try {
            // Find user by phone and firebase_uid
            // First try exact match
            $user = WpUser::where('phone', $validated['phone'])
                ->where('firebase_uid', $validated['firebase_uid'])
                ->first();

            // If not found, try using flexible phone matching
            if (!$user) {
                \Log::info('[AuthController::resetPasswordByPhone] Exact match failed, trying flexible matching', [
                    'phone' => $validated['phone'],
                    'firebase_uid' => $validated['firebase_uid'],
                ]);

                // Use the model's flexible phone matching
                $flexUser = WpUser::findByPhone($validated['phone']);
                if ($flexUser && $flexUser->firebase_uid === $validated['firebase_uid']) {
                    $user = $flexUser;
                    \Log::info('[AuthController::resetPasswordByPhone] Found via flexible matching', [
                        'phone_input' => $validated['phone'],
                        'phone_stored' => $user->phone,
                        'user_id' => $user->ID,
                    ]);
                }
            }

            if (!$user) {
                \Log::warning('[AuthController::resetPasswordByPhone] User not found', [
                    'phone' => $validated['phone'],
                    'firebase_uid' => $validated['firebase_uid'],
                ]);
                return response()->json([
                    'message' => 'User not found',
                    'error' => 'No user found with this phone number and firebase UID',
                ], 404);
            }

            \Log::info('[AuthController::resetPasswordByPhone] User found', [
                'user_id' => $user->ID,
                'user_login' => $user->user_login,
                'phone' => $user->phone,
            ]);

            // Create new password hash
            $newHash = Hash::make($validated['new_password']);
            \Log::info('[AuthController::resetPasswordByPhone] Generated new hash', [
                'user_id' => $user->ID,
                'new_hash_length' => strlen($newHash),
            ]);

            // Update password in Laravel database
            $user->user_pass = $newHash;
            $user->save();

            // Verify password was saved correctly
            $user->refresh();
            $verifyHash = $user->user_pass;
            $verifyCheck = Hash::check($validated['new_password'], $verifyHash);

            \Log::info('[AuthController::resetPasswordByPhone] Password updated and verified', [
                'user_id' => $user->ID,
                'saved_hash_length' => strlen($verifyHash),
                'hash_matches_new' => ($newHash === $verifyHash) ? true : false,
                'password_verification_check' => $verifyCheck,
            ]);

            // Create new token for the user
            $user->tokens()->delete();
            $token = $user->createToken('api-token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Password reset successfully',
                'user' => [
                    'id' => $user->ID,
                    'username' => $user->user_login,
                    'email' => $user->user_email,
                    'display_name' => $user->display_name,
                    'phone' => $user->phone,
                ],
                'token' => $token,
            ]);
        } catch (\Exception $e) {
            \Log::error('[AuthController::resetPasswordByPhone] Error', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Password reset failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * TEST endpoint - immediately returns success
     */
    public function testResetEndpoint(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'TEST ENDPOINT CALLED - Reset password endpoint is being reached!',
            'timestamp' => now(),
        ]);
    }

    /**
     * Debug endpoint for password reset - shows the state after a reset
     */
    public function debugPasswordReset(Request $request): JsonResponse
    {
        $phone = $request->query('phone');
        $firebase_uid = $request->query('firebase_uid');
        $test_password = $request->query('test_password');

        if (!$phone || !$firebase_uid || !$test_password) {
            return response()->json([
                'error' => 'Required parameters: phone, firebase_uid, test_password',
            ], 400);
        }

        try {
            $user = WpUser::where('phone', $phone)
                ->where('firebase_uid', $firebase_uid)
                ->first(['ID', 'user_login', 'user_email', 'phone', 'firebase_uid', 'user_pass']);

            if (!$user) {
                return response()->json([
                    'error' => 'User not found',
                    'search_phone' => $phone,
                    'search_firebase_uid' => $firebase_uid,
                ], 404);
            }

            // Test password verification
            $passwordVerifies = Hash::check($test_password, $user->user_pass);

            return response()->json([
                'success' => true,
                'user_id' => $user->ID,
                'user_login' => $user->user_login,
                'user_email' => $user->user_email,
                'phone' => $user->phone,
                'firebase_uid' => $user->firebase_uid,
                'password_hash_length' => strlen($user->user_pass),
                'test_password_length' => strlen($test_password),
                'password_verifies' => $passwordVerifies,
                'hash_preview' => substr($user->user_pass, 0, 50) . '...',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
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
