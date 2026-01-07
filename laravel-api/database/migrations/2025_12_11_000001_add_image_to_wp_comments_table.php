<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if column already exists
        if (!Schema::hasColumn('wp_comments', 'image')) {
            // Temporarily disable strict mode to handle tables with invalid default values
            DB::statement("SET SESSION sql_mode = ''");

            // Add the image column
            DB::statement('ALTER TABLE wp_comments ADD COLUMN image VARCHAR(255) NULL AFTER comment_content');

            // Re-enable strict mode
            DB::statement("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('wp_comments', 'image')) {
            Schema::table('wp_comments', function (Blueprint $table) {
                $table->dropColumn('image');
            });
        }
    }
};
