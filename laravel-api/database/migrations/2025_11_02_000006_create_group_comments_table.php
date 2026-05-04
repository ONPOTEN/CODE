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
        Schema::create('group_comments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('post_id')->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->longText('comment_content');
            $table->enum('status', ['approved', 'pending', 'spam', 'trash'])->default('approved');
            $table->unsignedBigInteger('parent_id')->nullable()->index();
            $table->timestamps();

            // Foreign keys
            $table->foreign('post_id')->references('id')->on('group_posts')->onDelete('cascade');
            $table->foreign('user_id')->references('ID')->on('wp_users')->onDelete('cascade');
            $table->foreign('parent_id')->references('id')->on('group_comments')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_comments');
    }
};
