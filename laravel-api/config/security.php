<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Security Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains security-related configuration options for the
    | application, including SSRF protection, rate limiting, and admin access.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | SSRF Protection
    |--------------------------------------------------------------------------
    |
    | Configure allowed domains and IP ranges for external HTTP requests
    | to prevent Server-Side Request Forgery (SSRF) attacks.
    |
    */

    'ssrf' => [
        'enabled' => env('SECURITY_SSRF_ENABLED', true),

        'allowed_domains' => [
            'centimet2.com',
            'www.centimet2.com',
            'atm288528-s3user.vcos1.cloudstorage.com.vn',
            'i.imgur.com',
            'cdn.shopify.com',
        ],

        'allowed_schemes' => ['http', 'https'],

        'dns_rebinding_protection' => env('SECURITY_DNS_REBINDING_PROTECTION', true),

        'max_redirects' => 3,

        'timeout' => 10, // seconds

        'connect_timeout' => 5, // seconds
    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    |
    | Configure rate limiting thresholds for different endpoint types.
    | Values are in requests per minute unless otherwise specified.
    |
    */

    'rate_limiting' => [
        'enabled' => env('SECURITY_RATE_LIMITING_ENABLED', true),

        // Authentication endpoints (prevent brute force)
        'auth' => [
            'max_attempts' => env('RATE_LIMIT_AUTH', 5),
            'decay_minutes' => 1,
        ],

        // File upload endpoints
        'upload' => [
            'max_attempts' => env('RATE_LIMIT_UPLOAD', 10),
            'decay_minutes' => 1,
        ],

        // Share image generation
        'share_image' => [
            'max_attempts' => env('RATE_LIMIT_SHARE_IMAGE', 30),
            'decay_minutes' => 1,
        ],

        // General API endpoints
        'general' => [
            'max_attempts' => env('RATE_LIMIT_GENERAL', 100),
            'decay_minutes' => 1,
        ],

        // Debug endpoints
        'debug' => [
            'max_attempts' => env('RATE_LIMIT_DEBUG', 2),
            'decay_minutes' => 5,
        ],

        // Ban configuration
        'ban' => [
            'enabled' => env('RATE_LIMIT_BAN_ENABLED', true),
            'threshold' => env('RATE_LIMIT_BAN_THRESHOLD', 10), // violations before ban
            'duration' => env('RATE_LIMIT_BAN_DURATION', 3600), // seconds (1 hour)
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin Access Control
    |--------------------------------------------------------------------------
    |
    | Configure IP whitelist for admin routes. Admin access will only be
    | allowed from these IP addresses, even with valid credentials.
    |
    */

    'admin' => [
        'ip_whitelist_enabled' => env('SECURITY_ADMIN_IP_WHITELIST', false),

        'allowed_ips' => env('SECURITY_ADMIN_IPS', '') !== ''
            ? explode(',', env('SECURITY_ADMIN_IPS'))
            : [
                // Add your admin IP addresses here or in .env
                // Example: '127.0.0.1', '::1', '192.168.1.0/24'
            ],

        // Require 2FA for admin (future enhancement)
        'require_2fa' => env('SECURITY_ADMIN_2FA', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Input Validation
    |--------------------------------------------------------------------------
    |
    | Configure malicious input detection patterns and validation rules.
    |
    */

    'input_validation' => [
        'enabled' => env('SECURITY_INPUT_VALIDATION', true),

        'scan_for_malicious_patterns' => true,

        'blocked_ips' => [
            '176.117.107.158', // Known malicious IP from your incident
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Security Logging
    |--------------------------------------------------------------------------
    |
    | Configure security event logging options.
    |
    */

    'logging' => [
        'enabled' => env('SECURITY_LOGGING', true),

        'log_all_requests' => env('SECURITY_LOG_ALL_REQUESTS', false),

        'log_failed_auth' => true,

        'log_rate_limit_violations' => true,

        'log_ssrf_attempts' => true,

        'log_channel' => env('SECURITY_LOG_CHANNEL', 'security'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Debug Mode Protection
    |--------------------------------------------------------------------------
    |
    | Disable debug endpoints in production automatically.
    |
    */

    'debug' => [
        'disable_in_production' => env('SECURITY_DISABLE_DEBUG_PRODUCTION', true),

        'require_auth' => env('SECURITY_DEBUG_REQUIRE_AUTH', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | SSL/TLS Configuration
    |--------------------------------------------------------------------------
    |
    | Configure SSL certificate verification for external requests.
    |
    */

    'ssl' => [
        'verify_peer' => env('SECURITY_SSL_VERIFY_PEER', true),

        'verify_host' => env('SECURITY_SSL_VERIFY_HOST', true),

        'ca_bundle' => env('SECURITY_SSL_CA_BUNDLE', null),
    ],

];
