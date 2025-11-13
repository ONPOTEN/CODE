<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ShopMessageResource extends JsonResource
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
            'shop_id' => $this->shop_id,
            'sender_id' => $this->sender_id,
            'shop_owner_id' => $this->shop_owner_id,
            'message' => $this->message,
            'status' => $this->status,
            'is_read' => $this->is_read,
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            // Relationships
            'shop' => new ShopResource($this->whenLoaded('shop')),
            'sender' => new UserResource($this->whenLoaded('sender')),
            'shop_owner' => new UserResource($this->whenLoaded('shopOwner')),
        ];
    }
}
