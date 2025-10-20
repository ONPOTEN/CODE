<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $userLiked = false;
        $userDisliked = false;

        if ($request->user()) {
            $userLiked = $this->likes()->where('user_id', $request->user()->ID)->exists();
            $userDisliked = $this->dislikes()->where('user_id', $request->user()->ID)->exists();
        }

        return [
            'id' => $this->ID,
            'title' => $this->post_title,
            'slug' => $this->post_name,
            'content' => $this->post_content,
            'excerpt' => $this->post_excerpt,
            'status' => $this->post_status,
            'type' => $this->post_type,
            'visibility' => $this->visibility ?? 'public',
            'author' => new UserResource($this->whenLoaded('author')),
            'created_at' => $this->post_date?->toIso8601String(),
            'updated_at' => $this->post_modified?->toIso8601String(),
            'featured_image' => $this->getFeaturedImage(),
            'images' => $this->getPostImages(),
            'meta' => $this->when($request->input('include_meta'), function () {
                return $this->meta->pluck('meta_value', 'meta_key');
            }),
            'engagement' => [
                'likes' => [
                    'count' => $this->likes()->count(),
                    'user_liked' => $userLiked,
                ],
                'dislikes' => [
                    'count' => $this->dislikes()->count(),
                    'user_disliked' => $userDisliked,
                ],
                'comments' => [
                    'count' => $this->comment_count,
                ],
                'shares' => [
                    'count' => $this->shares()->count(),
                ],
            ],
            'comment_count' => $this->comment_count,
            'author_id' => $this->post_author,
        ];
    }

    protected function getFeaturedImage()
    {
        // Check for new storage path
        $thumbnailPath = $this->meta->where('meta_key', '_thumbnail_path')->first()?->meta_value;
        if ($thumbnailPath) {
            return asset('storage/' . $thumbnailPath);
        }

        // Fallback to WordPress attachment
        $thumbnailId = $this->meta->where('meta_key', '_thumbnail_id')->first()?->meta_value;
        if ($thumbnailId) {
            $attachment = $this->meta->where('meta_key', '_wp_attached_file')->first();
            return $attachment ? url('wp-content/uploads/' . $attachment->meta_value) : null;
        }
        return null;
    }

    protected function getPostImages()
    {
        $images = [];
        $imageMeta = $this->meta->filter(function ($meta) {
            return str_starts_with($meta->meta_key, '_post_image_');
        });

        foreach ($imageMeta as $meta) {
            $images[] = asset('storage/' . $meta->meta_value);
        }

        return $images;
    }
}
