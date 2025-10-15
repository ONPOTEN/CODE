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
        // Check if featured_images column doesn't exist yet
        if (!Schema::hasColumn('shop_posts', 'featured_images')) {
            Schema::table('shop_posts', function (Blueprint $table) {
                $table->json('featured_images')->nullable()->after('status');
            });
        }

        // Migrate existing featured_image data to featured_images array
        if (Schema::hasColumn('shop_posts', 'featured_image')) {
            DB::table('shop_posts')->whereNotNull('featured_image')->orderBy('id')->each(function ($post) {
                DB::table('shop_posts')
                    ->where('id', $post->id)
                    ->update(['featured_images' => json_encode([$post->featured_image])]);
            });

            Schema::table('shop_posts', function (Blueprint $table) {
                $table->dropColumn('featured_image');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shop_posts', function (Blueprint $table) {
            $table->string('featured_image')->nullable()->after('status');
        });

        // Migrate back: take first image from array
        DB::table('shop_posts')->whereNotNull('featured_images')->orderBy('id')->each(function ($post) {
            $images = json_decode($post->featured_images, true);
            if (is_array($images) && count($images) > 0) {
                DB::table('shop_posts')
                    ->where('id', $post->id)
                    ->update(['featured_image' => $images[0]]);
            }
        });

        Schema::table('shop_posts', function (Blueprint $table) {
            $table->dropColumn('featured_images');
        });
    }
};
