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
        if (!Schema::hasColumn('group_comments', 'image')) {
            Schema::table('group_comments', function (Blueprint $table) {
                $table->string('image', 255)->nullable()->after('comment_content');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('group_comments', 'image')) {
            Schema::table('group_comments', function (Blueprint $table) {
                $table->dropColumn('image');
            });
        }
    }
};
