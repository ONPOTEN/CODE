<?php

namespace App\Http\Controllers;

use Aws\S3\S3Client;
use Aws\Exception\AwsException;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Models\WpPost;
use App\Models\WpPostMeta;
use App\Models\GroupPost;
use App\Models\ShopPost;

class ShareImageController extends Controller
{
    private S3Client $s3Client;
    private string $bucket;

    public function __construct()
    {
        $this->s3Client = new S3Client([
            'version'     => 'latest',
            'region'      => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'endpoint'    => env('AWS_ENDPOINT', 'https://atm288528-s3user.vcos1.cloudstorage.com.vn'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', true),
            'credentials' => [
                'key'    => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
            ],
            'http' => [
                'verify' => false,
            ],
        ]);

        $this->bucket = env('AWS_BUCKET', 'centimet2file');
    }

    /**
     * Generate share image for a post
     *
     * @param int $postId
     * @return Response
     */
    public function generate(int $postId)
    {
        try {
            // Check cache for existing image data (stored as base64 to avoid MySQL binary issues)
            $cacheKey = "share_image_data_b64_{$postId}";
            $cachedBase64 = Cache::get($cacheKey);

            if ($cachedBase64) {
                // Return image directly for Facebook crawler compatibility
                $imageData = base64_decode($cachedBase64);
                return response($imageData, 200)
                    ->header('Content-Type', 'image/jpeg')
                    ->header('Cache-Control', 'public, max-age=86400')
                    ->header('X-Content-Type-Options', 'nosniff');
            }

            // Try to find the post in different tables
            $postData = $this->findPost($postId);

            if (!$postData) {
                Log::warning('[ShareImage] Post not found in any table', ['post_id' => $postId]);
                return $this->generatePlaceholderDirect();
            }

            // Get thumbnail URL based on post type
            $thumbnailUrl = $postData['thumbnail'];

            // Generate image using GD
            $imageData = $this->createShareImageGeneric($postData['title'], $postData['author'], $thumbnailUrl);

            // Upload to S3 (for backup/CDN)
            $s3Url = $this->uploadToS3($postId, $imageData);

            // Cache the image data as base64 for 24 hours (MySQL can't store raw binary)
            Cache::put($cacheKey, base64_encode($imageData), now()->addHours(24));

            // Also cache URL for API endpoint
            Cache::put("share_image_{$postId}", $s3Url, now()->addHours(24));

            Log::info('[ShareImage] Generated and uploaded to S3', [
                'post_id' => $postId,
                'url' => $s3Url,
            ]);

            // Return image directly for Facebook crawler compatibility
            return response($imageData, 200)
                ->header('Content-Type', 'image/jpeg')
                ->header('Cache-Control', 'public, max-age=86400')
                ->header('X-Content-Type-Options', 'nosniff');

        } catch (\Exception $e) {
            // Safely log error without potentially malformed data
            $errorMsg = mb_convert_encoding($e->getMessage(), 'UTF-8', 'UTF-8');
            $errorMsg = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $errorMsg);

            Log::error('[ShareImage] Error generating share image', [
                'post_id' => $postId,
                'error' => $errorMsg ?: 'Unknown error',
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            // Return a default placeholder image
            return $this->generatePlaceholderDirect();
        }
    }

    /**
     * Generate share image specifically for ShopPost
     *
     * @param int $postId
     * @return Response
     */
    public function generateShopPost(int $postId)
    {
        try {
            // Check cache for existing image data (stored as base64 to avoid MySQL binary issues)
            $cacheKey = "share_image_shop_post_data_b64_{$postId}";
            $cachedBase64 = Cache::get($cacheKey);

            if ($cachedBase64) {
                // Return image directly for Facebook crawler compatibility
                $imageData = base64_decode($cachedBase64);
                return response($imageData, 200)
                    ->header('Content-Type', 'image/jpeg')
                    ->header('Cache-Control', 'public, max-age=86400')
                    ->header('X-Content-Type-Options', 'nosniff');
            }

            // Find ShopPost specifically with shop relationship
            $shopPost = ShopPost::with(['author', 'shop'])->find($postId);

            if (!$shopPost) {
                Log::warning('[ShareImage] ShopPost not found', ['post_id' => $postId]);
                return $this->generatePlaceholderDirect();
            }

            // Get product image first, then fall back to shop images
            $thumbnail = $this->getShopPostFirstImage($shopPost);

            // If no product image found, try shop images as fallback
            if (!$thumbnail && $shopPost->shop) {
                $thumbnail = $this->getShopFallbackImage($shopPost->shop);
                Log::info('[ShareImage] Using shop fallback image', ['thumbnail' => $thumbnail]);
            }

            Log::info('[ShareImage] Found ShopPost for share image', [
                'post_id' => $postId,
                'title' => $shopPost->title,
                'thumbnail' => $thumbnail,
                'shop_id' => $shopPost->shop_id,
            ]);

            // Get author name - try shop name first for shop posts
            $authorName = $shopPost->shop->name ?? $shopPost->author->display_name ?? $shopPost->author->user_nicename ?? 'CM2 User';

            $postData = [
                'type' => 'shop_post',
                'title' => $shopPost->title ?? 'Untitled',
                'author' => $authorName,
                'thumbnail' => $thumbnail,
            ];

            // Generate image using GD
            $imageData = $this->createShareImageGeneric($postData['title'], $postData['author'], $postData['thumbnail']);

            // Upload to S3 (use different path for shop posts)
            $s3Url = $this->uploadToS3ShopPost($postId, $imageData);

            // Cache the image data as base64 for 24 hours (MySQL can't store raw binary)
            Cache::put($cacheKey, base64_encode($imageData), now()->addHours(24));

            // Also cache URL for API endpoint
            Cache::put("share_image_shop_post_{$postId}", $s3Url, now()->addHours(24));

            Log::info('[ShareImage] ShopPost share image generated and uploaded to S3', [
                'post_id' => $postId,
                'url' => $s3Url,
            ]);

            // Return image directly for Facebook crawler compatibility
            return response($imageData, 200)
                ->header('Content-Type', 'image/jpeg')
                ->header('Cache-Control', 'public, max-age=86400')
                ->header('X-Content-Type-Options', 'nosniff');

        } catch (\Exception $e) {
            Log::error('[ShareImage] Error generating ShopPost share image', [
                'post_id' => $postId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return a default placeholder image
            return $this->generatePlaceholderDirect();
        }
    }

    /**
     * Get fallback image from Shop (logo, banner, or other images)
     *
     * @param \App\Models\Shop $shop
     * @return string|null
     */
    private function getShopFallbackImage($shop): ?string
    {
        // Try banner first (best for OG images)
        if (!empty($shop->banner)) {
            return $this->getFullImageUrl($shop->banner);
        }

        // Try logo
        if (!empty($shop->logo)) {
            return $this->getFullImageUrl($shop->logo);
        }

        // Try image_1 through image_5
        for ($i = 1; $i <= 5; $i++) {
            $field = "image_{$i}";
            if (!empty($shop->$field)) {
                return $this->getFullImageUrl($shop->$field);
            }
        }

        return null;
    }

    /**
     * Find post from different tables
     *
     * @param int $postId
     * @return array|null
     */
    private function findPost(int $postId): ?array
    {
        // Try GroupPost first (most likely for high IDs)
        $groupPost = GroupPost::with(['author', 'meta'])->find($postId);
        if ($groupPost) {
            $thumbnail = $this->getGroupPostFirstImage($groupPost);

            Log::info('[ShareImage] Found GroupPost', [
                'post_id' => $postId,
                'title' => $groupPost->post_title,
                'thumbnail' => $thumbnail,
            ]);

            return [
                'type' => 'group_post',
                'title' => $groupPost->post_title ?? 'Untitled',
                'author' => $groupPost->author->display_name ?? $groupPost->author->user_nicename ?? 'CM2 User',
                'thumbnail' => $thumbnail,
            ];
        }

        // Try ShopPost
        $shopPost = ShopPost::with('author')->find($postId);
        if ($shopPost) {
            $thumbnail = $this->getShopPostFirstImage($shopPost);

            Log::info('[ShareImage] Found ShopPost', [
                'post_id' => $postId,
                'title' => $shopPost->title,
                'thumbnail' => $thumbnail,
            ]);

            return [
                'type' => 'shop_post',
                'title' => $shopPost->title ?? 'Untitled',
                'author' => $shopPost->author->display_name ?? $shopPost->author->user_nicename ?? 'CM2 User',
                'thumbnail' => $thumbnail,
            ];
        }

        // Try WpPost (WordPress posts)
        $wpPost = WpPost::with(['author', 'meta'])->find($postId);
        if ($wpPost) {
            $thumbnail = $this->getWpPostFirstImage($wpPost);

            Log::info('[ShareImage] Found WpPost', [
                'post_id' => $postId,
                'title' => $wpPost->post_title,
                'thumbnail' => $thumbnail,
            ]);

            return [
                'type' => 'wp_post',
                'title' => $wpPost->post_title ?? 'Untitled',
                'author' => $wpPost->author->display_name ?? $wpPost->author->user_nicename ?? 'CM2 User',
                'thumbnail' => $thumbnail,
            ];
        }

        return null;
    }

    /**
     * Get first image from GroupPost
     *
     * @param GroupPost $groupPost
     * @return string|null
     */
    private function getGroupPostFirstImage(GroupPost $groupPost): ?string
    {
        // 1. Try featured_image from meta
        $featuredImageMeta = $groupPost->meta->firstWhere('meta_key', 'featured_image');
        if ($featuredImageMeta && $featuredImageMeta->meta_value) {
            return $this->getFullImageUrl($featuredImageMeta->meta_value);
        }

        // 2. Try gallery images from meta (first one)
        $imageMeta = $groupPost->meta->firstWhere('meta_key', 'image');
        if ($imageMeta && $imageMeta->meta_value) {
            return $this->getFullImageUrl($imageMeta->meta_value);
        }

        // 3. Fallback to featured_image column
        if ($groupPost->featured_image) {
            return $this->getFullImageUrl($groupPost->featured_image);
        }

        // 4. Try to extract image from post_content
        if ($groupPost->post_content) {
            $imageUrl = $this->extractImageFromContent($groupPost->post_content);
            if ($imageUrl) {
                return $imageUrl;
            }
        }

        return null;
    }

    /**
     * Get first image from ShopPost
     *
     * @param ShopPost $shopPost
     * @return string|null
     */
    private function getShopPostFirstImage(ShopPost $shopPost): ?string
    {
        // Get raw attributes to check all possible image fields
        $rawAttributes = $shopPost->getAttributes();

        Log::info('[ShareImage] Getting first image for ShopPost', [
            'post_id' => $shopPost->id,
            'main_image' => $shopPost->main_image ?? null,
            'featured_images_type' => gettype($shopPost->featured_images),
            'featured_images' => $shopPost->featured_images,
            'raw_main_image' => $rawAttributes['main_image'] ?? null,
            'raw_featured_images' => $rawAttributes['featured_images'] ?? null,
            'raw_images' => $rawAttributes['images'] ?? null,
        ]);

        // 1. Try main_image first (use getShopPostImageUrl for shop_posts/ prefix)
        if (!empty($shopPost->main_image)) {
            $url = $this->getShopPostImageUrl($shopPost->main_image);
            Log::info('[ShareImage] Using main_image', ['url' => $url]);
            return $url;
        }

        // 2. Try featured_image (singular) field
        if (!empty($shopPost->featured_image)) {
            $url = $this->getShopPostImageUrl($shopPost->featured_image);
            Log::info('[ShareImage] Using featured_image', ['url' => $url]);
            return $url;
        }

        // 3. Fallback to featured_images array (first image is the main product image)
        $featuredImages = $shopPost->featured_images;

        // Also try raw attribute if cast version is empty
        if (empty($featuredImages) && !empty($rawAttributes['featured_images'])) {
            $featuredImages = $rawAttributes['featured_images'];
            if (is_string($featuredImages)) {
                $featuredImages = json_decode($featuredImages, true);
            }
        }

        if (is_array($featuredImages) && count($featuredImages) > 0) {
            $firstImage = $this->extractImagePath($featuredImages[0]);
            if ($firstImage) {
                $url = $this->getShopPostImageUrl($firstImage);
                Log::info('[ShareImage] Using featured_images[0]', ['raw' => $featuredImages[0], 'url' => $url]);
                return $url;
            }
        }

        // 4. Try 'images' field (might exist in some schemas)
        $images = $shopPost->images ?? ($rawAttributes['images'] ?? null);
        if (is_string($images)) {
            $images = json_decode($images, true);
        }
        if (is_array($images) && count($images) > 0) {
            $firstImage = $this->extractImagePath($images[0]);
            if ($firstImage) {
                $url = $this->getShopPostImageUrl($firstImage);
                Log::info('[ShareImage] Using images[0]', ['url' => $url]);
                return $url;
            }
        }

        // 5. Fallback to other_images array
        $otherImages = $shopPost->other_images;

        // Also try raw attribute if cast version is empty
        if (empty($otherImages) && !empty($rawAttributes['other_images'])) {
            $otherImages = $rawAttributes['other_images'];
            if (is_string($otherImages)) {
                $otherImages = json_decode($otherImages, true);
            }
        }

        if (is_array($otherImages) && count($otherImages) > 0) {
            $firstImage = $this->extractImagePath($otherImages[0]);
            if ($firstImage) {
                $url = $this->getShopPostImageUrl($firstImage);
                Log::info('[ShareImage] Using other_images[0]', ['url' => $url]);
                return $url;
            }
        }

        // 6. Try to extract from content/detail_description
        if (!empty($shopPost->detail_description)) {
            $imageUrl = $this->extractImageFromContent($shopPost->detail_description);
            if ($imageUrl) {
                Log::info('[ShareImage] Extracted from detail_description', ['url' => $imageUrl]);
                return $imageUrl;
            }
        }

        if (!empty($shopPost->content)) {
            $imageUrl = $this->extractImageFromContent($shopPost->content);
            if ($imageUrl) {
                Log::info('[ShareImage] Extracted from content', ['url' => $imageUrl]);
                return $imageUrl;
            }
        }

        Log::warning('[ShareImage] No image found for ShopPost', ['post_id' => $shopPost->id]);
        return null;
    }

    /**
     * Extract image path from various formats
     *
     * @param mixed $imageData
     * @return string|null
     */
    private function extractImagePath($imageData): ?string
    {
        if (is_string($imageData) && !empty($imageData)) {
            return $imageData;
        }

        if (is_array($imageData)) {
            // Try common keys for image URL
            foreach (['url', 'path', 'src', 'image', 'file'] as $key) {
                if (!empty($imageData[$key])) {
                    return $imageData[$key];
                }
            }
        }

        return null;
    }

    /**
     * Get first image from WpPost
     *
     * @param WpPost $wpPost
     * @return string|null
     */
    private function getWpPostFirstImage(WpPost $wpPost): ?string
    {
        // 1. Check for _post_image_0 in meta (first uploaded image)
        $firstImageMeta = $wpPost->meta->firstWhere('meta_key', '_post_image_0');
        if ($firstImageMeta && $firstImageMeta->meta_value) {
            return $this->getFullImageUrl($firstImageMeta->meta_value);
        }

        // 2. Check for any _post_image_* meta
        foreach ($wpPost->meta as $meta) {
            if (str_starts_with($meta->meta_key, '_post_image_') && $meta->meta_value) {
                return $this->getFullImageUrl($meta->meta_value);
            }
        }

        // 3. Check for _thumbnail_url in meta
        $thumbnailMeta = $wpPost->meta->firstWhere('meta_key', '_thumbnail_url');
        if ($thumbnailMeta && $thumbnailMeta->meta_value) {
            return $thumbnailMeta->meta_value;
        }

        // 4. Check for featured image ID (_thumbnail_id)
        $thumbnailIdMeta = $wpPost->meta->firstWhere('meta_key', '_thumbnail_id');
        if ($thumbnailIdMeta && $thumbnailIdMeta->meta_value) {
            $attachmentId = $thumbnailIdMeta->meta_value;
            $attachment = WpPost::find($attachmentId);
            if ($attachment && $attachment->guid) {
                return $attachment->guid;
            }
        }

        // 5. Extract first image from post content
        if ($wpPost->post_content) {
            $imageUrl = $this->extractImageFromContent($wpPost->post_content);
            if ($imageUrl) {
                return $imageUrl;
            }
        }

        return null;
    }

    /**
     * Extract first image URL from HTML content
     *
     * @param string $content
     * @return string|null
     */
    private function extractImageFromContent(string $content): ?string
    {
        // Try to find img tags
        if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/', $content, $matches)) {
            return $matches[1];
        }

        // Try to find image URLs directly (common patterns)
        if (preg_match('/https?:\/\/[^\s<>"\']+\.(?:jpg|jpeg|png|gif|webp)/i', $content, $matches)) {
            return $matches[0];
        }

        return null;
    }

    /**
     * Get the S3 URL for a share image (API endpoint)
     *
     * @param int $postId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUrl(int $postId)
    {
        try {
            $cacheKey = "share_image_{$postId}";
            $cachedUrl = Cache::get($cacheKey);

            if ($cachedUrl) {
                return response()->json([
                    'success' => true,
                    'url' => $cachedUrl,
                    'cached' => true,
                ]);
            }

            // Try to find the post in different tables
            $postData = $this->findPost($postId);

            if (!$postData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Post not found',
                ], 404);
            }

            // Generate and upload
            $imageData = $this->createShareImageGeneric($postData['title'], $postData['author'], $postData['thumbnail']);
            $s3Url = $this->uploadToS3($postId, $imageData);

            Cache::put($cacheKey, $s3Url, now()->addHours(24));

            return response()->json([
                'success' => true,
                'url' => $s3Url,
                'cached' => false,
            ]);

        } catch (\Exception $e) {
            Log::error('[ShareImage] Error getting share image URL', [
                'post_id' => $postId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate share image',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Invalidate cache for a post (call when post is updated)
     *
     * @param int $postId
     * @return \Illuminate\Http\JsonResponse
     */
    public function invalidateCache(int $postId)
    {
        $cacheKey = "share_image_{$postId}";
        Cache::forget($cacheKey);

        // Also try to delete from S3
        try {
            $this->s3Client->deleteObject([
                'Bucket' => $this->bucket,
                'Key'    => "share-images/{$postId}.jpg",
            ]);
        } catch (\Exception $e) {
            // Ignore deletion errors
        }

        return response()->json([
            'success' => true,
            'message' => 'Cache invalidated',
        ]);
    }

    /**
     * Debug endpoint to check any post's share image data
     *
     * @param int $postId
     * @return \Illuminate\Http\JsonResponse
     */
    public function debug(int $postId)
    {
        $result = [
            'post_id' => $postId,
            'timestamp' => now()->toIso8601String(),
            'cache_status' => [],
            'post_data' => null,
            'image_generation' => [],
            's3_config' => [
                'bucket' => $this->bucket,
                'endpoint' => env('AWS_ENDPOINT'),
                'region' => env('AWS_DEFAULT_REGION'),
            ],
        ];

        // Check cache status
        $cacheKey = "share_image_{$postId}";
        $cacheDataKey = "share_image_data_{$postId}";
        $result['cache_status'] = [
            'url_cached' => Cache::has($cacheKey),
            'url_value' => Cache::get($cacheKey),
            'data_cached' => Cache::has($cacheDataKey),
            'data_size' => Cache::has($cacheDataKey) ? strlen(Cache::get($cacheDataKey)) . ' bytes' : null,
        ];

        // Find post
        $postData = $this->findPost($postId);
        if (!$postData) {
            $result['post_data'] = [
                'found' => false,
                'error' => 'Post not found in GroupPost, ShopPost, or WpPost tables',
            ];
            return response()->json($result);
        }

        $result['post_data'] = [
            'found' => true,
            'type' => $postData['type'],
            'title' => $postData['title'],
            'author' => $postData['author'],
            'thumbnail_url' => $postData['thumbnail'],
        ];

        // Test image loading
        if ($postData['thumbnail']) {
            $result['image_generation']['thumbnail_url'] = $postData['thumbnail'];

            // Check URL validation
            $result['image_generation']['url_allowed'] = $this->isAllowedUrl($postData['thumbnail']);

            // Test loading
            $image = $this->loadImageFromUrl($postData['thumbnail']);
            $result['image_generation']['image_load'] = $image ? 'SUCCESS' : 'FAILED';
            if ($image) {
                $result['image_generation']['image_dimensions'] = [
                    'width' => imagesx($image),
                    'height' => imagesy($image),
                ];
                imagedestroy($image);
            }
        } else {
            $result['image_generation']['thumbnail_url'] = null;
            $result['image_generation']['note'] = 'No thumbnail found, will use placeholder';
        }

        // Check GD library
        $result['image_generation']['gd_available'] = function_exists('imagecreatetruecolor');
        $result['image_generation']['gd_info'] = function_exists('gd_info') ? gd_info() : 'GD not available';

        // Check font files
        $result['image_generation']['fonts'] = [
            'Inter-Bold' => file_exists(public_path('fonts/Inter-Bold.ttf')),
            'Inter-Regular' => file_exists(public_path('fonts/Inter-Regular.ttf')),
        ];

        // Check logo
        $result['image_generation']['logo_exists'] = file_exists(public_path('logo/cm2-logo.png'));

        // Generate expected S3 URL
        $result['expected_s3_url'] = $this->getPublicUrl("share-images/{$postId}.jpg");

        return response()->json($result);
    }

    /**
     * Debug endpoint to check ShopPost image data
     *
     * @param int $postId
     * @return \Illuminate\Http\JsonResponse
     */
    public function debugShopPost(int $postId)
    {
        $shopPost = ShopPost::with(['author', 'shop'])->find($postId);

        if (!$shopPost) {
            return response()->json([
                'success' => false,
                'message' => 'ShopPost not found',
            ], 404);
        }

        $rawAttributes = $shopPost->getAttributes();

        // Get the image URL that would be used
        $thumbnailUrl = $this->getShopPostFirstImage($shopPost);

        // Test loading the image
        $imageLoadResult = null;
        if ($thumbnailUrl) {
            $image = $this->loadImageFromUrl($thumbnailUrl);
            $imageLoadResult = $image ? 'SUCCESS' : 'FAILED';
            if ($image) {
                imagedestroy($image);
            }
        }

        return response()->json([
            'success' => true,
            'post_id' => $shopPost->id,
            'title' => $shopPost->title,
            'shop_id' => $shopPost->shop_id,
            'shop_name' => $shopPost->shop->name ?? null,
            'main_image' => $shopPost->main_image,
            'featured_image' => $shopPost->featured_image ?? null,
            'featured_images' => $shopPost->featured_images,
            'images' => $shopPost->images ?? null,
            'other_images' => $shopPost->other_images,
            'raw_main_image' => $rawAttributes['main_image'] ?? null,
            'raw_featured_images' => $rawAttributes['featured_images'] ?? null,
            'raw_images' => $rawAttributes['images'] ?? null,
            'resolved_thumbnail_url' => $thumbnailUrl,
            'image_load_test' => $imageLoadResult,
        ]);
    }

    /**
     * Create share image using GD library (generic version)
     *
     * @param string $title
     * @param string $author
     * @param string|null $thumbnailUrl
     * @return string
     */
    private function createShareImageGeneric(string $title, string $author, ?string $thumbnailUrl): string
    {
        // Check if GD library is available
        if (!function_exists('imagecreatetruecolor')) {
            Log::warning('[ShareImage] GD library not available');
            // Return empty string - caller should handle this
            throw new \Exception('GD library not available. Please install php-gd extension.');
        }

        // Sanitize text inputs to ensure valid UTF-8
        $title = $this->sanitizeText($title);
        $author = $this->sanitizeText($author);

        $width = 1200;
        $height = 630;

        // Create canvas
        $canvas = imagecreatetruecolor($width, $height);

        // Colors
        $bgColor = imagecolorallocate($canvas, 30, 30, 40);
        $overlayColor = imagecolorallocatealpha($canvas, 0, 0, 0, 50);
        $whiteColor = imagecolorallocate($canvas, 255, 255, 255);
        $grayColor = imagecolorallocate($canvas, 200, 200, 200);
        $accentColor = imagecolorallocate($canvas, 255, 102, 0); // Orange accent

        // Fill background
        imagefill($canvas, 0, 0, $bgColor);

        // Try to load and add thumbnail
        if ($thumbnailUrl) {
            $thumbnail = $this->loadImageFromUrl($thumbnailUrl);
            if ($thumbnail) {
                // Resize thumbnail to fit left side
                $thumbWidth = 450;
                $thumbHeight = 450;
                $thumbResized = imagecreatetruecolor($thumbWidth, $thumbHeight);

                // Get original dimensions
                $origWidth = imagesx($thumbnail);
                $origHeight = imagesy($thumbnail);

                // Calculate crop dimensions (center crop)
                $srcX = 0;
                $srcY = 0;
                $srcWidth = $origWidth;
                $srcHeight = $origHeight;

                if ($origWidth / $origHeight > 1) {
                    // Wider than tall, crop sides
                    $srcWidth = $origHeight;
                    $srcX = ($origWidth - $srcWidth) / 2;
                } else {
                    // Taller than wide, crop top/bottom
                    $srcHeight = $origWidth;
                    $srcY = ($origHeight - $srcHeight) / 2;
                }

                imagecopyresampled(
                    $thumbResized, $thumbnail,
                    0, 0, $srcX, $srcY,
                    $thumbWidth, $thumbHeight, $srcWidth, $srcHeight
                );

                // Create blurred background
                $bgThumb = imagecreatetruecolor($width, $height);
                imagecopyresampled($bgThumb, $thumbnail, 0, 0, 0, 0, $width, $height, $origWidth, $origHeight);

                // Apply blur effect (multiple passes)
                for ($i = 0; $i < 10; $i++) {
                    imagefilter($bgThumb, IMG_FILTER_GAUSSIAN_BLUR);
                }
                imagefilter($bgThumb, IMG_FILTER_BRIGHTNESS, -50);

                // Copy blurred background to canvas
                imagecopy($canvas, $bgThumb, 0, 0, 0, 0, $width, $height);

                // Add semi-transparent overlay
                imagefilledrectangle($canvas, 0, 0, $width, $height, $overlayColor);

                // Add clear thumbnail on left
                $thumbX = 50;
                $thumbY = ($height - $thumbHeight) / 2;
                imagecopy($canvas, $thumbResized, $thumbX, $thumbY, 0, 0, $thumbWidth, $thumbHeight);

                // Add border around thumbnail
                imagerectangle($canvas, $thumbX - 2, $thumbY - 2, $thumbX + $thumbWidth + 2, $thumbY + $thumbHeight + 2, $whiteColor);

                imagedestroy($thumbnail);
                imagedestroy($thumbResized);
                imagedestroy($bgThumb);
            }
        }

        // Add logo if exists
        $logoPath = public_path('logo/cm2-logo.png');
        if (file_exists($logoPath)) {
            $logo = imagecreatefrompng($logoPath);
            if ($logo) {
                $logoWidth = 80;
                $logoHeight = 80;
                $logoResized = imagecreatetruecolor($logoWidth, $logoHeight);
                imagesavealpha($logoResized, true);
                $transparent = imagecolorallocatealpha($logoResized, 0, 0, 0, 127);
                imagefill($logoResized, 0, 0, $transparent);

                imagecopyresampled(
                    $logoResized, $logo,
                    0, 0, 0, 0,
                    $logoWidth, $logoHeight, imagesx($logo), imagesy($logo)
                );

                imagecopy($canvas, $logoResized, 40, 40, 0, 0, $logoWidth, $logoHeight);
                imagedestroy($logo);
                imagedestroy($logoResized);
            }
        }

        // Text positioning
        $textX = $thumbnailUrl ? 550 : 100;
        $textMaxWidth = $thumbnailUrl ? 600 : 1000;

        // Word wrap title
        $title = $this->truncateText($title, 70);

        // Use built-in font (or custom font if available)
        $fontPath = public_path('fonts/Inter-Bold.ttf');
        $fontRegularPath = public_path('fonts/Inter-Regular.ttf');
        $useTTF = false;

        // Check if TTF fonts are available and readable
        if (file_exists($fontPath) && is_readable($fontPath)) {
            // Test if font is valid
            $testBbox = @imagettfbbox(12, 0, $fontPath, 'test');
            $useTTF = ($testBbox !== false);
        }

        if ($useTTF) {
            // Draw title with custom font
            $this->drawTextWithWordWrapSafe($canvas, $title, $fontPath, 36, $whiteColor, $textX, 200, $textMaxWidth);

            // Draw author
            $authorFont = (file_exists($fontRegularPath) && is_readable($fontRegularPath)) ? $fontRegularPath : $fontPath;
            @imagettftext($canvas, 24, 0, $textX, 380, $grayColor, $authorFont, "by " . $author);

            // Draw site name
            @imagettftext($canvas, 18, 0, $textX, 550, $accentColor, $authorFont, "centimet2.com");
        } else {
            // Fallback to built-in font
            $font = 5; // Built-in font size

            // Draw title (basic)
            $lines = $this->wordWrapBasic($title, 40);
            $lineY = 200;
            foreach ($lines as $line) {
                imagestring($canvas, $font, $textX, $lineY, $line, $whiteColor);
                $lineY += 25;
            }

            // Draw author
            imagestring($canvas, 4, $textX, $lineY + 50, "by " . $author, $grayColor);

            // Draw site name
            imagestring($canvas, 3, $textX, 550, "centimet2.com", $accentColor);
        }

        // Output to string
        ob_start();
        imagejpeg($canvas, null, 90);
        $imageData = ob_get_clean();

        imagedestroy($canvas);

        return $imageData;
    }

    /**
     * Create share image using GD library (legacy WpPost version)
     *
     * @param WpPost $post
     * @param string|null $thumbnailUrl
     * @return string
     */
    private function createShareImage(WpPost $post, ?string $thumbnailUrl): string
    {
        $title = $post->post_title ?? 'Untitled';
        $author = $post->author->display_name ?? $post->author->user_nicename ?? 'CM2 User';

        return $this->createShareImageGeneric($title, $author, $thumbnailUrl);
    }

    /**
     * Upload image to S3
     *
     * @param int $postId
     * @param string $imageData
     * @return string
     */
    private function uploadToS3(int $postId, string $imageData): string
    {
        $key = "share-images/{$postId}.jpg";

        try {
            $result = $this->s3Client->putObject([
                'Bucket' => $this->bucket,
                'Key'    => $key,
                'Body'   => $imageData,
                'ContentType' => 'image/jpeg',
                'ACL'    => 'public-read',
                'CacheControl' => 'max-age=86400',
            ]);

            $url = $result['ObjectURL'] ?? $this->getPublicUrl($key);

            Log::info('[ShareImage] Uploaded to S3', [
                'post_id' => $postId,
                'key' => $key,
                'url' => $url,
            ]);

            return $url;

        } catch (AwsException $e) {
            Log::error('[ShareImage] S3 upload failed', [
                'post_id' => $postId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Upload shop post share image to S3
     *
     * @param int $postId
     * @param string $imageData
     * @return string
     */
    private function uploadToS3ShopPost(int $postId, string $imageData): string
    {
        $key = "share-images/shop-posts/{$postId}.jpg";

        try {
            $result = $this->s3Client->putObject([
                'Bucket' => $this->bucket,
                'Key'    => $key,
                'Body'   => $imageData,
                'ContentType' => 'image/jpeg',
                'ACL'    => 'public-read',
                'CacheControl' => 'max-age=86400',
            ]);

            $url = $result['ObjectURL'] ?? $this->getPublicUrl($key);

            Log::info('[ShareImage] ShopPost image uploaded to S3', [
                'post_id' => $postId,
                'key' => $key,
                'url' => $url,
            ]);

            return $url;

        } catch (AwsException $e) {
            Log::error('[ShareImage] ShopPost S3 upload failed', [
                'post_id' => $postId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Get public URL for S3 object
     *
     * @param string $key
     * @return string
     */
    private function getPublicUrl(string $key): string
    {
        $endpoint = env('AWS_ENDPOINT', 'https://atm288528-s3user.vcos1.cloudstorage.com.vn');
        return "{$endpoint}/{$this->bucket}/{$key}";
    }

    /**
     * Get full image URL (convert relative path to S3 URL if needed)
     *
     * @param string|null $imagePath
     * @return string|null
     */
    private function getFullImageUrl(?string $imagePath): ?string
    {
        if (!$imagePath) {
            return null;
        }

        // If already a full URL, return as-is
        if (str_starts_with($imagePath, 'http://') || str_starts_with($imagePath, 'https://')) {
            return $imagePath;
        }

        // Convert relative path to S3 URL using endpoint and bucket
        $endpoint = env('AWS_ENDPOINT', 'https://atm288528-s3user.vcos1.cloudstorage.com.vn');
        return "{$endpoint}/{$this->bucket}/{$imagePath}";
    }

    /**
     * Get full image URL for ShopPost images (adds shop_posts/ prefix if needed)
     *
     * @param string|null $imagePath
     * @return string|null
     */
    private function getShopPostImageUrl(?string $imagePath): ?string
    {
        if (!$imagePath) {
            return null;
        }

        // If already a full URL, return as-is
        if (str_starts_with($imagePath, 'http://') || str_starts_with($imagePath, 'https://')) {
            return $imagePath;
        }

        // If path already has shop_posts/ prefix, use regular method
        if (str_starts_with($imagePath, 'shop_posts/')) {
            return $this->getFullImageUrl($imagePath);
        }

        // Add shop_posts/ prefix for ShopPost images
        $endpoint = env('AWS_ENDPOINT', 'https://atm288528-s3user.vcos1.cloudstorage.com.vn');
        return "{$endpoint}/{$this->bucket}/shop_posts/{$imagePath}";
    }


    /**
     * SECURITY: Validate URL before fetching to prevent SSRF attacks
     *
     * @param string $url
     * @return bool
     */
    private function isAllowedUrl(string $url): bool
    {
        $parsedUrl = parse_url($url);

        if (!$parsedUrl || !isset($parsedUrl['host'])) {
            Log::warning('[Security] Invalid URL format', ['url' => $url]);
            return false;
        }

        // Only allow http/https schemes
        if (!isset($parsedUrl['scheme']) || !in_array($parsedUrl['scheme'], ['http', 'https'])) {
            Log::warning('[Security] Invalid URL scheme', ['url' => $url, 'scheme' => $parsedUrl['scheme'] ?? 'none']);
            return false;
        }

        // Whitelist of allowed domains
        $allowedHosts = [
            'centimet2.com',
            'www.centimet2.com',
            'atm288528-s3user.vcos1.cloudstorage.com.vn',
            'i.imgur.com',
            'cdn.shopify.com',
        ];

        // Check if host is in allowed list
        $host = strtolower($parsedUrl['host']);
        $isAllowed = false;
        foreach ($allowedHosts as $allowed) {
            if ($host === $allowed || str_ends_with($host, '.' . $allowed)) {
                $isAllowed = true;
                break;
            }
        }

        if (!$isAllowed) {
            Log::warning('[Security] Blocked unauthorized domain', ['url' => $url, 'host' => $host]);
            return false;
        }

        // Resolve hostname to IP and block private/local IPs
        $ip = gethostbyname($host);
        if ($this->isPrivateIP($ip)) {
            Log::warning('[Security] Blocked private IP address', ['url' => $url, 'host' => $host, 'ip' => $ip]);
            return false;
        }

        return true;
    }

    /**
     * SECURITY: Check if IP is private/local/reserved to prevent SSRF to internal network
     *
     * @param string $ip
     * @return bool
     */
    private function isPrivateIP(string $ip): bool
    {
        // Block private, local, and reserved IP ranges
        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) === false;
    }

    /**
     * SECURITY: Validate DNS safety to prevent DNS rebinding attacks
     *
     * @param string $url
     * @return bool
     */
    private function validateDnsSafety(string $url): bool
    {
        $parsedUrl = parse_url($url);
        if (!$parsedUrl || !isset($parsedUrl['host'])) {
            return false;
        }

        $host = $parsedUrl['host'];

        // Get ALL IP addresses for the hostname
        $ips = [];

        // IPv4
        $records = @dns_get_record($host, DNS_A);
        if ($records) {
            foreach ($records as $record) {
                if (isset($record['ip'])) {
                    $ips[] = $record['ip'];
                }
            }
        }

        // IPv6
        $records = @dns_get_record($host, DNS_AAAA);
        if ($records) {
            foreach ($records as $record) {
                if (isset($record['ipv6'])) {
                    $ips[] = $record['ipv6'];
                }
            }
        }

        // If no IPs resolved, block the request
        if (empty($ips)) {
            Log::warning('[Security] DNS resolution failed', ['host' => $host]);
            return false;
        }

        // Check ALL resolved IPs (prevent DNS rebinding)
        foreach ($ips as $ip) {
            if ($this->isPrivateIP($ip)) {
                Log::warning('[Security] DNS resolved to private IP', [
                    'host' => $host,
                    'ip' => $ip,
                    'url' => $url,
                ]);
                return false;
            }
        }

        return true;
    }

    /**
     * Load image from URL
     *
     * @param string $url
     * @return resource|false
     */
    private function loadImageFromUrl(string $url)
    {
        // SECURITY: Validate URL before fetching to prevent SSRF attacks
        if (!$this->isAllowedUrl($url)) {
            Log::error('[Security] BLOCKED unauthorized URL in loadImageFromUrl', ['url' => $url]);
            return false;
        }

        // SECURITY: Double-check DNS after initial validation (prevent DNS rebinding)
        if (!$this->validateDnsSafety($url)) {
            Log::error('[Security] BLOCKED due to unsafe DNS resolution', ['url' => $url]);
            return false;
        }

        Log::info('[ShareImage] Attempting to load image from URL', ['url' => $url]);

        // Try cURL first (more reliable for HTTPS)
        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS => 3, // SECURITY: Limit redirects
                CURLOPT_TIMEOUT => 10, // SECURITY: Reduced from 15 to 10
                CURLOPT_CONNECTTIMEOUT => 5, // SECURITY: Connection timeout
                CURLOPT_SSL_VERIFYPEER => true, // SECURITY: ENABLE SSL verification
                CURLOPT_SSL_VERIFYHOST => 2, // SECURITY: ENABLE host verification
                CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; CM2Bot/1.0)',
                CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, // SECURITY: Only HTTP/HTTPS
            ]);

            $imageData = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($imageData && $httpCode === 200) {
                $image = @imagecreatefromstring($imageData);
                if ($image) {
                    Log::info('[ShareImage] Successfully loaded image via cURL', ['url' => $url]);
                    return $image;
                }
            }

            Log::warning('[ShareImage] cURL failed to load image', [
                'url' => $url,
                'http_code' => $httpCode,
                'error' => $error,
            ]);
        }

        // Fallback to file_get_contents
        try {
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'user_agent' => 'Mozilla/5.0 (compatible; CM2Bot/1.0)',
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ],
            ]);

            $imageData = @file_get_contents($url, false, $context);
            if (!$imageData) {
                Log::warning('[ShareImage] file_get_contents returned empty', ['url' => $url]);
                return false;
            }

            $image = @imagecreatefromstring($imageData);
            if ($image) {
                Log::info('[ShareImage] Successfully loaded image via file_get_contents', ['url' => $url]);
                return $image;
            }

            Log::warning('[ShareImage] imagecreatefromstring failed', ['url' => $url]);
            return false;

        } catch (\Exception $e) {
            Log::warning('[ShareImage] Failed to load image from URL', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Sanitize text to ensure valid UTF-8 encoding
     *
     * @param string $text
     * @return string
     */
    private function sanitizeText(string $text): string
    {
        // Convert to UTF-8, handling various encodings
        $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');

        // Remove any invalid UTF-8 sequences and control characters
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);

        // Strip HTML tags
        $text = strip_tags($text);

        // Decode HTML entities
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Normalize whitespace
        $text = preg_replace('/\s+/', ' ', trim($text));

        return $text ?: 'Untitled';
    }

    /**
     * Truncate text to max length
     *
     * @param string $text
     * @param int $maxLength
     * @return string
     */
    private function truncateText(string $text, int $maxLength): string
    {
        // Ensure text is valid UTF-8
        $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');

        // Remove any invalid UTF-8 sequences
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);

        // Strip HTML tags
        $text = strip_tags($text);

        // Normalize whitespace
        $text = preg_replace('/\s+/', ' ', trim($text));

        if (mb_strlen($text, 'UTF-8') <= $maxLength) {
            return $text;
        }

        return mb_substr($text, 0, $maxLength - 1, 'UTF-8') . '…';
    }

    /**
     * Draw text with word wrap using TTF font
     *
     * @param resource $image
     * @param string $text
     * @param string $fontPath
     * @param int $fontSize
     * @param int $color
     * @param int $x
     * @param int $y
     * @param int $maxWidth
     */
    private function drawTextWithWordWrap($image, string $text, string $fontPath, int $fontSize, $color, int $x, int $y, int $maxWidth): void
    {
        $words = explode(' ', $text);
        $lines = [];
        $currentLine = '';

        foreach ($words as $word) {
            $testLine = $currentLine ? $currentLine . ' ' . $word : $word;
            $bbox = imagettfbbox($fontSize, 0, $fontPath, $testLine);
            $lineWidth = $bbox[2] - $bbox[0];

            if ($lineWidth > $maxWidth && $currentLine) {
                $lines[] = $currentLine;
                $currentLine = $word;
            } else {
                $currentLine = $testLine;
            }
        }

        if ($currentLine) {
            $lines[] = $currentLine;
        }

        $lineHeight = $fontSize * 1.4;
        foreach ($lines as $i => $line) {
            imagettftext($image, $fontSize, 0, $x, $y + ($i * $lineHeight), $color, $fontPath, $line);
        }
    }

    /**
     * Draw text with word wrap using TTF font (safe version with error suppression)
     */
    private function drawTextWithWordWrapSafe($image, string $text, string $fontPath, int $fontSize, $color, int $x, int $y, int $maxWidth): void
    {
        $words = explode(' ', $text);
        $lines = [];
        $currentLine = '';

        foreach ($words as $word) {
            $testLine = $currentLine ? $currentLine . ' ' . $word : $word;
            $bbox = @imagettfbbox($fontSize, 0, $fontPath, $testLine);
            if ($bbox === false) {
                // Font error, just add word
                $currentLine = $testLine;
                continue;
            }
            $lineWidth = $bbox[2] - $bbox[0];

            if ($lineWidth > $maxWidth && $currentLine) {
                $lines[] = $currentLine;
                $currentLine = $word;
            } else {
                $currentLine = $testLine;
            }
        }

        if ($currentLine) {
            $lines[] = $currentLine;
        }

        $lineHeight = $fontSize * 1.4;
        foreach ($lines as $i => $line) {
            @imagettftext($image, $fontSize, 0, $x, $y + ($i * $lineHeight), $color, $fontPath, $line);
        }
    }

    /**
     * Basic word wrap for built-in fonts
     *
     * @param string $text
     * @param int $maxChars
     * @return array
     */
    private function wordWrapBasic(string $text, int $maxChars): array
    {
        return explode("\n", wordwrap($text, $maxChars, "\n", true));
    }

    /**
     * Generate placeholder image and upload to S3
     *
     * @return \Illuminate\Http\RedirectResponse|Response
     */
    private function generatePlaceholder()
    {
        // Check cache for placeholder
        $cacheKey = "share_image_placeholder";
        $cachedUrl = Cache::get($cacheKey);

        if ($cachedUrl) {
            return redirect($cachedUrl);
        }

        $width = 1200;
        $height = 630;

        $canvas = imagecreatetruecolor($width, $height);
        $bgColor = imagecolorallocate($canvas, 50, 50, 60);
        $textColor = imagecolorallocate($canvas, 255, 255, 255);
        $accentColor = imagecolorallocate($canvas, 255, 102, 0);

        imagefill($canvas, 0, 0, $bgColor);

        // Add logo if exists
        $logoPath = public_path('logo/cm2-logo.png');
        if (file_exists($logoPath)) {
            $logo = @imagecreatefrompng($logoPath);
            if ($logo) {
                $logoWidth = 150;
                $logoHeight = 150;
                $logoResized = imagecreatetruecolor($logoWidth, $logoHeight);
                imagesavealpha($logoResized, true);
                $transparent = imagecolorallocatealpha($logoResized, 0, 0, 0, 127);
                imagefill($logoResized, 0, 0, $transparent);

                imagecopyresampled(
                    $logoResized, $logo,
                    0, 0, 0, 0,
                    $logoWidth, $logoHeight, imagesx($logo), imagesy($logo)
                );

                $logoX = ($width - $logoWidth) / 2;
                $logoY = ($height - $logoHeight) / 2 - 50;
                imagecopy($canvas, $logoResized, $logoX, $logoY, 0, 0, $logoWidth, $logoHeight);
                imagedestroy($logo);
                imagedestroy($logoResized);
            }
        }

        // Draw site name
        $fontPath = public_path('fonts/Inter-Bold.ttf');
        $fontUsed = false;
        if (file_exists($fontPath) && is_readable($fontPath)) {
            try {
                $text = "centimet2.com";
                $fontSize = 36;
                $bbox = @imagettfbbox($fontSize, 0, $fontPath, $text);
                if ($bbox !== false) {
                    $textWidth = $bbox[2] - $bbox[0];
                    $textX = ($width - $textWidth) / 2;
                    @imagettftext($canvas, $fontSize, 0, $textX, $height / 2 + 80, $accentColor, $fontPath, $text);
                    $fontUsed = true;
                }
            } catch (\Exception $e) {
                // Font failed, use fallback
            }
        }

        if (!$fontUsed) {
            // Fallback to built-in font
            $text = "centimet2.com";
            $textWidth = strlen($text) * imagefontwidth(5);
            $textX = ($width - $textWidth) / 2;
            imagestring($canvas, 5, $textX, $height / 2 + 50, $text, $accentColor);
        }

        ob_start();
        imagejpeg($canvas, null, 90);
        $imageData = ob_get_clean();

        imagedestroy($canvas);

        // Upload placeholder to S3
        try {
            $key = "share-images/placeholder.jpg";
            $this->s3Client->putObject([
                'Bucket' => $this->bucket,
                'Key'    => $key,
                'Body'   => $imageData,
                'ContentType' => 'image/jpeg',
                'ACL'    => 'public-read',
                'CacheControl' => 'max-age=604800', // 7 days
            ]);

            $s3Url = $this->getPublicUrl($key);
            Cache::put($cacheKey, $s3Url, now()->addDays(7));

            Log::info('[ShareImage] Placeholder uploaded to S3', ['url' => $s3Url]);

            return redirect($s3Url);

        } catch (\Exception $e) {
            Log::error('[ShareImage] Failed to upload placeholder to S3', [
                'error' => $e->getMessage(),
            ]);

            // Fallback: return image directly
            return response($imageData, 200)
                ->header('Content-Type', 'image/jpeg')
                ->header('Cache-Control', 'public, max-age=3600');
        }
    }

    /**
     * Generate placeholder image and return directly (for Facebook crawler compatibility)
     *
     * @return Response
     */
    private function generatePlaceholderDirect()
    {
        // Check cache for placeholder data (stored as base64 to avoid binary storage issues)
        $cacheKey = "share_image_placeholder_data_b64";
        $cachedBase64 = Cache::get($cacheKey);

        if ($cachedBase64) {
            $imageData = base64_decode($cachedBase64);
            return response($imageData, 200)
                ->header('Content-Type', 'image/jpeg')
                ->header('Cache-Control', 'public, max-age=86400')
                ->header('X-Content-Type-Options', 'nosniff');
        }

        // Check if GD library is available
        if (!function_exists('imagecreatetruecolor')) {
            Log::warning('[ShareImage] GD library not available, using static placeholder');
            // Return a static placeholder or redirect to a default image
            $staticPlaceholder = public_path('images/og-placeholder.jpg');
            if (file_exists($staticPlaceholder)) {
                $imageData = file_get_contents($staticPlaceholder);
                return response($imageData, 200)
                    ->header('Content-Type', 'image/jpeg')
                    ->header('Cache-Control', 'public, max-age=86400')
                    ->header('X-Content-Type-Options', 'nosniff');
            }
            // If no static placeholder, return 1x1 transparent pixel
            $pixel = base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
            return response($pixel, 200)
                ->header('Content-Type', 'image/gif')
                ->header('Cache-Control', 'public, max-age=86400');
        }

        $width = 1200;
        $height = 630;

        $canvas = imagecreatetruecolor($width, $height);
        $bgColor = imagecolorallocate($canvas, 50, 50, 60);
        $accentColor = imagecolorallocate($canvas, 255, 102, 0);

        imagefill($canvas, 0, 0, $bgColor);

        // Add logo if exists
        $logoPath = public_path('logo/cm2-logo.png');
        if (file_exists($logoPath)) {
            $logo = @imagecreatefrompng($logoPath);
            if ($logo) {
                $logoWidth = 150;
                $logoHeight = 150;
                $logoResized = imagecreatetruecolor($logoWidth, $logoHeight);
                imagesavealpha($logoResized, true);
                $transparent = imagecolorallocatealpha($logoResized, 0, 0, 0, 127);
                imagefill($logoResized, 0, 0, $transparent);

                imagecopyresampled(
                    $logoResized, $logo,
                    0, 0, 0, 0,
                    $logoWidth, $logoHeight, imagesx($logo), imagesy($logo)
                );

                $logoX = ($width - $logoWidth) / 2;
                $logoY = ($height - $logoHeight) / 2 - 50;
                imagecopy($canvas, $logoResized, $logoX, $logoY, 0, 0, $logoWidth, $logoHeight);
                imagedestroy($logo);
                imagedestroy($logoResized);
            }
        }

        // Draw site name
        $fontPath = public_path('fonts/Inter-Bold.ttf');
        $fontUsed = false;
        if (file_exists($fontPath) && is_readable($fontPath)) {
            try {
                $text = "centimet2.com";
                $fontSize = 36;
                $bbox = @imagettfbbox($fontSize, 0, $fontPath, $text);
                if ($bbox !== false) {
                    $textWidth = $bbox[2] - $bbox[0];
                    $textX = ($width - $textWidth) / 2;
                    @imagettftext($canvas, $fontSize, 0, $textX, $height / 2 + 80, $accentColor, $fontPath, $text);
                    $fontUsed = true;
                }
            } catch (\Exception $e) {
                // Font failed, use fallback
            }
        }

        if (!$fontUsed) {
            // Fallback to built-in font
            $text = "centimet2.com";
            $textWidth = strlen($text) * imagefontwidth(5);
            $textX = ($width - $textWidth) / 2;
            imagestring($canvas, 5, $textX, $height / 2 + 50, $text, $accentColor);
        }

        ob_start();
        imagejpeg($canvas, null, 90);
        $imageData = ob_get_clean();

        imagedestroy($canvas);

        // Cache the placeholder data as base64 for 7 days (MySQL can't store raw binary)
        Cache::put($cacheKey, base64_encode($imageData), now()->addDays(7));

        // Also upload to S3 in background (non-blocking)
        try {
            $key = "share-images/placeholder.jpg";
            $this->s3Client->putObject([
                'Bucket' => $this->bucket,
                'Key'    => $key,
                'Body'   => $imageData,
                'ContentType' => 'image/jpeg',
                'ACL'    => 'public-read',
                'CacheControl' => 'max-age=604800',
            ]);
        } catch (\Exception $e) {
            // Ignore S3 upload errors for placeholder
        }

        return response($imageData, 200)
            ->header('Content-Type', 'image/jpeg')
            ->header('Cache-Control', 'public, max-age=86400')
            ->header('X-Content-Type-Options', 'nosniff');
    }
}
