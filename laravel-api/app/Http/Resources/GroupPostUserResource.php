<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GroupPostUserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * Lightweight user resource for use in post/comment responses
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        if (!$this->resource) {
            return [];
        }

        return [
            'id' => $this->ID,
            'name' => $this->display_name,
            'username' => $this->user_login,
            'avatar' => $this->avatar,
            'avatar_url' => $this->avatar ? url('storage/avatars/' . $this->avatar) : null,
            'role' => $this->role,
        ];
    }
}
