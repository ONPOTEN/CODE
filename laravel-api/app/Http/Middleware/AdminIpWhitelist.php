<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin IP Whitelist Middleware
 *
 * Restricts admin routes to specific IP addresses for additional security.
 * Even with valid credentials, admin access is only allowed from whitelisted IPs.
 */
class AdminIpWhitelist
{
    /**
     * Whitelisted IP addresses for admin access
     *
     * IMPORTANT: Update this list with your admin IP addresses
     * Use CIDR notation for ranges: '192.168.1.0/24'
     */
    private const WHITELISTED_IPS = [
        // Add your admin IP addresses here
        // '127.0.0.1',           // Localhost
        // '::1',                 // IPv6 localhost
        // '192.168.1.0/24',      // Local network range
        // '203.0.113.42',        // Your office IP
    ];

    /**
     * Whether to enable IP whitelist (set to false to disable in development)
     */
    private const ENABLED = true;

    /**
     * Handle an incoming request
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip check if disabled (for development)
        if (!self::ENABLED) {
            return $next($request);
        }

        // Skip check if no IPs are configured (fail open)
        if (empty(self::WHITELISTED_IPS)) {
            Log::warning('[Admin Security] IP whitelist is empty but enabled. Configure whitelist or disable.');
            return $next($request);
        }

        $clientIp = $request->ip();

        // Check if IP is whitelisted
        if (!$this->isIpWhitelisted($clientIp)) {
            Log::warning('[Admin Security] Blocked admin access from non-whitelisted IP', [
                'ip' => $clientIp,
                'path' => $request->path(),
                'user' => $request->user()?->user_login ?? 'guest',
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'error' => 'Access Denied',
                'message' => 'Admin access is restricted to authorized IP addresses only.',
            ], 403);
        }

        return $next($request);
    }

    /**
     * Check if IP address is in whitelist
     */
    private function isIpWhitelisted(string $ip): bool
    {
        foreach (self::WHITELISTED_IPS as $whitelistedIp) {
            // Check for CIDR range
            if (str_contains($whitelistedIp, '/')) {
                if ($this->ipInRange($ip, $whitelistedIp)) {
                    return true;
                }
            } else {
                // Direct IP match
                if ($ip === $whitelistedIp) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if IP is within CIDR range
     */
    private function ipInRange(string $ip, string $range): bool
    {
        [$subnet, $mask] = explode('/', $range);

        // IPv6
        if (str_contains($ip, ':')) {
            return $this->ipv6InRange($ip, $subnet, (int)$mask);
        }

        // IPv4
        $ip_long = ip2long($ip);
        $subnet_long = ip2long($subnet);

        if ($ip_long === false || $subnet_long === false) {
            return false;
        }

        $mask_long = -1 << (32 - (int)$mask);
        $ip_net = $ip_long & $mask_long;
        $subnet_net = $subnet_long & $mask_long;

        return $ip_net === $subnet_net;
    }

    /**
     * Check if IPv6 is in range
     */
    private function ipv6InRange(string $ip, string $subnet, int $mask): bool
    {
        $ip_bin = @inet_pton($ip);
        $subnet_bin = @inet_pton($subnet);

        if ($ip_bin === false || $subnet_bin === false) {
            return false;
        }

        $bits = $mask;
        for ($i = 0; $i < strlen($ip_bin); $i++) {
            $mask_byte = ($bits >= 8) ? 0xFF : (0xFF << (8 - $bits));
            if ((ord($ip_bin[$i]) & $mask_byte) !== (ord($subnet_bin[$i]) & $mask_byte)) {
                return false;
            }
            $bits -= 8;
            if ($bits <= 0) {
                break;
            }
        }

        return true;
    }
}
