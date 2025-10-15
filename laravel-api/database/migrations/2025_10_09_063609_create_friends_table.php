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
        Schema::create('friends', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('friend_id');
            $table->enum('status', ['pending', 'accepted', 'blocked'])->default('pending');
            $table->timestamps();

            // Foreign keys to wp_users table
            $table->foreign('user_id')->references('ID')->on('wp_users')->onDelete('cascade');
            $table->foreign('friend_id')->references('ID')->on('wp_users')->onDelete('cascade');

            // Ensure unique friendship combinations
            $table->unique(['user_id', 'friend_id']);

            // Add indexes for faster queries
            $table->index(['user_id', 'status']);
            $table->index(['friend_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('friends');
    }
};
