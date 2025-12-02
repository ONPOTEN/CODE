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
     * Get latest products across all shops (for feed)
     */
    public function feed(Request $request)
    {
        $query = ShopPost::with(['shop', 'author'])
            ->whereHas('shop', function ($q) {
                $q->where('status', 'active');
            })
            ->published()
            ->where('type', 'post'); // Only get products/posts, not pages

        $perPage = min($request->input('per_page', 10), 50);
        $posts = $query->latest()->paginate($perPage);

        return ShopPostResource::collection($posts);
    }

    /**
     * Get trending products across all shops (sorted by view_count)
     */
    public function trending(Request $request)
    {
        $query = ShopPost::with(['shop', 'author'])
            ->whereHas('shop', function ($q) {
                $q->where('status', 'active');
            })
            ->published()
            ->where('type', 'post') // Only get products/posts, not pages
            ->orderBy('view_count', 'desc');

        $perPage = min($request->input('per_page', 10), 50);
        $posts = $query->paginate($perPage);

        return ShopPostResource::collection($posts);
    }

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
            'main_image' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120', // 5MB max
            'other_images.*' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120', // 5MB max per image
            'variant_option_images.*' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120', // 5MB max for variant option images
            'download_files[file]' => 'nullable|file|max:102400', // 100MB max for download file
            'download_files[name]' => 'nullable|string|max:255',
        ]);

        // Helper function to upload image files to S3
        $uploadImage = function($file, $shopId) {
            // Create directory structure: shopid/year/month/day
            $now = now();
            $directory = "shop_posts/{$shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}";

            // Generate unique filename
            $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();

            try {
                // Store file to S3 using Storage facade
                $path = \Storage::disk('s3')->putFileAs(
                    $directory,
                    $file,
                    $filename,
                    'public'
                );

                if (!$path) {
                    throw new \Exception("Failed to store file {$filename} to S3");
                }

                // Return relative path: shopid/year/month/day/filename
                return "{$shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}/{$filename}";
            } catch (\Exception $e) {
                \Log::error("S3 upload failed for shop post {$shopId}: " . $e->getMessage());
                throw new \Exception("Failed to upload image {$filename}: " . $e->getMessage());
            }
        };

        // Handle multiple featured images upload
        $imagePaths = [];
        if ($request->hasFile('featured_images')) {
            $files = $request->file('featured_images');

            foreach ($files as $file) {
                $imagePaths[] = $uploadImage($file, $shopId);
                usleep(10000); // 10ms delay to ensure unique timestamps
            }
        }

        // Handle main_image upload
        $mainImagePath = null;
        if ($request->hasFile('main_image')) {
            $mainImagePath = $uploadImage($request->file('main_image'), $shopId);
        }

        // Handle other_images upload
        $otherImagePaths = [];
        if ($request->hasFile('other_images')) {
            $files = $request->file('other_images');

            foreach ($files as $file) {
                $otherImagePaths[] = $uploadImage($file, $shopId);
                usleep(10000); // 10ms delay to ensure unique timestamps
            }
        }

        // Handle download file upload
        $downloadFileData = null;
        if ($request->hasFile('download_files.file')) {
            $file = $request->file('download_files.file');
            $fileName = $request->input('download_files.name', $file->getClientOriginalName());

            // Create directory structure: shop_downloads/shopid/year/month/day
            $now = now();
            $directory = "shop_downloads/{$shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}";

            try {
                // Generate unique filename
                $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();

                // Store file to S3
                $path = \Storage::disk('s3')->putFileAs(
                    $directory,
                    $file,
                    $filename,
                    'public'
                );

                if (!$path) {
                    throw new \Exception("Failed to store download file {$filename} to S3");
                }

                // Generate S3 URL
                $s3Url = \Storage::disk('s3')->url("shop_downloads/{$shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}/{$filename}");

                $downloadFileData = [
                    'name' => $fileName,
                    'url' => $s3Url,
                    'size' => $this->formatFileSize($file->getSize()),
                ];
            } catch (\Exception $e) {
                \Log::error("Download file upload failed for shop {$shopId}: " . $e->getMessage());
                throw new \Exception("Failed to upload download file: " . $e->getMessage());
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

        // Prepare create data
        $createData = [
            'shop_id' => $shopId,
            'user_id' => $request->user()->ID,
            'slug' => $slug,
            'title' => $validated['title'],
            'content' => $validated['content'] ?? null,
            'price_range' => $validated['price_range'] ?? null,
            'type' => $validated['type'],
            'status' => $validated['status'],
            'featured_images' => $imagePaths,
        ];

        // Add product-specific images
        if ($mainImagePath) {
            $createData['main_image'] = $mainImagePath;
        }
        if (!empty($otherImagePaths)) {
            $createData['other_images'] = $otherImagePaths;
        }

        // Add download file data if present
        if ($downloadFileData) {
            $createData['download_files'] = $downloadFileData;
        }

        // Extract product type and other fields from request
        if ($request->has('product_type')) {
            $createData['product_type'] = $request->input('product_type');
        }
        if ($request->has('price')) {
            $createData['price'] = $request->input('price');
        }
        if ($request->has('sale_price')) {
            $createData['sale_price'] = $request->input('sale_price');
        }
        if ($request->has('short_description')) {
            $createData['short_description'] = $request->input('short_description');
        }
        if ($request->has('detail_description')) {
            $createData['detail_description'] = $request->input('detail_description');
        }
        if ($request->has('categories')) {
            $categoriesInput = $request->input('categories');
            $createData['categories'] = is_string($categoriesInput) ? json_decode($categoriesInput, true) : $categoriesInput;
        }
        if ($request->has('attributes')) {
            $attributesInput = $request->input('attributes');
            $attributes = is_string($attributesInput) ? json_decode($attributesInput, true) : $attributesInput;

            // Handle variant option images upload
            if ($request->hasFile('variant_option_images')) {
                $variantImages = $request->file('variant_option_images');

                // Upload each variant option image and update the attributes array
                foreach ($variantImages as $key => $file) {
                    // Upload the image to S3
                    $imagePath = $uploadImage($file, $shopId);

                    // Generate the full S3 URL
                    $imageUrl = \Storage::disk('s3')->url("shop_posts/{$imagePath}");

                    // Find the option in attributes and update its image
                    foreach ($attributes as &$attr) {
                        foreach ($attr['options'] as &$option) {
                            if (isset($option['image_key']) && $option['image_key'] === $key) {
                                $option['image'] = $imageUrl;
                                unset($option['image_key']); // Remove the temporary key
                            }
                        }
                    }
                    usleep(10000); // 10ms delay to ensure unique timestamps
                }
            }

            $createData['attributes'] = $attributes;
        }
        if ($request->has('link_files')) {
            $linkFilesInput = $request->input('link_files');
            $createData['link_files'] = is_string($linkFilesInput) ? json_decode($linkFilesInput, true) : $linkFilesInput;
        }

        $shopPost = ShopPost::create($createData);

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
            'main_image' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120', // 5MB max
            'other_images.*' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120', // 5MB max per image
            'variant_option_images.*' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120', // 5MB max for variant option images
            'remove_images' => 'sometimes|array', // Array of image paths to remove
            'remove_images.*' => 'string',
        ]);

        // Get current images
        $currentImages = $shopPost->featured_images ?? [];

        // Handle image removal
        if ($request->has('remove_images')) {
            $imagesToRemove = $request->input('remove_images');
            foreach ($imagesToRemove as $imagePath) {
                // Delete file from S3
                $fullS3Path = "shop_posts/{$imagePath}";
                if (\Storage::disk('s3')->exists($fullS3Path)) {
                    \Storage::disk('s3')->delete($fullS3Path);
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

            foreach ($files as $file) {
                // Generate unique filename
                $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();

                try {
                    // Store file to S3 using Storage facade
                    // Using explicit S3 disk to ensure it's stored on S3, not local
                    $path = \Storage::disk('s3')->putFileAs(
                        $directory,
                        $file,
                        $filename,
                        'public'
                    );

                    if (!$path) {
                        throw new \Exception("Failed to store file {$filename} to S3");
                    }

                    // Add to current images array
                    $currentImages[] = "{$shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}/{$filename}";
                } catch (\Exception $e) {
                    \Log::error("S3 upload failed for shop post {$shopId}: " . $e->getMessage());
                    throw new \Exception("Failed to upload image {$filename}: " . $e->getMessage());
                }

                // Small delay to ensure unique timestamps
                usleep(10000); // 10ms
            }
        }

        // Update featured_images
        $shopPost->featured_images = $currentImages;

        // Helper function to upload image files to S3 (reuse from store)
        $uploadImage = function($file, $shopId) {
            // Create directory structure: shopid/year/month/day
            $now = now();
            $directory = "shop_posts/{$shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}";

            // Generate unique filename
            $filename = time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();

            try {
                // Store file to S3 using Storage facade
                $path = \Storage::disk('s3')->putFileAs(
                    $directory,
                    $file,
                    $filename,
                    'public'
                );

                if (!$path) {
                    throw new \Exception("Failed to store file {$filename} to S3");
                }

                // Return relative path: shopid/year/month/day/filename
                return "{$shopId}/{$now->year}/{$now->format('m')}/{$now->format('d')}/{$filename}";
            } catch (\Exception $e) {
                \Log::error("S3 upload failed for shop post {$shopId}: " . $e->getMessage());
                throw new \Exception("Failed to upload image {$filename}: " . $e->getMessage());
            }
        };

        // Handle main_image update
        if ($request->hasFile('main_image')) {
            // Remove old main_image if exists
            if ($shopPost->main_image) {
                $fullS3Path = "shop_posts/{$shopPost->main_image}";
                if (\Storage::disk('s3')->exists($fullS3Path)) {
                    \Storage::disk('s3')->delete($fullS3Path);
                }
            }
            // Upload new main_image
            $shopPost->main_image = $uploadImage($request->file('main_image'), $shopId);
        }

        // Handle other_images update
        if ($request->hasFile('other_images')) {
            // Remove old other_images if exist
            if ($shopPost->other_images) {
                foreach ($shopPost->other_images as $imagePath) {
                    $fullS3Path = "shop_posts/{$imagePath}";
                    if (\Storage::disk('s3')->exists($fullS3Path)) {
                        \Storage::disk('s3')->delete($fullS3Path);
                    }
                }
            }
            // Upload new other_images
            $otherImagePaths = [];
            $files = $request->file('other_images');
            foreach ($files as $file) {
                $otherImagePaths[] = $uploadImage($file, $shopId);
                usleep(10000); // 10ms delay to ensure unique timestamps
            }
            $shopPost->other_images = $otherImagePaths;
        }

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

        // Update product-specific fields
        if ($request->has('product_type')) {
            $shopPost->product_type = $request->input('product_type');
        }
        if ($request->has('price')) {
            $shopPost->price = $request->input('price');
        }
        if ($request->has('sale_price')) {
            $shopPost->sale_price = $request->input('sale_price');
        }
        if ($request->has('short_description')) {
            $shopPost->short_description = $request->input('short_description');
        }
        if ($request->has('detail_description')) {
            $shopPost->detail_description = $request->input('detail_description');
        }
        if ($request->has('categories')) {
            $categoriesInput = $request->input('categories');
            $shopPost->categories = is_string($categoriesInput) ? json_decode($categoriesInput, true) : $categoriesInput;
        }
        if ($request->has('attributes')) {
            $attributesInput = $request->input('attributes');
            $attributes = is_string($attributesInput) ? json_decode($attributesInput, true) : $attributesInput;

            // Handle variant option images upload
            if ($request->hasFile('variant_option_images')) {
                $variantImages = $request->file('variant_option_images');

                // Upload each variant option image and update the attributes array
                foreach ($variantImages as $key => $file) {
                    // Upload the image to S3
                    $imagePath = $uploadImage($file, $shopId);

                    // Generate the full S3 URL
                    $imageUrl = \Storage::disk('s3')->url("shop_posts/{$imagePath}");

                    // Find the option in attributes and update its image
                    foreach ($attributes as &$attr) {
                        foreach ($attr['options'] as &$option) {
                            if (isset($option['image_key']) && $option['image_key'] === $key) {
                                $option['image'] = $imageUrl;
                                unset($option['image_key']); // Remove the temporary key
                            }
                        }
                    }
                    usleep(10000); // 10ms delay to ensure unique timestamps
                }
            }

            $shopPost->attributes = $attributes;
        }
        if ($request->has('download_files')) {
            $downloadFilesInput = $request->input('download_files');
            if (is_string($downloadFilesInput)) {
                $shopPost->download_files = json_decode($downloadFilesInput, true);
            } else {
                $shopPost->download_files = $downloadFilesInput;
            }
        }
        if ($request->has('link_files')) {
            $linkFilesInput = $request->input('link_files');
            $shopPost->link_files = is_string($linkFilesInput) ? json_decode($linkFilesInput, true) : $linkFilesInput;
        }

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

    /**
     * Format file size in human-readable format
     */
    private function formatFileSize($bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));

        return round($bytes, 2) . ' ' . $units[$pow];
    }
}
