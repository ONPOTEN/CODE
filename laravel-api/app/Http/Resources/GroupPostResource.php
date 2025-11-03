<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GroupPostResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        try {
            // Get all meta values
            $metaValues = $this->meta ? $this->meta->pluck('meta_value', 'meta_key')->toArray() : [];

            return [
                'id' => $this->id,
                'group_id' => $this->group_id,
                'group' => new GroupResource($this->whenLoaded('group')),
                'post_author' => $this->post_author,
                'author' => new UserResource($this->whenLoaded('author')),
                'post_date' => $this->post_date,
                'post_date_gmt' => $this->post_date_gmt,
                'post_modified' => $this->post_modified,
                'post_modified_gmt' => $this->post_modified_gmt,
                'post_title' => $this->post_title,
                'post_content' => $this->post_content,
                'post_excerpt' => $this->post_excerpt,
                'post_status' => $this->post_status,
                'post_type' => $this->post_type,
                'post_mime_type' => $this->post_mime_type,
                'comment_status' => $this->comment_status,
                'ping_status' => $this->ping_status,
                'comment_count' => $this->comment_count,
                'visibility' => $this->visibility,
                'featured_image' => $this->getFeaturedImage(),
                'images' => $this->getImages(),
                'likes_count' => $this->getLikesCount(),
                'dislikes_count' => $this->getDislikesCount(),
                'comments_count' => $this->getCommentsCount(),
                'meta' => $metaValues,
            ];
        } catch (\Exception $e) {
            \Log::error('[GroupPostResource::toArray] Failed to transform post', [
                'post_id' => $this->id ?? null,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Get featured image with absolute URL from S3
     */
    protected function getFeaturedImage()
    {
        $featuredImagePath = $this->meta()
            ->where('meta_key', 'featured_image')
            ->first()?->meta_value;

        if (!$featuredImagePath) {
            return null;
        }

        return \Storage::disk('s3')->url($featuredImagePath);
    }

    /**
     * Get gallery images with absolute URLs from S3
     */
    protected function getImages()
    {
        try {
            return $this->meta()
                ->where('meta_key', 'image')
                ->pluck('meta_value')
                ->map(fn($path) => \Storage::disk('s3')->url($path))
                ->toArray();
        } catch (\Exception $e) {
            \Log::warning('[GroupPostResource::getImages] Failed to get images', [
                'post_id' => $this->id,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    /**
     * Get likes count
     */
    protected function getLikesCount()
    {
        try {
            return \App\Models\GroupPostLike::where('post_id', $this->id)->count();
        } catch (\Exception $e) {
            \Log::warning('[GroupPostResource::getLikesCount] Failed to get likes count', [
                'post_id' => $this->id,
                'error' => $e->getMessage(),
            ]);
            return 0;
        }
    }

    /**
     * Get dislikes count
     */
    protected function getDislikesCount()
    {
        try {
            return \App\Models\GroupPostDislike::where('post_id', $this->id)->count();
        } catch (\Exception $e) {
            \Log::warning('[GroupPostResource::getDislikesCount] Failed to get dislikes count', [
                'post_id' => $this->id,
                'error' => $e->getMessage(),
            ]);
            return 0;
        }
    }

    /**
     * Get comments count
     */
    protected function getCommentsCount()
    {
        try {
            return \App\Models\GroupComment::where('post_id', $this->id)->count();
        } catch (\Exception $e) {
            \Log::warning('[GroupPostResource::getCommentsCount] Failed to get comments count', [
                'post_id' => $this->id,
                'error' => $e->getMessage(),
            ]);
            return 0;
        }
    }
}
