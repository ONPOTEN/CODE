<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StaticPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StaticPageController extends Controller
{
    /**
     * Get a static page by slug (public)
     */
    public function show(string $slug): JsonResponse
    {
        $page = StaticPage::findBySlug($slug);

        if (!$page) {
            // Return default content if page doesn't exist in database
            $defaults = StaticPage::getDefaultContent($slug);
            return response()->json([
                'success' => true,
                'data' => [
                    'slug' => $slug,
                    'title' => $defaults['title'],
                    'content' => $defaults['content'],
                    'meta_description' => $defaults['meta_description'],
                    'is_default' => true,
                    'updated_at' => null,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $page->id,
                'slug' => $page->slug,
                'title' => $page->title,
                'content' => $page->content,
                'meta_description' => $page->meta_description,
                'is_default' => false,
                'updated_at' => $page->updated_at,
                'updated_by' => $page->updatedByUser ? [
                    'id' => $page->updatedByUser->ID,
                    'name' => $page->updatedByUser->display_name,
                ] : null,
            ],
        ]);
    }

    /**
     * Update a static page (admin only)
     */
    public function update(Request $request, string $slug): JsonResponse
    {
        // Check if user is admin
        $user = Auth::user();
        if (!$user || !in_array($user->role, ['admin', 'administrator'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'meta_description' => 'nullable|string|max:500',
        ]);

        $page = StaticPage::findBySlug($slug);

        if (!$page) {
            // Create new page if it doesn't exist
            $page = new StaticPage();
            $page->slug = $slug;
        }

        $page->title = $request->input('title');
        $page->content = $request->input('content');
        $page->meta_description = $request->input('meta_description');
        $page->updated_by = $user->ID;
        $page->save();

        return response()->json([
            'success' => true,
            'message' => 'Page updated successfully.',
            'data' => [
                'id' => $page->id,
                'slug' => $page->slug,
                'title' => $page->title,
                'content' => $page->content,
                'meta_description' => $page->meta_description,
                'updated_at' => $page->updated_at,
            ],
        ]);
    }

    /**
     * List all static pages (admin only)
     */
    public function index(): JsonResponse
    {
        // Check if user is admin
        $user = Auth::user();
        if (!$user || !in_array($user->role, ['admin', 'administrator'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $pages = StaticPage::all(['id', 'slug', 'title', 'meta_description', 'updated_at']);

        // Add default pages that don't exist in database
        $defaultSlugs = [
            'dieu-kien',
            'dieu-khoan',
            'chinh-sach-bao-mat',
            'xoa-du-lieu-nguoi-dung',
            'chinh-sach-ban-hang-mua-hang',
            'dieu-khoan-dieu-kien',
        ];
        $existingSlugs = $pages->pluck('slug')->toArray();

        $allPages = $pages->toArray();

        foreach ($defaultSlugs as $slug) {
            if (!in_array($slug, $existingSlugs)) {
                $defaults = StaticPage::getDefaultContent($slug);
                $allPages[] = [
                    'id' => null,
                    'slug' => $slug,
                    'title' => $defaults['title'],
                    'meta_description' => $defaults['meta_description'],
                    'updated_at' => null,
                    'is_default' => true,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $allPages,
        ]);
    }
}
