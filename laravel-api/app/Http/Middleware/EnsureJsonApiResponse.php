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

        $contentType = $response->headers->get('Content-Type', '');

        // Skip processing for binary/image responses
        if (str_contains($contentType, 'image/') ||
            str_contains($contentType, 'application/octet-stream') ||
            str_contains($contentType, 'application/pdf')) {
            return $response;
        }

        // If it's an API route and response is HTML, it's an error
        if ($request->is('api/*') && str_contains($contentType, 'text/html')) {
            // Safely get content preview - avoid binary data
            $content = $response->content();
            $contentPreview = '';
            if (is_string($content) && mb_check_encoding($content, 'UTF-8')) {
                $contentPreview = substr($content, 0, 500);
            } else {
                $contentPreview = '[Binary or non-UTF-8 content]';
            }

            \Log::error('API returned HTML instead of JSON', [
                'path' => $request->path(),
                'method' => $request->method(),
                'status' => $response->status(),
                'content' => $contentPreview,
            ]);

            return response()->json([
                'message' => 'Server error',
                'error' => 'Invalid response from server',
            ], 500);
        }

        return $response;
    }
}
