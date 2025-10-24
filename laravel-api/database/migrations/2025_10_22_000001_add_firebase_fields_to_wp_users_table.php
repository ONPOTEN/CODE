<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Temporarily disable strict mode to allow table alterations
        DB::statement("SET sql_mode=''");

        // Check if columns don't already exist
        $columns = DB::select("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='wp_users' AND TABLE_SCHEMA=DATABASE()");
        $columnNames = array_map(fn($col) => $col->COLUMN_NAME, $columns);

        if (!in_array('firebase_uid', $columnNames)) {
            DB::statement("ALTER TABLE wp_users ADD firebase_uid VARCHAR(255) NULL UNIQUE");
        }

        if (!in_array('auth_method', $columnNames)) {
            DB::statement("ALTER TABLE wp_users ADD auth_method VARCHAR(50) NULL");
        }

        if (!in_array('last_login_at', $columnNames)) {
            DB::statement("ALTER TABLE wp_users ADD last_login_at DATETIME NULL");
        }

        if (!in_array('email_verified_at', $columnNames)) {
            DB::statement("ALTER TABLE wp_users ADD email_verified_at DATETIME NULL");
        }

        // Re-enable strict mode
        DB::statement("SET sql_mode='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Temporarily disable strict mode
        DB::statement("SET sql_mode=''");

        // Drop columns in reverse order
        DB::statement("ALTER TABLE wp_users DROP COLUMN IF EXISTS email_verified_at");
        DB::statement("ALTER TABLE wp_users DROP COLUMN IF EXISTS last_login_at");
        DB::statement("ALTER TABLE wp_users DROP COLUMN IF EXISTS auth_method");
        DB::statement("ALTER TABLE wp_users DROP COLUMN IF EXISTS firebase_uid");

        // Re-enable strict mode
        DB::statement("SET sql_mode='STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
    }
};
