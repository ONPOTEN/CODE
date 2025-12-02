<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GroupMessageResource extends JsonResource
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
            'user_id' => $this->user_id,
            'message' => $this->message,
            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->ID,
                    'name' => $this->user->display_name,
                    'username' => $this->user->user_login,
                    'avatar' => $this->user->avatar,
                    'avatar_url' => $this->user->avatar,
                ];
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
