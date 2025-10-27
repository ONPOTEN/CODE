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
        // Use raw SQL with proper ALTER syntax for MySQL with strict mode
        $tableName = 'wp_posts';

        // Check if column already exists
        if (!Schema::hasColumn($tableName, 'wall_id')) {
            // Disable strict mode temporarily if needed
            $sqlMode = DB::selectOne("SELECT @@sql_mode as sql_mode");
            if ($sqlMode) {
                DB::statement("SET sql_mode=''");
            }

            try {
                // Add column without DEFAULT clause that might cause issues
                DB::statement("ALTER TABLE `{$tableName}` ADD COLUMN `wall_id` BIGINT UNSIGNED");

                // Add index for faster queries
                DB::statement("CREATE INDEX `idx_wall_id` ON `{$tableName}` (`wall_id`)");
            } finally {
                // Restore original sql_mode if it was set
                if ($sqlMode && $sqlMode->sql_mode) {
                    DB::statement("SET sql_mode='{$sqlMode->sql_mode}'");
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Use raw SQL for better compatibility
        $tableName = 'wp_posts';

        // Check if column exists before dropping
        if (Schema::hasColumn($tableName, 'wall_id')) {
            DB::statement("ALTER TABLE `{$tableName}` DROP INDEX IF EXISTS `idx_wall_id`");
            DB::statement("ALTER TABLE `{$tableName}` DROP COLUMN `wall_id`");
        }
    }
};
