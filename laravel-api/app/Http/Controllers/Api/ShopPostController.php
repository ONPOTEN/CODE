<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShopPostResource;
use App\Models\Shop;
use App\Models\ShopPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ShopPostController extends Controller
{
    /**
     * Get all posts/pages for a specific shop
     */
    public function index(Request $request, $shopId)
    {
        $query = ShopPost::where('shop_id', $shopId)
            ->with(['shop', 'author']);

        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Filter by status (only show published for non-owners)
        $shop = Shop::findOrFail($shopId);
        $user = $request->user();

        if (!$user || $shop->user_id !== $user->ID) {
            $query->published();
        } elseif ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min($request->input('per_page', 15), 100);
        $posts = $query->latest()->paginate($perPage);

        return ShopPostResource::collection($posts);
    }

    /**
     * Store a new post/page
     */
    public function store(Request $request, $shopId): JsonResponse
    {
        $shop = Shop::findOrFail($shopId);

        // Check if user owns the shop
        if ($shop->user_id !== $request->user()->ID) {
            return response()->json([
                'message' => 'Unauthorized. You can only create posts in your own shop.',
            ], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
            'price_range' => 'nullable|string|max:100',
            'type' => 'required|in:post,page',
            'status' => 'required|in:draft,published',
            'featured_images.*' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120', // 5MB max per image
        ]);

        // Handle multiple featured images upload
        $imagePaths = [];
        if ($request->hasFile('featured_images')) {
            $files = $request->file('featured_images');

            // Create directory structure: shopid/year/month/day
            $now = now();
            $directory = "shop_posts/{$shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}";
            $fullPath = public_path("storage/{$directory}");

            // Create directory if it doesn't exist
            if (!file_exists($fullPath)) {
                mkdir($fullPath, 0755, true);
            }

            foreach ($files as $file) {
                // Generate unique filename
                $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();

                // Move file to the organized directory
                $file->move($fullPath, $filename);

                // Store relative path: shopid/year/month/day/filename
                $imagePaths[] = "{$shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}/{$filename}";

                // Small delay to ensure unique timestamps
                usleep(10000); // 10ms
            }
        }

        // Generate unique slug
        $slug = Str::slug($validated['title']);
        $originalSlug = $slug;
        $counter = 1;

        while (ShopPost::where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        $shopPost = ShopPost::create([
            'shop_id' => $shopId,
            'user_id' => $request->user()->ID,
            'slug' => $slug,
            'title' => $validated['title'],
            'content' => $validated['content'] ?? null,
            'price_range' => $validated['price_range'] ?? null,
            'type' => $validated['type'],
            'status' => $validated['status'],
            'featured_images' => $imagePaths,
        ]);

        return response()->json([
            'message' => ucfirst($validated['type']) . ' created successfully',
            'post' => new ShopPostResource($shopPost->load(['shop', 'author'])),
        ], 201);
    }

    /**
     * Get a single post/page
     */
    public function show($shopId, $id)
    {
        $shopPost = ShopPost::where('shop_id', $shopId)
            ->with(['shop', 'author'])
            ->findOrFail($id);

        // Increment view count
        $shopPost->increment('view_count');

        return new ShopPostResource($shopPost);
    }

    /**
     * Update a post/page
     */
    public function update(Request $request, $shopId, $id): JsonResponse
    {
        $shopPost = ShopPost::where('shop_id', $shopId)->findOrFail($id);

        // Check if user owns the shop
        if ($shopPost->shop->user_id !== $request->user()->ID) {
            return response()->json([
                'message' => 'Unauthorized. You can only edit posts in your own shop.',
            ], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'nullable|string',
            'price_range' => 'nullable|string|max:100',
            'type' => 'sometimes|in:post,page',
            'status' => 'sometimes|in:draft,published',
            'featured_images.*' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120', // 5MB max per image
            'remove_images' => 'sometimes|array', // Array of image paths to remove
            'remove_images.*' => 'string',
        ]);

        // Get current images
        $currentImages = $shopPost->featured_images ?? [];

        // Handle image removal
        if ($request->has('remove_images')) {
            $imagesToRemove = $request->input('remove_images');
            foreach ($imagesToRemove as $imagePath) {
                $fullPath = public_path('storage/shop_posts/' . $imagePath);
                if (file_exists($fullPath)) {
                    unlink($fullPath);
                }
                // Remove from current images array
                $currentImages = array_values(array_filter($currentImages, fn($img) => $img !== $imagePath));
            }
        }

        // Handle new images upload
        if ($request->hasFile('featured_images')) {
            $files = $request->file('featured_images');

            // Create directory structure: shopid/year/month/day
            $now = now();
            $directory = "shop_posts/{$shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}";
            $fullPath = public_path("storage/{$directory}");

            // Create directory if it doesn't exist
            if (!file_exists($fullPath)) {
                mkdir($fullPath, 0755, true);
            }

            foreach ($files as $file) {
                // Generate unique filename
                $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();

                // Move file to the organized directory
                $file->move($fullPath, $filename);

                // Add to current images array
                $currentImages[] = "{$shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}/{$filename}";

                // Small delay to ensure unique timestamps
                usleep(10000); // 10ms
            }
        }

        // Update featured_images
        $shopPost->featured_images = $currentImages;

        // Generate new slug if title changed
        if (isset($validated['title']) && $validated['title'] !== $shopPost->title) {
            $slug = Str::slug($validated['title']);
            $originalSlug = $slug;
            $counter = 1;

            while (ShopPost::where('slug', $slug)->where('id', '!=', $id)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }
            $shopPost->slug = $slug;
        }

        // Update other fields
        if (isset($validated['title'])) $shopPost->title = $validated['title'];
        if (isset($validated['content'])) $shopPost->content = $validated['content'];
        if (isset($validated['price_range'])) $shopPost->price_range = $validated['price_range'];
        if (isset($validated['type'])) $shopPost->type = $validated['type'];
        if (isset($validated['status'])) $shopPost->status = $validated['status'];

        $shopPost->save();

        return response()->json([
            'message' => ucfirst($shopPost->type) . ' updated successfully',
            'post' => new ShopPostResource($shopPost->load(['shop', 'author'])),
        ]);
    }

    /**
     * Delete a post/page
     */
    public function destroy($shopId, $id): JsonResponse
    {
        $shopPost = ShopPost::where('shop_id', $shopId)->findOrFail($id);

        // Check if user owns the shop
        if ($shopPost->shop->user_id !== request()->user()->ID) {
            return response()->json([
                'message' => 'Unauthorized. You can only delete posts in your own shop.',
            ], 403);
        }

        $shopPost->delete();

        return response()->json([
            'message' => ucfirst($shopPost->type) . ' deleted successfully',
        ]);
    }
}
