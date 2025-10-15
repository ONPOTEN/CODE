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
        \DB::statement("ALTER TABLE wp_users ADD COLUMN email_public TINYINT(1) DEFAULT 1 NOT NULL");
        \DB::statement("ALTER TABLE wp_users ADD COLUMN hobby_public TINYINT(1) DEFAULT 1 NOT NULL");
        \DB::statement("ALTER TABLE wp_users ADD COLUMN company_public TINYINT(1) DEFAULT 1 NOT NULL");
        \DB::statement("ALTER TABLE wp_users ADD COLUMN location_public TINYINT(1) DEFAULT 1 NOT NULL");
        \DB::statement("ALTER TABLE wp_users ADD COLUMN phone_public TINYINT(1) DEFAULT 1 NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \DB::statement("SET SESSION sql_mode = ''");
        \DB::statement("ALTER TABLE wp_users DROP COLUMN email_public");
        \DB::statement("ALTER TABLE wp_users DROP COLUMN hobby_public");
        \DB::statement("ALTER TABLE wp_users DROP COLUMN company_public");
        \DB::statement("ALTER TABLE wp_users DROP COLUMN location_public");
        \DB::statement("ALTER TABLE wp_users DROP COLUMN phone_public");
    }
};
