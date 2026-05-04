<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShopPostResource extends JsonResource
{
    /**
     * Convert image path to full S3 URL if needed
     */
    private function getImageUrl(?string $imagePath): ?string
    {
        if (!$imagePath) {
            return null;
        }

        // If already a full URL, return as is
        if (str_starts_with($imagePath, 'http://') || str_starts_with($imagePath, 'https://')) {
            return $imagePath;
        }

        // Convert relative path to S3 URL
        // Path format: shopid/year/month/day/filename
        // S3 full path: shop_posts/shopid/year/month/day/filename
        $fullPath = 'shop_posts/' . $imagePath;
        $s3Url = \Storage::disk('s3')->url($fullPath);

        // If URL generation failed or returned null, construct manually
        if (!$s3Url || $s3Url === $fullPath) {
            // Manual URL construction from S3 config
            $endpoint = env('AWS_ENDPOINT') ?? env('AWS_URL');
            $bucket = env('AWS_BUCKET');

            if ($endpoint && $bucket) {
                // Handle both path-style and virtual-hosted-style URLs
                $usePathStyle = env('AWS_USE_PATH_STYLE_ENDPOINT', false);

                if ($usePathStyle) {
                    // Path-style: https://endpoint.com/bucket/key
                    $s3Url = rtrim($endpoint, '/') . '/' . $bucket . '/' . ltrim($fullPath, '/');
                } else {
                    // Virtual-hosted-style: https://bucket.endpoint.com/key
                    $s3Url = 'https://' . $bucket . '.' . preg_replace('#^https?://#', '', $endpoint) . '/' . ltrim($fullPath, '/');
                }
            }
        }

        return $s3Url;
    }

    /**
     * Convert video path to full S3 URL if needed
     */
    private function getVideoUrl(?string $videoPath): ?string
    {
        if (!$videoPath) {
            return null;
        }

        // If already a full URL, return as is
        if (str_starts_with($videoPath, 'http://') || str_starts_with($videoPath, 'https://')) {
            return $videoPath;
        }

        // Convert relative path to S3 URL
        // Path format: shopid/year/month/day/filename
        // S3 full path: shop_videos/shopid/year/month/day/filename
        $fullPath = 'shop_videos/' . $videoPath;
        $s3Url = \Storage::disk('s3')->url($fullPath);

        // If URL generation failed or returned null, construct manually
        if (!$s3Url || $s3Url === $fullPath) {
            // Manual URL construction from S3 config
            $endpoint = env('AWS_ENDPOINT') ?? env('AWS_URL');
            $bucket = env('AWS_BUCKET');

            if ($endpoint && $bucket) {
                // Handle both path-style and virtual-hosted-style URLs
                $usePathStyle = env('AWS_USE_PATH_STYLE_ENDPOINT', false);

                if ($usePathStyle) {
                    // Path-style: https://endpoint.com/bucket/key
                    $s3Url = rtrim($endpoint, '/') . '/' . $bucket . '/' . ltrim($fullPath, '/');
                } else {
                    // Virtual-hosted-style: https://bucket.endpoint.com/key
                    $s3Url = 'https://' . $bucket . '.' . preg_replace('#^https?://#', '', $endpoint) . '/' . ltrim($fullPath, '/');
                }
            }
        }

        return $s3Url;
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Convert relative image paths to full S3 URLs
        $featuredImages = $this->featured_images ?? [];
        $fullImageUrls = array_map(fn($imagePath) => $this->getImageUrl($imagePath), $featuredImages);

        // Convert main_image to full S3 URL if present
        $mainImageUrl = $this->main_image ? $this->getImageUrl($this->main_image) : null;

        // Convert other_images array to full S3 URLs if present
        $otherImages = $this->other_images ?? [];
        $fullOtherImageUrls = array_map(fn($imagePath) => $this->getImageUrl($imagePath), $otherImages);

        // Convert video path to full S3 URL if present
        $videoUrl = $this->video ? $this->getVideoUrl($this->video) : null;

        return [
            'id' => $this->id,
            'shop_id' => $this->shop_id,
            'user_id' => $this->user_id,
            'category_id' => $this->category_id,
            'title' => $this->title,
            'slug' => $this->slug,
            'content' => $this->content,
            'price_range' => $this->price_range,
            'type' => $this->type,
            'status' => $this->status,
            'featured_images' => $fullImageUrls,
            'view_count' => $this->view_count,
            // Product-specific fields for variant/simple/download products
            'product_type' => $this->product_type,
            'price' => $this->price,
            'sale_price' => $this->sale_price,
            'short_description' => $this->short_description,
            'detail_description' => $this->detail_description,
            'categories' => $this->categories,
            'attributes' => $this->attributes,
            'download_files' => $this->download_files,
            'link_files' => $this->link_files,
            'main_image' => $mainImageUrl,
            'other_images' => $fullOtherImageUrls,
            'video' => $videoUrl,
            'video_upload_status' => $this->video_upload_status,
            'video_upload_error' => $this->video_upload_error,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'shop' => new ShopResource($this->whenLoaded('shop')),
            'author' => new UserResource($this->whenLoaded('author')),
            'category' => $this->whenLoaded('category', function () {
                return $this->category ? [
                    'id' => $this->category->id,
                    'name' => $this->category->name,
                    'slug' => $this->category->slug,
                ] : null;
            }),
        ];
    }
}
