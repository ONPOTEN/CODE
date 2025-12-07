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
        $middleware->statefulApi();
        $middleware->api(append: [
            \App\Http\Middleware\EnsureJsonApiResponse::class,
        ]);
        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
            'optional.auth' => \App\Http\Middleware\OptionalAuth::class,
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
                    \Log::error('API Exception', [
                        'exception' => class_basename($e),
                        'message' => $e->getMessage(),
                        'path' => $request->path(),
                    ]);
                    return response()->json([
                        'message' => 'Server error',
                        'error' => $e->getMessage(),
                    ], 500);
                }
            }
        });
    })->create();
