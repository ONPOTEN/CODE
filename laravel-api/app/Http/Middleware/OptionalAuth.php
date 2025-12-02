<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class OptionalAuth
{
    /**
     * Handle an incoming request.
     *
     * This middleware attempts to authenticate the user but doesn't fail if no auth token is provided.
     * If a token is provided and valid, the user will be authenticated.
     * If no token is provided, the request continues without authentication.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  $guard
     * @return mixed
     */
    public function handle(Request $request, Closure $next, string $guard = 'sanctum'): Response
    {
        // Try to authenticate with Sanctum if Authorization header is present
        if ($token = $request->bearerToken()) {
            \Log::info('[OptionalAuth] Bearer token found', ['token_length' => strlen($token)]);

            // Find the token
            $accessToken = PersonalAccessToken::findToken($token);

            if ($accessToken) {
                // Update last used timestamp
                $accessToken->forceFill(['last_used_at' => now()])->save();

                // Set the authenticated user
                $user = $accessToken->tokenable;
                Auth::setUser($user);

                \Log::info('[OptionalAuth] User authenticated', [
                    'user_id' => $user->ID ?? $user->id ?? null,
                    'user_class' => get_class($user),
                ]);
            } else {
                \Log::warning('[OptionalAuth] Token not found in database');
            }
        } else {
            \Log::info('[OptionalAuth] No bearer token in request');
        }

        return $next($request);
    }
}
