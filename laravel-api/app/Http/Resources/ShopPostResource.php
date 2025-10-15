<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShopPostResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Convert relative image paths to full URLs
        $featuredImages = $this->featured_images ?? [];
        $fullImageUrls = array_map(function ($imagePath) {
            // If already a full URL, return as is
            if (str_starts_with($imagePath, 'http://') || str_starts_with($imagePath, 'https://')) {
                return $imagePath;
            }
            // Convert relative path to full URL
            // Path format: shopid/year/month/day/filename
            return url('storage/shop_posts/' . $imagePath);
        }, $featuredImages);

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
