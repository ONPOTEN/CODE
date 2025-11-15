<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('purchase_order_id');
            $table->unsignedBigInteger('shop_post_id');
            $table->string('product_name');
            $table->enum('product_type', ['Đơn giản', 'Biến thể', 'Tải xuống'])->default('Đơn giản');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('subtotal', 12, 2);
            $table->json('variant_options')->nullable(); // For variant products
            $table->json('download_files')->nullable();  // For download products
            $table->json('link_files')->nullable();      // For download products
            $table->timestamps();

            // Foreign keys
            $table->foreign('purchase_order_id')
                ->references('id')
                ->on('purchase_orders')
                ->onDelete('cascade');

            $table->foreign('shop_post_id')
                ->references('id')
                ->on('shop_posts')
                ->onDelete('restrict');

            // Indexes
            $table->index('purchase_order_id');
            $table->index('shop_post_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
