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
        \DB::statement("ALTER TABLE wp_users ADD COLUMN role VARCHAR(50) DEFAULT 'user' NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \DB::statement("SET SESSION sql_mode = ''");
        \DB::statement("ALTER TABLE wp_users DROP COLUMN role");
    }
};
