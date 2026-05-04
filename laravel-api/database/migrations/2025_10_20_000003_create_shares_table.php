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
        Schema::create('shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('wp_posts', 'ID')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('wp_users', 'ID')->cascadeOnDelete();
            $table->string('shared_via')->default('direct')->comment('direct, facebook, twitter, whatsapp, etc');
            $table->timestamps();

            // Index for finding shares by post and user
            $table->index(['post_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shares');
    }
};
