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
        Schema::create('group_postmeta', function (Blueprint $table) {
            $table->id('meta_id');
            $table->unsignedBigInteger('post_id')->index();
            $table->string('meta_key')->index();
            $table->longText('meta_value')->nullable();

            $table->foreign('post_id')->references('id')->on('group_posts')->onDelete('cascade');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_postmeta');
    }
};
