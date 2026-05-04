<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->comment_ID,
            'post_id' => $this->comment_post_ID,
            'content' => $this->comment_content,
            'image' => $this->image,
            'author' => new UserResource($this->whenLoaded('author')),
            'author_name' => $this->comment_author,
            'author_email' => $this->comment_author_email,
            'author_url' => $this->comment_author_url,
            'created_at' => $this->comment_date?->toIso8601String(),
            'updated_at' => $this->comment_date_gmt?->toIso8601String(),
            'approved' => (bool) $this->comment_approved,
            'parent_id' => $this->comment_parent,
            'user_id' => $this->user_id,
        ];
    }
}
