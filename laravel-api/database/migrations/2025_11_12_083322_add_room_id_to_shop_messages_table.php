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
        Schema::table('shop_messages', function (Blueprint $table) {
            // Add room_id to link messages to rooms
            $table->unsignedBigInteger('room_id')->nullable()->after('shop_owner_id')->index();

            // Optional: Add foreign key if you want strict enforcement
            // $table->foreign('room_id')->references('id')->on('rooms')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shop_messages', function (Blueprint $table) {
            // Drop foreign key first if it exists
            // $table->dropForeign(['room_id']);
            $table->dropColumn('room_id');
        });
    }
};
