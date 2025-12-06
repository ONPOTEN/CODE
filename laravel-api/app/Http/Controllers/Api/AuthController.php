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

        $username = $request->username;
        $password = $request->password;

        \Log::info('[AuthController::login] Login attempt', [
            'username' => $username,
            'username_length' => strlen($username),
            'password_length' => strlen($password),
            'request_body' => $request->all(),
        ]);

        // Search by username, email, or phone (with flexible phone matching)
        $user = WpUser::where('user_login', $username)
            ->orWhere('user_email', $username)
            ->first();

        // If not found by username/email, try flexible phone matching
        if (!$user) {
            \Log::info('[AuthController::login] Not found by username/email, trying phone lookup', [
                'username' => $username,
            ]);
            $user = WpUser::findByPhone($username);
        }

        \Log::info('[AuthController::login] User lookup result', [
            'username' => $username,
            'user_found' => $user ? true : false,
            'user_id' => $user?->ID,
            'user_login' => $user?->user_login,
            'user_email' => $user?->user_email,
            'user_phone' => $user?->phone,
            'has_password' => $user ? !empty($user->user_pass) : false,
            'password_hash_length' => $user ? strlen($user->user_pass) : 0,
        ]);

        if (!$user) {
            \Log::warning('[AuthController::login] User not found', [
                'username' => $request->username,
            ]);
            throw ValidationException::withMessages([
                'username' => ['The provided credentials are incorrect.'],
            ]);
        }

        $passwordVerified = $this->verifyWordPressPassword($password, $user->user_pass);
        \Log::info('[AuthController::login] Password verification result', [
            'user_id' => $user->ID,
            'verified' => $passwordVerified,
            'stored_hash_length' => strlen($user->user_pass),
            'input_password_length' => strlen($password),
            'stored_hash_preview' => substr($user->user_pass, 0, 30) . '...',
            'password_first_chars' => substr($password, 0, 10),
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
            'phone_number' => 'nullable|string', // Phone number from Firebase phone auth
        ]);

        try {
            // Generate display_name if not provided
            $displayName = $validated['display_name'] ?? $this->generateDisplayName($validated['email']);

            \Log::info('[AuthController::firebaseLogin] Login request', [
                'firebase_uid' => $validated['firebase_uid'],
                'email' => $validated['email'],
                'auth_method' => $validated['auth_method'],
                'phone_number' => $validated['phone_number'] ?? 'not provided',
            ]);

            // Find or create user
            $user = WpUser::firstOrCreate(
                ['firebase_uid' => $validated['firebase_uid']],
                [
                    'user_login' => \Illuminate\Support\Str::slug($displayName) . '_' . \Illuminate\Support\Str::random(5),
                    'user_nicename' => \Illuminate\Support\Str::slug($displayName),
                    'user_email' => $validated['email'],
                    'display_name' => $displayName,
                    'phone' => $validated['phone_number'] ?? null, // Store phone if provided
                    'user_registered' => now(),
                    'user_status' => 0,
                    'role' => 'user',
                    'email_verified_at' => now(), // Firebase users are pre-verified
                    'password' => Hash::make(\Illuminate\Support\Str::random(32)),
                ]
            );

            // Update last login, auth method, and phone number if provided
            $updateData = [
                'last_login_at' => now(),
                'auth_method' => $validated['auth_method'],
            ];

            // Sync phone number from Firebase if provided
            if ($validated['phone_number']) {
                $updateData['phone'] = $validated['phone_number'];
                \Log::info('[AuthController::firebaseLogin] Syncing phone number', [
                    'user_id' => $user->ID,
                    'phone' => $validated['phone_number'],
                ]);
            }

            $user->update($updateData);

            \Log::info('[AuthController::firebaseLogin] User authenticated/created', [
                'user_id' => $user->ID,
                'user_login' => $user->user_login,
                'firebase_uid' => $user->firebase_uid,
                'phone' => $user->phone,
                'is_new' => $user->wasRecentlyCreated,
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
                    'phone' => $user->phone,
                ],
                'token' => $token,
                'message' => 'Firebase login successful',
            ]);
        } catch (\Exception $e) {
            \Log::error('[AuthController::firebaseLogin] Error', [
                'message' => $e->getMessage(),
                'firebase_uid' => $validated['firebase_uid'] ?? 'unknown',
            ]);
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
     * Setup password for phone-only user on first password creation
     * Used during phone SMS login when user creates a password for the first time
     * Similar to resetPasswordByPhone but for initial setup
     */
    public function setupPasswordByPhone(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'new_password' => 'required|string|min:6',
            'firebase_uid' => 'required|string',
            'display_name' => 'nullable|string|min:2|max:255',
        ]);

        \Log::info('[AuthController::setupPasswordByPhone] Password setup request received', [
            'phone' => $validated['phone'],
            'firebase_uid' => $validated['firebase_uid'],
            'password_length' => strlen($validated['new_password']),
            'display_name' => $validated['display_name'] ?? null,
        ]);

        try {
            // Debug: Log request details
            \Log::info('[AuthController::setupPasswordByPhone] DEBUG - Request details', [
                'phone_received' => $validated['phone'],
                'firebase_uid_received' => $validated['firebase_uid'],
                'phone_length' => strlen($validated['phone']),
                'firebase_uid_length' => strlen($validated['firebase_uid']),
            ]);

            // Debug: Check all users with this firebase_uid to help diagnose
            $usersWithFirebaseUid = WpUser::where('firebase_uid', $validated['firebase_uid'])->get(['ID', 'user_login', 'phone', 'firebase_uid']);
            \Log::info('[AuthController::setupPasswordByPhone] DEBUG - Users with matching firebase_uid', [
                'firebase_uid' => $validated['firebase_uid'],
                'count' => $usersWithFirebaseUid->count(),
                'users' => $usersWithFirebaseUid->map(function ($u) {
                    return [
                        'id' => $u->ID,
                        'login' => $u->user_login,
                        'phone' => $u->phone,
                        'phone_length' => strlen($u->phone),
                    ];
                })->toArray(),
            ]);

            // Debug: Check all users with this phone to help diagnose
            $usersWithPhone = WpUser::where('phone', $validated['phone'])->get(['ID', 'user_login', 'phone', 'firebase_uid']);
            \Log::info('[AuthController::setupPasswordByPhone] DEBUG - Users with matching phone', [
                'phone' => $validated['phone'],
                'count' => $usersWithPhone->count(),
                'users' => $usersWithPhone->map(function ($u) {
                    return [
                        'id' => $u->ID,
                        'login' => $u->user_login,
                        'firebase_uid' => $u->firebase_uid,
                    ];
                })->toArray(),
            ]);

            // Find user by phone and firebase_uid
            // First try exact match
            $user = WpUser::where('phone', $validated['phone'])
                ->where('firebase_uid', $validated['firebase_uid'])
                ->first();

            \Log::info('[AuthController::setupPasswordByPhone] Exact match attempt', [
                'phone' => $validated['phone'],
                'firebase_uid' => $validated['firebase_uid'],
                'found' => $user ? true : false,
                'user_id' => $user?->ID,
            ]);

            // If not found, try using flexible phone matching
            if (!$user) {
                \Log::info('[AuthController::setupPasswordByPhone] Exact match failed, trying flexible matching', [
                    'phone' => $validated['phone'],
                    'firebase_uid' => $validated['firebase_uid'],
                ]);

                // Use the model's flexible phone matching
                $flexUser = WpUser::findByPhone($validated['phone']);
                \Log::info('[AuthController::setupPasswordByPhone] Flexible match result', [
                    'found' => $flexUser ? true : false,
                    'user_id' => $flexUser?->ID,
                    'phone' => $flexUser?->phone,
                ]);

                if ($flexUser && $flexUser->firebase_uid === $validated['firebase_uid']) {
                    $user = $flexUser;
                    \Log::info('[AuthController::setupPasswordByPhone] ✅ Found via flexible matching', [
                        'phone_input' => $validated['phone'],
                        'phone_stored' => $user->phone,
                        'user_id' => $user->ID,
                    ]);
                } else {
                    \Log::warning('[AuthController::setupPasswordByPhone] Flexible match failed - firebase_uid mismatch', [
                        'phone_input' => $validated['phone'],
                        'flex_user_firebase_uid' => $flexUser?->firebase_uid,
                        'expected_firebase_uid' => $validated['firebase_uid'],
                    ]);

                    // Try one more fallback: find by firebase_uid only and update phone
                    \Log::info('[AuthController::setupPasswordByPhone] Trying fallback - find by firebase_uid only', [
                        'firebase_uid' => $validated['firebase_uid'],
                    ]);
                    $firebaseOnlyUser = WpUser::where('firebase_uid', $validated['firebase_uid'])->first();
                    if ($firebaseOnlyUser) {
                        $user = $firebaseOnlyUser;
                        \Log::info('[AuthController::setupPasswordByPhone] ✅ Found via firebase_uid only, will update phone', [
                            'user_id' => $user->ID,
                            'old_phone' => $user->phone,
                            'new_phone' => $validated['phone'],
                        ]);
                    }
                }
            }

            if (!$user) {
                // Log all users to help diagnose the issue
                $allUsersWithPhone = WpUser::whereNotNull('phone')->get(['ID', 'phone', 'firebase_uid', 'user_login']);
                \Log::error('[AuthController::setupPasswordByPhone] ❌ User not found', [
                    'phone' => $validated['phone'],
                    'firebase_uid' => $validated['firebase_uid'],
                    'search_methods' => ['exact_match', 'flexible_match'],
                    'all_users_count' => WpUser::count(),
                    'users_with_phone_count' => $allUsersWithPhone->count(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'User not found',
                    'error' => 'No user found with this phone number and firebase UID',
                    'debug' => [
                        'searched_phone' => $validated['phone'],
                        'searched_firebase_uid' => $validated['firebase_uid'],
                        'all_users_with_phone' => $allUsersWithPhone->count(),
                    ],
                ], 404);
            }

            \Log::info('[AuthController::setupPasswordByPhone] User found', [
                'user_id' => $user->ID,
                'user_login' => $user->user_login,
                'phone' => $user->phone,
                'has_password' => !empty($user->user_pass),
            ]);

            // Create new password hash
            $newHash = Hash::make($validated['new_password']);
            \Log::info('[AuthController::setupPasswordByPhone] Generated new hash', [
                'user_id' => $user->ID,
                'new_hash_length' => strlen($newHash),
            ]);

            // Update password and optionally display_name in Laravel database
            $user->user_pass = $newHash;

            // Update phone if not already set (fallback from firebase_uid-only lookup)
            if (empty($user->phone) && !empty($validated['phone'])) {
                $user->phone = $validated['phone'];
                \Log::info('[AuthController::setupPasswordByPhone] Updating phone number', [
                    'user_id' => $user->ID,
                    'phone' => $validated['phone'],
                ]);
            }

            // Update display name if provided
            if (!empty($validated['display_name'])) {
                $user->display_name = $validated['display_name'];
                \Log::info('[AuthController::setupPasswordByPhone] Updating display name', [
                    'user_id' => $user->ID,
                    'new_display_name' => $validated['display_name'],
                ]);
            }

            $user->save();

            // Verify password was saved correctly
            $user->refresh();
            $verifyHash = $user->user_pass;
            $verifyCheck = Hash::check($validated['new_password'], $verifyHash);

            \Log::info('[AuthController::setupPasswordByPhone] Password setup and verified', [
                'user_id' => $user->ID,
                'saved_hash_length' => strlen($verifyHash),
                'hash_matches_new' => ($newHash === $verifyHash) ? true : false,
                'password_verification_check' => $verifyCheck,
                'display_name' => $user->display_name,
            ]);

            // Create new token for the user
            $user->tokens()->delete();
            $token = $user->createToken('api-token')->plainTextToken;

            \Log::info('[AuthController::setupPasswordByPhone] Password setup successful', [
                'user_id' => $user->ID,
                'username' => $user->user_login,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Password setup successfully',
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
            \Log::error('[AuthController::setupPasswordByPhone] Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Password setup failed',
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
     * Facebook OAuth Login
     * Authenticates user via Facebook access token
     */
    public function facebookLogin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'access_token' => 'required|string',
        ]);

        try {
            // Get user info from Facebook Graph API
            $fbGraphUrl = 'https://graph.facebook.com/me?fields=id,name,email,picture&access_token=' . $validated['access_token'];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $fbGraphUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                \Log::error('[AuthController::facebookLogin] Facebook API error', [
                    'http_code' => $httpCode,
                    'response' => $response,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid Facebook access token',
                ], 401);
            }

            $fbUser = json_decode($response, true);

            if (!isset($fbUser['id'])) {
                \Log::error('[AuthController::facebookLogin] Invalid Facebook response', [
                    'response' => $fbUser,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Could not get Facebook user info',
                ], 400);
            }

            \Log::info('[AuthController::facebookLogin] Facebook user info', [
                'fb_id' => $fbUser['id'],
                'name' => $fbUser['name'] ?? 'Unknown',
                'email' => $fbUser['email'] ?? 'not provided',
            ]);

            // Generate email if not provided by Facebook
            $email = $fbUser['email'] ?? 'fb_' . $fbUser['id'] . '@facebook.local';
            $displayName = $fbUser['name'] ?? 'Facebook User';
            $facebookId = $fbUser['id'];

            // Find or create user by facebook_id
            $user = WpUser::where('facebook_id', $facebookId)->first();

            if (!$user) {
                // Try to find by email if provided
                if (isset($fbUser['email'])) {
                    $user = WpUser::where('user_email', $fbUser['email'])->first();
                    if ($user) {
                        // Link Facebook to existing account
                        $user->facebook_id = $facebookId;
                        $user->save();
                        \Log::info('[AuthController::facebookLogin] Linked Facebook to existing account', [
                            'user_id' => $user->ID,
                            'facebook_id' => $facebookId,
                        ]);
                    }
                }
            }

            if (!$user) {
                // Create new user
                $username = 'fb_' . $facebookId;

                // Make sure username is unique
                $counter = 0;
                $baseUsername = $username;
                while (WpUser::where('user_login', $username)->exists()) {
                    $counter++;
                    $username = $baseUsername . '_' . $counter;
                }

                $user = WpUser::create([
                    'user_login' => $username,
                    'user_nicename' => \Illuminate\Support\Str::slug($displayName),
                    'user_email' => $email,
                    'display_name' => $displayName,
                    'facebook_id' => $facebookId,
                    'user_registered' => now(),
                    'user_status' => 0,
                    'role' => 'user',
                    'email_verified_at' => now(),
                    'user_pass' => Hash::make(\Illuminate\Support\Str::random(32)),
                    'auth_method' => 'facebook',
                ]);

                \Log::info('[AuthController::facebookLogin] Created new user from Facebook', [
                    'user_id' => $user->ID,
                    'username' => $username,
                    'facebook_id' => $facebookId,
                ]);
            }

            // Update last login
            $user->update([
                'last_login_at' => now(),
                'auth_method' => 'facebook',
            ]);

            // Revoke old tokens and create new one
            $user->tokens()->delete();
            $token = $user->createToken('facebook-auth')->plainTextToken;

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->ID,
                    'username' => $user->user_login,
                    'email' => $user->user_email,
                    'display_name' => $user->display_name,
                    'role' => $user->role,
                    'avatar' => $user->avatar,
                    'phone' => $user->phone,
                ],
                'token' => $token,
                'message' => 'Facebook login successful',
            ]);
        } catch (\Exception $e) {
            \Log::error('[AuthController::facebookLogin] Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Facebook login failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Google OAuth Login
     * Authenticates user via Google access token
     */
    public function googleLogin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'access_token' => 'required|string',
        ]);

        try {
            // Get user info from Google OAuth2 API
            $googleUserInfoUrl = 'https://www.googleapis.com/oauth2/v3/userinfo?access_token=' . $validated['access_token'];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $googleUserInfoUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                \Log::error('[AuthController::googleLogin] Google API error', [
                    'http_code' => $httpCode,
                    'response' => $response,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid Google access token',
                ], 401);
            }

            $googleUser = json_decode($response, true);

            if (!isset($googleUser['sub'])) {
                \Log::error('[AuthController::googleLogin] Invalid Google response', [
                    'response' => $googleUser,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Could not get Google user info',
                ], 400);
            }

            \Log::info('[AuthController::googleLogin] Google user info', [
                'google_id' => $googleUser['sub'],
                'name' => $googleUser['name'] ?? 'Unknown',
                'email' => $googleUser['email'] ?? 'not provided',
            ]);

            // Get user info from Google response
            $email = $googleUser['email'] ?? 'google_' . $googleUser['sub'] . '@google.local';
            $displayName = $googleUser['name'] ?? 'Google User';
            $googleId = $googleUser['sub'];
            $picture = $googleUser['picture'] ?? null;

            // Find or create user by google_id
            $user = WpUser::where('google_id', $googleId)->first();

            if (!$user) {
                // Try to find by email if provided
                if (isset($googleUser['email'])) {
                    $user = WpUser::where('user_email', $googleUser['email'])->first();
                    if ($user) {
                        // Link Google to existing account
                        $user->google_id = $googleId;
                        $user->save();
                        \Log::info('[AuthController::googleLogin] Linked Google to existing account', [
                            'user_id' => $user->ID,
                            'google_id' => $googleId,
                        ]);
                    }
                }
            }

            if (!$user) {
                // Create new user
                $username = 'google_' . $googleId;

                // Make sure username is unique
                $counter = 0;
                $baseUsername = $username;
                while (WpUser::where('user_login', $username)->exists()) {
                    $counter++;
                    $username = $baseUsername . '_' . $counter;
                }

                $user = WpUser::create([
                    'user_login' => $username,
                    'user_nicename' => \Illuminate\Support\Str::slug($displayName),
                    'user_email' => $email,
                    'display_name' => $displayName,
                    'google_id' => $googleId,
                    'avatar' => $picture,
                    'user_registered' => now(),
                    'user_status' => 0,
                    'role' => 'user',
                    'email_verified_at' => now(),
                    'user_pass' => Hash::make(\Illuminate\Support\Str::random(32)),
                    'auth_method' => 'google',
                ]);

                \Log::info('[AuthController::googleLogin] Created new user from Google', [
                    'user_id' => $user->ID,
                    'username' => $username,
                    'google_id' => $googleId,
                ]);
            }

            // Update last login and avatar if provided
            $updateData = [
                'last_login_at' => now(),
                'auth_method' => 'google',
            ];
            if ($picture && empty($user->avatar)) {
                $updateData['avatar'] = $picture;
            }
            $user->update($updateData);

            // Revoke old tokens and create new one
            $user->tokens()->delete();
            $token = $user->createToken('google-auth')->plainTextToken;

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->ID,
                    'username' => $user->user_login,
                    'email' => $user->user_email,
                    'display_name' => $user->display_name,
                    'role' => $user->role,
                    'avatar' => $user->avatar,
                    'phone' => $user->phone,
                ],
                'token' => $token,
                'message' => 'Google login successful',
            ]);
        } catch (\Exception $e) {
            \Log::error('[AuthController::googleLogin] Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Google login failed: ' . $e->getMessage(),
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
