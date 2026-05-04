<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if column already exists (may have been added manually)
        if (!Schema::hasColumn('wp_users', 'facebook_id')) {
            // Disable strict mode temporarily to avoid issues with existing columns
            DB::statement("SET sql_mode = ''");
            DB::statement('ALTER TABLE wp_users ADD COLUMN facebook_id VARCHAR(255) NULL');
            DB::statement('ALTER TABLE wp_users ADD INDEX idx_facebook_id (facebook_id)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('wp_users', 'facebook_id')) {
            DB::statement("SET sql_mode = ''");
            DB::statement('ALTER TABLE wp_users DROP INDEX idx_facebook_id');
            DB::statement('ALTER TABLE wp_users DROP COLUMN facebook_id');
        }
    }
};
