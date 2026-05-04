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
            'is_pinned' => (bool)$this->is_pinned,
            'reactions' => $this->reactions ? $this->reactions->pluck('emoji')->unique()->values() : [],
            'reactions_count' => $this->reactions ? (int)$this->reactions->sum('count') : 0,
            'my_reaction' => $request->user() && $this->reactions ? $this->reactions->where('user_id', $request->user()->ID)->first()?->emoji : null,
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            // Relationships
            'shop' => new ShopResource($this->whenLoaded('shop')),
            'sender' => new UserResource($this->whenLoaded('sender')),
            'shop_owner' => new UserResource($this->whenLoaded('shopOwner')),
            'reply_to' => $this->replyTo ? [
                'id' => $this->replyTo->id,
                'message' => $this->replyTo->message,
                'sender_name' => $this->replyTo->sender?->display_name ?? $this->replyTo->sender?->user_login ?? 'User',
            ] : null,
        ];
    }
}
