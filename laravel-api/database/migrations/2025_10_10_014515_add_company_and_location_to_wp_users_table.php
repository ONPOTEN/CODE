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
        \DB::statement("SET SESSION sql_mode = ''");
        \DB::statement('ALTER TABLE wp_users ADD COLUMN company VARCHAR(255) NULL');
        \DB::statement('ALTER TABLE wp_users ADD COLUMN location VARCHAR(255) NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wp_users', function (Blueprint $table) {
            $table->dropColumn(['company', 'location']);
        });
    }
};
