<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WallPostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'wall_id' => $this->user_id,
            'post_id' => $this->post_id,
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'post' => new PostResource($this->whenLoaded('post')),
            'wall_owner' => new UserResource($this->whenLoaded('user')),
            'moderator' => new UserResource($this->whenLoaded('moderator')),
            'moderated_at' => $this->moderated_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
