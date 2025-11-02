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
            'images' => $this->meta()
                ->where('meta_key', 'image')
                ->pluck('meta_value')
                ->toArray(),
            'meta' => $this->meta()->pluck('meta_value', 'meta_key')->toArray(),
        ];
    }
}
