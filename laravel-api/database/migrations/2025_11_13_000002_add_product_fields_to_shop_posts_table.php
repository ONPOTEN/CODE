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
        Schema::table('shop_posts', function (Blueprint $table) {
            // Product pricing
            $table->decimal('price', 15, 2)->nullable()->after('price_range');
            $table->decimal('sale_price', 15, 2)->nullable()->after('price');

            // Product images
            $table->string('main_image')->nullable()->after('sale_price');
            $table->json('other_images')->nullable()->after('main_image');

            // Product details
            $table->json('categories')->nullable()->after('other_images');
            $table->text('short_description')->nullable()->after('categories');
            $table->longText('detail_description')->nullable()->after('short_description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shop_posts', function (Blueprint $table) {
            $table->dropColumn([
                'price',
                'sale_price',
                'main_image',
                'other_images',
                'categories',
                'short_description',
                'detail_description',
            ]);
        });
    }
};
