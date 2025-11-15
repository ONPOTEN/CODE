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
            // Add product_type column with enum values: Đơn giản, Biến thể, Tải xuống
            $table->enum('product_type', ['Đơn giản', 'Biến thể', 'Tải xuống'])->nullable()->after('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shop_posts', function (Blueprint $table) {
            $table->dropColumn('product_type');
        });
    }
};
