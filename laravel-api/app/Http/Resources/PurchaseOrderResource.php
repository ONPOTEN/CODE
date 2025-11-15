<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
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
            'order_number' => $this->order_number,
            'status' => $this->status,
            'user_id' => $this->user_id,
            'shop_id' => $this->shop_id,
            'subtotal' => (float) $this->subtotal,
            'tax' => (float) $this->tax,
            'shipping_fee' => (float) $this->shipping_fee,
            'discount' => (float) $this->discount,
            'total_amount' => (float) $this->total_amount,
            'notes' => $this->notes,
            'shipping_address' => $this->shipping_address,
            'billing_address' => $this->billing_address,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'customer' => $this->whenLoaded('customer') ? new UserResource($this->customer) : null,
            'shop' => $this->whenLoaded('shop') ? new ShopResource($this->shop) : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
