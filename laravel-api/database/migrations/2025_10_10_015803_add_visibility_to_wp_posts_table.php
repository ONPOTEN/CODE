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
        \DB::statement("ALTER TABLE wp_posts ADD COLUMN visibility VARCHAR(20) DEFAULT 'public' NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wp_posts', function (Blueprint $table) {
            $table->dropColumn('visibility');
        });
    }
};
