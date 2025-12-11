<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Advanced Rate Limiting Middleware
 *
 * Implements multi-tier rate limiting to prevent abuse:
 * - Per-IP rate limiting
 * - Per-user rate limiting (for authenticated requests)
 * - Endpoint-specific rate limits
 * - Progressive backoff for repeat offenders
 */
class AdvancedRateLimiting
{
    /**
     * Rate limit configurations (requests per minute)
     */
    private const LIMITS = [
        // Authentication endpoints (lower limits to prevent brute force)
        'auth' => [
            'max_attempts' => 5,
            'decay_minutes' => 1,
        ],
        // File upload endpoints
        'upload' => [
            'max_attempts' => 10,
            'decay_minutes' => 1,
        ],
        // Share image generation (prevent DoS)
        'share_image' => [
            'max_attempts' => 30,
            'decay_minutes' => 1,
        ],
        // General API endpoints
        'general' => [
            'max_attempts' => 100,
            'decay_minutes' => 1,
        ],
        // Debug endpoints (very strict)
        'debug' => [
            'max_attempts' => 2,
            'decay_minutes' => 5,
        ],
    ];

    /**
     * Ban thresholds (violations before temporary ban)
     */
    private const BAN_THRESHOLD = 10; // Number of rate limit hits before ban
    private const BAN_DURATION = 3600; // 1 hour ban in seconds

    /**
     * Handle an incoming request
     */
    public function handle(Request $request, Closure $next, ?string $limitType = 'general'): Response
    {
        // Get the rate limit configuration
        $config = self::LIMITS[$limitType] ?? self::LIMITS['general'];
        $maxAttempts = $config['max_attempts'];
        $decayMinutes = $config['decay_minutes'];

        // Generate unique key for this request
        $key = $this->resolveRequestSignature($request, $limitType);

        // Check if IP is banned
        if ($this->isBanned($key)) {
            Log::warning('[Rate Limit] Banned IP attempted access', [
                'ip' => $request->ip(),
                'path' => $request->path(),
                'limit_type' => $limitType,
            ]);

            return $this->buildRateLimitResponse(
                'You have been temporarily banned due to excessive requests.',
                0,
                $this->getBanTimeRemaining($key)
            );
        }

        // Check rate limit
        $attempts = Cache::get($key, 0);

        if ($attempts >= $maxAttempts) {
            // Increment violation counter
            $this->recordViolation($key);

            Log::warning('[Rate Limit] Limit exceeded', [
                'ip' => $request->ip(),
                'user_id' => $request->user()?->id,
                'path' => $request->path(),
                'limit_type' => $limitType,
                'attempts' => $attempts,
                'max_attempts' => $maxAttempts,
            ]);

            $retryAfter = $this->getRetryAfter($key, $decayMinutes);

            return $this->buildRateLimitResponse(
                'Too many requests. Please slow down.',
                $maxAttempts,
                $retryAfter
            );
        }

        // Increment attempt counter
        $newAttempts = $attempts + 1;
        Cache::put($key, $newAttempts, now()->addMinutes($decayMinutes));

        // Process request
        $response = $next($request);

        // Add rate limit headers
        $response->headers->set('X-RateLimit-Limit', $maxAttempts);
        $response->headers->set('X-RateLimit-Remaining', max(0, $maxAttempts - $newAttempts));
        $response->headers->set('X-RateLimit-Reset', now()->addMinutes($decayMinutes)->timestamp);

        return $response;
    }

    /**
     * Generate a unique signature for the request
     */
    private function resolveRequestSignature(Request $request, string $limitType): string
    {
        $parts = [];

        // Include IP address
        $parts[] = sha1($request->ip());

        // Include user ID if authenticated (per-user limits)
        if ($request->user()) {
            $parts[] = 'user:' . $request->user()->id;
        }

        // Include limit type
        $parts[] = $limitType;

        // For auth endpoints, include the attempted username/email to prevent enumeration
        if ($limitType === 'auth') {
            $identifier = $request->input('email') ?? $request->input('phone') ?? $request->input('username');
            if ($identifier) {
                $parts[] = sha1($identifier);
            }
        }

        return 'rate_limit:' . implode(':', $parts);
    }

    /**
     * Record a rate limit violation
     */
    private function recordViolation(string $key): void
    {
        $violationKey = "{$key}:violations";
        $violations = Cache::get($violationKey, 0) + 1;

        // If violations exceed threshold, ban the IP
        if ($violations >= self::BAN_THRESHOLD) {
            $banKey = "{$key}:banned";
            Cache::put($banKey, true, self::BAN_DURATION);

            Log::error('[Rate Limit] IP banned for excessive violations', [
                'key' => $key,
                'violations' => $violations,
                'ban_duration' => self::BAN_DURATION,
            ]);
        } else {
            // Store violation count for 24 hours
            Cache::put($violationKey, $violations, now()->addDay());
        }
    }

    /**
     * Check if request is from a banned source
     */
    private function isBanned(string $key): bool
    {
        $banKey = "{$key}:banned";
        return Cache::has($banKey);
    }

    /**
     * Get remaining ban time in seconds
     */
    private function getBanTimeRemaining(string $key): int
    {
        $banKey = "{$key}:banned";
        $expiresAt = Cache::get($banKey . ':expires', now()->addHour());

        return max(0, $expiresAt->diffInSeconds(now()));
    }

    /**
     * Get retry-after time in seconds
     */
    private function getRetryAfter(string $key, int $decayMinutes): int
    {
        // Check if there's a stored expiry time
        $ttl = Cache::get($key . ':ttl');
        if ($ttl) {
            return max(0, $ttl->diffInSeconds(now()));
        }

        // Default to decay minutes
        return $decayMinutes * 60;
    }

    /**
     * Build rate limit error response
     */
    private function buildRateLimitResponse(string $message, int $limit, int $retryAfter): Response
    {
        return response()->json([
            'error' => 'Rate limit exceeded',
            'message' => $message,
            'retry_after' => $retryAfter,
            'retry_after_human' => $this->formatSeconds($retryAfter),
        ], 429)
            ->header('Retry-After', $retryAfter)
            ->header('X-RateLimit-Limit', $limit)
            ->header('X-RateLimit-Remaining', 0);
    }

    /**
     * Format seconds into human-readable duration
     */
    private function formatSeconds(int $seconds): string
    {
        if ($seconds < 60) {
            return "{$seconds} seconds";
        } elseif ($seconds < 3600) {
            $minutes = round($seconds / 60);
            return "{$minutes} minutes";
        } else {
            $hours = round($seconds / 3600);
            return "{$hours} hours";
        }
    }
}
