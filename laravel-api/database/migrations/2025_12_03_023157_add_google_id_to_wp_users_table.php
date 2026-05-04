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
        // Temporarily disable strict mode to handle existing table structure issues
        \DB::statement("SET SESSION sql_mode = ''");

        // Use raw SQL to avoid issues with existing table structure
        \DB::statement('ALTER TABLE wp_users ADD COLUMN google_id VARCHAR(255) NULL');
        \DB::statement('CREATE INDEX wp_users_google_id_index ON wp_users(google_id)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \DB::statement('DROP INDEX wp_users_google_id_index ON wp_users');
        \DB::statement('ALTER TABLE wp_users DROP COLUMN google_id');
    }
};
