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
        Schema::create('shop_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_id')->index();
            $table->unsignedBigInteger('sender_id')->index();
            $table->unsignedBigInteger('shop_owner_id')->index();
            $table->longText('message');
            $table->enum('status', ['sent', 'delivered', 'read'])->default('sent');
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('shop_id')
                ->references('id')
                ->on('shops')
                ->onDelete('cascade');

            $table->foreign('sender_id')
                ->references('ID')
                ->on('wp_users')
                ->onDelete('cascade');

            $table->foreign('shop_owner_id')
                ->references('ID')
                ->on('wp_users')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shop_messages');
    }
};
