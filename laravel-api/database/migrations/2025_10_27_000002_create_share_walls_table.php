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
        Schema::create('share_walls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('wp_users', 'ID')->cascadeOnDelete();
            $table->foreignId('post_id')->constrained('wp_posts', 'ID')->cascadeOnDelete();
            $table->timestamps();

            // Ensure a post can only be shared to a user's wall once
            $table->unique(['user_id', 'post_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('share_walls');
    }
};
