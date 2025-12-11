<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enhanced SSRF Protection Middleware
 *
 * Protects against Server-Side Request Forgery attacks by validating URLs
 * before they are used in HTTP requests.
 */
class SecureUrlValidator
{
    /**
     * Allowed domains for external requests
     */
    private const ALLOWED_DOMAINS = [
        'centimet2.com',
        'www.centimet2.com',
        'atm288528-s3user.vcos1.cloudstorage.com.vn',
        'i.imgur.com',
        'cdn.shopify.com',
    ];

    /**
     * Private IP ranges (CIDR notation)
     */
    private const PRIVATE_IP_RANGES = [
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        '127.0.0.0/8',
        '169.254.0.0/16',
        '::1/128',
        'fc00::/7',
        'fe80::/10',
    ];

    /**
     * Reserved/special IP ranges
     */
    private const RESERVED_IP_RANGES = [
        '0.0.0.0/8',
        '100.64.0.0/10',
        '192.0.0.0/24',
        '192.0.2.0/24',
        '198.18.0.0/15',
        '198.51.100.0/24',
        '203.0.113.0/24',
        '224.0.0.0/4',
        '240.0.0.0/4',
        '255.255.255.255/32',
    ];

    /**
     * Handle an incoming request
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check for URL parameters in request
        $urlParams = ['url', 'image_url', 'thumbnail_url', 'avatar_url', 'banner_url', 'callback_url'];

        foreach ($urlParams as $param) {
            if ($request->has($param)) {
                $url = $request->input($param);

                if (!$this->isUrlSafe($url)) {
                    Log::warning('[SSRF Protection] Blocked unsafe URL', [
                        'url' => $url,
                        'param' => $param,
                        'ip' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'path' => $request->path(),
                    ]);

                    return response()->json([
                        'error' => 'Invalid URL',
                        'message' => 'The provided URL is not allowed for security reasons.',
                    ], 400);
                }
            }
        }

        return $next($request);
    }

    /**
     * Validate if a URL is safe to use
     *
     * @param string $url
     * @return bool
     */
    public function isUrlSafe(string $url): bool
    {
        // Parse URL
        $parsed = parse_url($url);

        if (!$parsed || !isset($parsed['host']) || !isset($parsed['scheme'])) {
            return false;
        }

        // Only allow http and https
        if (!in_array($parsed['scheme'], ['http', 'https'])) {
            return false;
        }

        $host = strtolower($parsed['host']);

        // Check domain whitelist
        if (!$this->isHostAllowed($host)) {
            return false;
        }

        // Resolve hostname to ALL IPs (prevent DNS rebinding)
        $ips = $this->getAllHostIps($host);

        if (empty($ips)) {
            Log::warning('[SSRF] DNS resolution failed', ['host' => $host]);
            return false;
        }

        // Check all resolved IPs
        foreach ($ips as $ip) {
            if ($this->isIpBlocked($ip)) {
                Log::warning('[SSRF] Blocked private/reserved IP', [
                    'host' => $host,
                    'ip' => $ip,
                ]);
                return false;
            }
        }

        // Additional check: prevent URL with @ (credential injection)
        if (isset($parsed['user']) || isset($parsed['pass'])) {
            return false;
        }

        return true;
    }

    /**
     * Check if host is in allowed domains
     */
    private function isHostAllowed(string $host): bool
    {
        foreach (self::ALLOWED_DOMAINS as $allowed) {
            if ($host === $allowed || str_ends_with($host, '.' . $allowed)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get ALL IP addresses for a hostname (prevent DNS rebinding)
     */
    private function getAllHostIps(string $host): array
    {
        $ips = [];

        // Get IPv4 addresses
        $records = @dns_get_record($host, DNS_A);
        if ($records) {
            foreach ($records as $record) {
                if (isset($record['ip'])) {
                    $ips[] = $record['ip'];
                }
            }
        }

        // Get IPv6 addresses
        $records = @dns_get_record($host, DNS_AAAA);
        if ($records) {
            foreach ($records as $record) {
                if (isset($record['ipv6'])) {
                    $ips[] = $record['ipv6'];
                }
            }
        }

        // Fallback to gethostbyname if DNS lookup fails
        if (empty($ips)) {
            $ip = @gethostbyname($host);
            if ($ip !== $host) {
                $ips[] = $ip;
            }
        }

        return array_unique($ips);
    }

    /**
     * Check if IP is in private/reserved ranges
     */
    private function isIpBlocked(string $ip): bool
    {
        // Validate IP format
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return true; // Block invalid IPs
        }

        // Check private ranges
        foreach (self::PRIVATE_IP_RANGES as $range) {
            if ($this->ipInRange($ip, $range)) {
                return true;
            }
        }

        // Check reserved ranges
        foreach (self::RESERVED_IP_RANGES as $range) {
            if ($this->ipInRange($ip, $range)) {
                return true;
            }
        }

        // Use PHP's built-in filter as additional check
        $filtered = filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );

        return $filtered === false;
    }

    /**
     * Check if IP is in CIDR range
     */
    private function ipInRange(string $ip, string $range): bool
    {
        if (strpos($range, '/') === false) {
            return $ip === $range;
        }

        [$subnet, $mask] = explode('/', $range);

        // IPv6
        if (strpos($ip, ':') !== false) {
            return $this->ipv6InRange($ip, $subnet, (int)$mask);
        }

        // IPv4
        $ip_long = ip2long($ip);
        $subnet_long = ip2long($subnet);
        $mask_long = -1 << (32 - (int)$mask);

        return ($ip_long & $mask_long) === ($subnet_long & $mask_long);
    }

    /**
     * Check if IPv6 is in range
     */
    private function ipv6InRange(string $ip, string $subnet, int $mask): bool
    {
        $ip_bin = inet_pton($ip);
        $subnet_bin = inet_pton($subnet);

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
