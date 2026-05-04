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
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();

            // Room identification
            $table->string('room_name')->unique()->index();  // e.g., "656-shop1" (customerId-shop{shopId})
            $table->enum('room_type', ['shop_message', 'group_chat', 'direct_message'])->default('shop_message');

            // Shop message relationships
            $table->unsignedBigInteger('shop_id')->nullable()->index();  // Which shop this room is for
            $table->unsignedBigInteger('customer_id')->nullable()->index();  // Customer/sender ID (from wp_users)
            $table->unsignedBigInteger('shop_owner_id')->nullable()->index();  // Shop owner ID (from wp_users)

            // Room metadata
            $table->string('subject')->nullable();  // Optional subject/topic
            $table->boolean('is_active')->default(true)->index();
            $table->integer('message_count')->default(0);  // Track message count for quick stats
            $table->timestamp('last_message_at')->nullable();  // When last message was sent

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys (optional - only if you want strict enforcement)
            // $table->foreign('shop_id')->references('id')->on('shops')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
