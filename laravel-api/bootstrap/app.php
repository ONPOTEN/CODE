<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Throwable;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust proxies for Cloudflare and local Next.js proxy
        // This allows Laravel to correctly read the original client IP and protocol
        $middleware->trustProxies(
            at: [
                '127.0.0.1',           // Local Next.js proxy
                '::1',                 // IPv6 localhost
                // Cloudflare IPv4 ranges
                '173.245.48.0/20',
                '103.21.244.0/22',
                '103.22.200.0/22',
                '103.31.4.0/22',
                '141.101.64.0/18',
                '108.162.192.0/18',
                '190.93.240.0/20',
                '188.114.96.0/20',
                '197.234.240.0/22',
                '198.41.128.0/17',
                '162.158.0.0/15',
                '104.16.0.0/13',
                '104.24.0.0/14',
                '172.64.0.0/13',
                '131.0.72.0/22',
                // Cloudflare IPv6 ranges
                '2400:cb00::/32',
                '2606:4700::/32',
                '2803:f800::/32',
                '2405:b500::/32',
                '2405:8100::/32',
                '2a06:98c0::/29',
                '2c0f:f248::/32',
            ],
            headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR |
                     \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST |
                     \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT |
                     \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO |
                     \Illuminate\Http\Request::HEADER_X_FORWARDED_AWS_ELB
        );

        $middleware->statefulApi();
        $middleware->api(append: [
            \App\Http\Middleware\EnsureJsonApiResponse::class,
            \App\Http\Middleware\ValidateUrlInput::class,  // SECURITY: Block malicious input
            \App\Http\Middleware\SecureUrlValidator::class, // SECURITY: Enhanced SSRF protection
            \App\Http\Middleware\LogSecurityEvents::class, // SECURITY: Log all requests
        ]);
        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
            'admin.ip' => \App\Http\Middleware\AdminIpWhitelist::class,
            'optional.auth' => \App\Http\Middleware\OptionalAuth::class,
            'throttle.advanced' => \App\Http\Middleware\AdvancedRateLimiting::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Return JSON for API authentication errors
        $exceptions->shouldRenderJsonWhen(function ($request, $e) {
            if ($request->is('api/*')) {
                return true;
            }
            return $request->expectsJson();
        });

        // Handle exceptions
        $exceptions->render(function (Throwable $e, $request) {
            // If this is a route-related error mentioning 'login', return JSON
            if ($e instanceof \Symfony\Component\Routing\Exception\RouteNotFoundException ||
                ($e instanceof \BadMethodCallException && str_contains($e->getMessage(), 'Route'))) {
                if ($request->is('api/*') || $request->expectsJson()) {
                    return response()->json([
                        'message' => 'Unauthenticated',
                        'error' => 'Authentication token required',
                    ], 401);
                }
            }

            // If this is an authentication-related error on API routes, return JSON
            if ($request->is('api/*') || $request->expectsJson()) {
                if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                    return response()->json([
                        'message' => 'Unauthenticated',
                        'error' => 'Authentication failed',
                    ], 401);
                }

                if ($e instanceof \Illuminate\Authorization\AuthorizationException) {
                    return response()->json([
                        'message' => 'Forbidden',
                        'error' => $e->getMessage(),
                    ], 403);
                }

                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    return response()->json([
                        'message' => 'Validation failed',
                        'errors' => $e->errors(),
                    ], 422);
                }

                // Catch any other exception and return JSON for API routes
                if (!($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException)) {
                    // Safely handle error message - some may contain binary data
                    $errorMessage = $e->getMessage();
                    if (!mb_check_encoding($errorMessage, 'UTF-8')) {
                        $errorMessage = 'An error occurred (message contains invalid encoding)';
                    }
                    $errorMessage = mb_convert_encoding($errorMessage, 'UTF-8', 'UTF-8');
                    $errorMessage = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $errorMessage);

                    \Log::error('API Exception', [
                        'exception' => class_basename($e),
                        'message' => $errorMessage ?: 'Unknown error',
                        'path' => $request->path(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                    ]);
                    return response()->json([
                        'message' => 'Server error',
                        'error' => $errorMessage ?: 'An unexpected error occurred',
                    ], 500);
                }
            }
        });
    })->create();
