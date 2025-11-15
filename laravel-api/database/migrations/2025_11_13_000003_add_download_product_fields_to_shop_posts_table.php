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
            // Download product specific fields
            $table->json('download_files')->nullable()->after('detail_description');
            $table->json('link_files')->nullable()->after('download_files');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shop_posts', function (Blueprint $table) {
            $table->dropColumn([
                'download_files',
                'link_files',
            ]);
        });
    }
};
