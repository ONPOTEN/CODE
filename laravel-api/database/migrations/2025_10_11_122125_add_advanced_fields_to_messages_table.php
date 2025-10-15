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
        Schema::table('messages', function (Blueprint $table) {
            // Message type: text, image, file, system, video, audio
            $table->string('type', 20)->default('text')->after('message');

            // Message status: sent, delivered, read, failed
            $table->string('status', 20)->default('sent')->after('type');

            // For file/image messages - store file path
            $table->string('file_path')->nullable()->after('status');
            $table->string('file_name')->nullable()->after('file_path');
            $table->string('file_type')->nullable()->after('file_name'); // mime type
            $table->bigInteger('file_size')->nullable()->after('file_type'); // bytes

            // Reply functionality
            $table->foreignId('reply_to_message_id')->nullable()->after('sender_id');

            // Edit tracking
            $table->boolean('is_edited')->default(false)->after('is_read');
            $table->timestamp('edited_at')->nullable()->after('is_edited');

            // Soft deletes for message history
            $table->softDeletes();

            // Delivered and read timestamps
            $table->timestamp('delivered_at')->nullable()->after('is_read');
            $table->timestamp('read_at')->nullable()->after('delivered_at');

            // Add indexes for better query performance
            $table->index('type');
            $table->index('status');
            $table->index('reply_to_message_id');
            $table->index('deleted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['type']);
            $table->dropIndex(['status']);
            $table->dropIndex(['reply_to_message_id']);
            $table->dropIndex(['deleted_at']);

            $table->dropSoftDeletes();
            $table->dropColumn([
                'type',
                'status',
                'file_path',
                'file_name',
                'file_type',
                'file_size',
                'reply_to_message_id',
                'is_edited',
                'edited_at',
                'delivered_at',
                'read_at'
            ]);
        });
    }
};
