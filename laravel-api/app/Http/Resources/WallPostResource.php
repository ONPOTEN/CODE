<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\GroupPostResource;

class WallPostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Determine post type and load appropriate resource
        $postType = $this->post_type;

        if ($postType === 'grouppost') {
            // GroupPost
            $postResource = new GroupPostResource($this->whenLoaded('groupPost'));
        } else {
            // WpPost (default)
            $postResource = new PostResource($this->whenLoaded('post'));
        }

        return [
            'id' => $this->id,
            'wall_id' => $this->user_id,
            'post_id' => $this->post_id,
            'group_post_id' => $this->group_post_id,
            'post_type' => $postType ?? 'wppost', // 'wppost' or 'grouppost'
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'post' => $postResource,
            'wall_owner' => new UserResource($this->whenLoaded('user')),
            'moderator' => new UserResource($this->whenLoaded('moderator')),
            'moderated_at' => $this->moderated_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
