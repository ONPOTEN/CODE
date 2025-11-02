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
        Schema::create('groups', function (Blueprint $table) {
            $table->id('group_id');
            $table->string('group_name');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('group_owner_id')->index();
            $table->enum('status', ['active', 'inactive', 'banned'])->default('active');
            $table->enum('visibility', ['public', 'private'])->default('public');
            $table->string('avatar')->nullable();
            $table->string('cover_image')->nullable();
            $table->timestamps();

            $table->foreign('group_owner_id')->references('ID')->on('wp_users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('groups');
    }
};
