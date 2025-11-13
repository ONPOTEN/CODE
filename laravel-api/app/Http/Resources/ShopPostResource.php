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
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Convert relative image paths to full S3 URLs
        $featuredImages = $this->featured_images ?? [];
        $fullImageUrls = array_map(fn($imagePath) => $this->getImageUrl($imagePath), $featuredImages);

        return [
            'id' => $this->id,
            'shop_id' => $this->shop_id,
            'user_id' => $this->user_id,
            'title' => $this->title,
            'slug' => $this->slug,
            'content' => $this->content,
            'price_range' => $this->price_range,
            'type' => $this->type,
            'status' => $this->status,
            'featured_images' => $fullImageUrls,
            'view_count' => $this->view_count,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'shop' => new ShopResource($this->whenLoaded('shop')),
            'author' => new UserResource($this->whenLoaded('author')),
        ];
    }
}
