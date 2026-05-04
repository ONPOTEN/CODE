<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShopResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
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
        // First try using Storage::disk URL generation
        $s3Url = \Storage::disk('s3')->url($imagePath);

        // If URL generation failed or returned null, construct manually
        if (!$s3Url || $s3Url === $imagePath) {
            // Manual URL construction from S3 config
            $endpoint = env('AWS_ENDPOINT') ?? env('AWS_URL');
            $bucket = env('AWS_BUCKET');

            if ($endpoint && $bucket) {
                // Handle both path-style and virtual-hosted-style URLs
                $usePathStyle = env('AWS_USE_PATH_STYLE_ENDPOINT', false);

                if ($usePathStyle) {
                    // Path-style: https://endpoint.com/bucket/key
                    $s3Url = rtrim($endpoint, '/') . '/' . $bucket . '/' . ltrim($imagePath, '/');
                } else {
                    // Virtual-hosted-style: https://bucket.endpoint.com/key
                    $s3Url = 'https://' . $bucket . '.' . preg_replace('#^https?://#', '', $endpoint) . '/' . ltrim($imagePath, '/');
                }
            }
        }

        return $s3Url;
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'logo' => $this->getImageUrl($this->logo),
            'banner' => $this->getImageUrl($this->banner),
            'image_1' => $this->getImageUrl($this->image_1),
            'image_2' => $this->getImageUrl($this->image_2),
            'image_3' => $this->getImageUrl($this->image_3),
            'image_4' => $this->getImageUrl($this->image_4),
            'image_5' => $this->getImageUrl($this->image_5),
            'address' => $this->address,
            'city' => $this->city,
            'state' => $this->state,
            'country' => $this->country,
            'postal_code' => $this->postal_code,
            'phone' => $this->phone,
            'email' => $this->email,
            'website' => $this->website,
            'status' => $this->status,
            'owner' => new UserResource($this->whenLoaded('owner')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
