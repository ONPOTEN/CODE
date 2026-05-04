<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Second step: Update the enum to include 'approved', 'inactive' and remove 'active'
     */
    public function up(): void
    {
        Schema::table('group_users', function (Blueprint $table) {
            // Change the enum to include 'approved', 'inactive', and remove 'active'
            $table->enum('status', ['approved', 'pending', 'banned', 'inactive'])
                ->default('approved')
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('group_users', function (Blueprint $table) {
            // Revert to original enum
            $table->enum('status', ['active', 'pending', 'banned'])
                ->default('active')
                ->change();
        });
    }
};
