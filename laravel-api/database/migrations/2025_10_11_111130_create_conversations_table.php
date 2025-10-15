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
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user1_id'); // First participant
            $table->unsignedBigInteger('user2_id'); // Second participant
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('user1_id')->references('ID')->on('wp_users')->onDelete('cascade');
            $table->foreign('user2_id')->references('ID')->on('wp_users')->onDelete('cascade');

            // Ensure unique conversation between two users
            $table->unique(['user1_id', 'user2_id']);

            // Index for faster queries
            $table->index('last_message_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
