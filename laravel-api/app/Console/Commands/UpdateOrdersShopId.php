<?php

namespace App\Console\Commands;

use App\Models\OrderItem;
use App\Models\PurchaseOrder;
use App\Models\ShopPost;
use Illuminate\Console\Command;

class UpdateOrdersShopId extends Command
{
    protected $signature = 'orders:update-shop-id';
    protected $description = 'Update existing orders with shop_id from their items';

    public function handle()
    {
        $orders = PurchaseOrder::whereNull('shop_id')->get();
        $updated = 0;

        foreach ($orders as $order) {
            $firstItem = OrderItem::where('purchase_order_id', $order->id)->first();

            if ($firstItem) {
                $product = ShopPost::find($firstItem->shop_post_id);
                if ($product && $product->shop_id) {
                    $order->update(['shop_id' => $product->shop_id]);
                    $updated++;
                    $this->line("Updated order #{$order->id} with shop_id {$product->shop_id}");
                }
            }
        }

        $this->info("Updated $updated orders with shop_id");
    }
}
