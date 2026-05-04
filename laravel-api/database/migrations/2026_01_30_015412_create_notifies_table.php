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
        Schema::create('notifies', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('userid')->nullable();
            $table->unsignedBigInteger('ownid')->nullable();
            $table->string('type');
            $table->string('posttype')->nullable();
            $table->unsignedBigInteger('postid')->nullable();
            $table->text('content')->nullable();
            $table->integer('status')->default(0);
            $table->timestamps();

            $table->index('userid');
            $table->index('ownid');
            $table->index('posttype');
            $table->index('postid');
            $table->index('type');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifies');
    }
};
