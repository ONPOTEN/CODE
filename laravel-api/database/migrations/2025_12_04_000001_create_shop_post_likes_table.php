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
        Schema::create('shop_post_likes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('post_id')->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->timestamps();

            // Foreign keys
            $table->foreign('post_id')->references('id')->on('shop_posts')->onDelete('cascade');
            $table->foreign('user_id')->references('ID')->on('wp_users')->onDelete('cascade');

            // Unique constraint: one like per user per post
            $table->unique(['post_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shop_post_likes');
    }
};
