<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ValidateUrlInput
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check all input for malicious patterns
        $allInput = $request->all();

        foreach ($allInput as $key => $value) {
            if (is_string($value) && $this->containsMaliciousPattern($value)) {
                Log::warning('[Security] Blocked malicious input', [
                    'key' => $key,
                    'value' => substr($value, 0, 100),
                    'ip' => $request->ip(),
                    'url' => $request->fullUrl(),
                    'user_agent' => $request->userAgent(),
                ]);

                return response()->json([
                    'error' => 'Invalid input detected',
                    'message' => 'Your request contains potentially malicious content and has been blocked.'
                ], 400);
            }
        }

        // Check URL parameters separately
        $url = $request->fullUrl();
        if ($this->containsMaliciousPattern($url)) {
            Log::warning('[Security] Blocked malicious URL', [
                'url' => $url,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'error' => 'Invalid request',
                'message' => 'Your request URL contains potentially malicious content.'
            ], 400);
        }

        return $next($request);
    }

    /**
     * Check if input contains malicious patterns
     *
     * @param string $value
     * @return bool
     */
    private function containsMaliciousPattern(string $value): bool
    {
        $patterns = [
            // Command execution patterns
            '/wget\s+http/i',
            '/curl\s+(-O\s+)?http/i',
            '/chmod\s+[0-9]{3,4}/i',
            '/;.*sh/i',
            '/\|.*sh/i',
            '/`.*`/',
            '/\$\(.*\)/',
            '/bash\s+-c/i',
            '/\/bin\/(sh|bash)/i',

            // Shell commands
            '/rm\s+-rf/i',
            '/kill\s+-9/i',
            '/pkill\s+/i',
            '/mkdir.*\/tmp/i',

            // Known attack IPs
            '/176\.117\.107\.158|45\.61\.157\.12/',

            // PHP code execution
            '/eval\s*\(/i',
            '/exec\s*\(/i',
            '/system\s*\(/i',
            '/passthru\s*\(/i',
            '/shell_exec/i',
            '/proc_open/i',
            '/popen/i',

            // Directory traversal
            '/\.\.\//',

            // Null bytes
            '/\x00/',

            // Script tags
            '/<script/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $value)) {
                return true;
            }
        }

        return false;
    }
}
