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
            $table->enum('status', ['pending', 'accepted', 'rejected'])->default('pending')->comment('Moderation status of wall post');
            $table->text('rejection_reason')->nullable()->comment('Reason for rejecting the post');
            $table->foreignId('moderated_by')->nullable()->constrained('wp_users', 'ID')->nullableOnDelete()->comment('User who moderated this post');
            $table->timestamp('moderated_at')->nullable()->comment('When the post was moderated');
            $table->timestamps();

            // Ensure a post can only be shared to a user's wall once
            $table->unique(['user_id', 'post_id']);

            // Index for filtering by status
            $table->index('status');
            $table->index('user_id');
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
