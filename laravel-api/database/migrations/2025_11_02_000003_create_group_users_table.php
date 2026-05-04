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
        Schema::create('group_users', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('group_id')->index();
            $table->unsignedBigInteger('group_user_id')->index();
            $table->enum('group_role', ['admin', 'moderator', 'user'])->default('user');
            $table->enum('status', ['active', 'pending', 'banned'])->default('active');
            $table->timestamps();

            // Foreign keys
            $table->foreign('group_id')->references('group_id')->on('groups')->onDelete('cascade');
            $table->foreign('group_user_id')->references('ID')->on('wp_users')->onDelete('cascade');

            // Unique constraint: one membership per user per group
            $table->unique(['group_id', 'group_user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_users');
    }
};
