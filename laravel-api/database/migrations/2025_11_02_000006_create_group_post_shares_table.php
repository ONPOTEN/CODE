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
        Schema::create('group_post_shares', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('post_id')->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('shared_via')->default('direct'); // direct, facebook, twitter, whatsapp, linkedin, email
            $table->timestamps();

            // Foreign keys
            $table->foreign('post_id')->references('id')->on('group_posts')->onDelete('cascade');
            $table->foreign('user_id')->references('ID')->on('wp_users')->onDelete('cascade');

            // Index for efficient querying
            $table->index(['post_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_post_shares');
    }
};
