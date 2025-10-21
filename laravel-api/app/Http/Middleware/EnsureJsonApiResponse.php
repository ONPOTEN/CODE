<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureJsonApiResponse
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // For API routes, always expect JSON responses
        if ($request->is('api/*')) {
            $request->headers->set('Accept', 'application/json');
        }

        $response = $next($request);

        // If it's an API route and response is HTML, it's an error
        if ($request->is('api/*') && str_contains($response->headers->get('Content-Type', ''), 'text/html')) {
            \Log::error('API returned HTML instead of JSON', [
                'path' => $request->path(),
                'method' => $request->method(),
                'status' => $response->status(),
                'content' => substr((string)$response->content(), 0, 500),
            ]);

            return response()->json([
                'message' => 'Server error',
                'error' => 'Invalid response from server',
            ], 500);
        }

        return $response;
    }
}
