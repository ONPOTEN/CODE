<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\PurchaseOrder;
use App\Models\OrderItem;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing purchase orders with shop_id from their items
        $orders = PurchaseOrder::whereNull('shop_id')->get();

        foreach ($orders as $order) {
            // Get the shop_id from the first item
            $firstItem = OrderItem::where('purchase_order_id', $order->id)->first();

            if ($firstItem) {
                $product = \App\Models\ShopPost::find($firstItem->shop_post_id);
                if ($product && $product->shop_id) {
                    $order->update(['shop_id' => $product->shop_id]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration only updates data, no schema changes
    }
};
