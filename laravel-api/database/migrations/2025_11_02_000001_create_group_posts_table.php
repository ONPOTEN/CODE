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
        Schema::create('group_posts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('group_id')->index();
            $table->unsignedBigInteger('post_author')->index();
            $table->dateTime('post_date')->useCurrent();
            $table->dateTime('post_date_gmt')->useCurrent();
            $table->longText('post_content');
            $table->string('post_title');
            $table->text('post_excerpt')->nullable();
            $table->enum('post_status', ['publish', 'draft', 'pending', 'trash'])->default('draft');
            $table->enum('comment_status', ['open', 'closed'])->default('closed');
            $table->enum('ping_status', ['open', 'closed'])->default('closed');
            $table->string('post_password')->nullable();
            $table->string('post_name')->nullable();
            $table->text('to_ping')->nullable();
            $table->text('pinged')->nullable();
            $table->dateTime('post_modified')->useCurrent();
            $table->dateTime('post_modified_gmt')->useCurrent();
            $table->text('post_content_filtered')->nullable();
            $table->unsignedBigInteger('post_parent')->default(0);
            $table->string('guid')->nullable();
            $table->integer('menu_order')->default(0);
            $table->string('post_type')->default('post');
            $table->string('post_mime_type')->nullable();
            $table->unsignedInteger('comment_count')->default(0);
            $table->string('visibility')->default('public');

            $table->foreign('group_id')->references('group_id')->on('groups')->onDelete('cascade');
            $table->foreign('post_author')->references('ID')->on('wp_users')->onDelete('cascade');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_posts');
    }
};
