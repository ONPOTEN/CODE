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
        Schema::table('shop_posts', function (Blueprint $table) {
            $table->enum('video_upload_status', ['pending', 'uploading', 'completed', 'failed'])
                ->default('pending')
                ->nullable()
                ->after('video');
            $table->text('video_upload_error')->nullable()->after('video_upload_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shop_posts', function (Blueprint $table) {
            $table->dropColumn(['video_upload_status', 'video_upload_error']);
        });
    }
};
