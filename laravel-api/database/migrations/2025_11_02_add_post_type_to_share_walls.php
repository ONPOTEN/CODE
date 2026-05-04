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
        Schema::table('share_walls', function (Blueprint $table) {
            // Add post_type field to distinguish between wp_posts and group_posts
            // Blank/null for WpPost, 'grouppost' for GroupPost
            $table->enum('post_type', ['grouppost'])->nullable()->after('post_id')->comment('Type of post: null for wppost, grouppost for group posts');

            // Add group_post_id to support GroupPost references
            $table->unsignedBigInteger('group_post_id')->nullable()->after('post_type')->comment('ID of group post if post_type is grouppost');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('share_walls', function (Blueprint $table) {
            $table->dropColumn('post_type');
            $table->dropColumn('group_post_id');
        });
    }
};
