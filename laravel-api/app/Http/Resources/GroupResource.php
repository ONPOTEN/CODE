<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GroupResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'group_id' => $this->group_id,
            'group_name' => $this->group_name,
            'description' => $this->description,
            'group_owner_id' => $this->group_owner_id,
            'owner' => new UserResource($this->whenLoaded('owner')),
            'status' => $this->status,
            'visibility' => $this->visibility,
            'requires_approval' => $this->requires_approval,
            'requires_approval_posts' => $this->requires_approval_posts,
            'avatar' => $this->avatar,
            'cover_image' => $this->cover_image,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'posts_count' => $this->whenLoaded('posts', fn () => $this->posts->count()),
            'members_count' => $this->whenLoaded('members', fn () => $this->members->count()),
        ];
    }
}
