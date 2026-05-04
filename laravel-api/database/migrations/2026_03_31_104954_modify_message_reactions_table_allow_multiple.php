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
        Schema::table('message_reactions', function (Blueprint $table) {
            // Remove unique constraint if it exists (might fail if doesn't)
            try {
                $table->dropUnique('message_reactions_reactable_id_reactable_type_user_id_unique');
            } catch (\Exception $e) {}

            $table->unsignedInteger('count')->default(1)->after('emoji');
            
            // New unique across emoji too, allowing multiple counts per user per emoji
            $table->unique(['reactable_id', 'reactable_type', 'user_id', 'emoji'], 'reactions_user_emoji_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('message_reactions', function (Blueprint $table) {
            $table->dropUnique('reactions_user_emoji_unique');
            $table->dropColumn('count');
            $table->unique(['reactable_id', 'reactable_type', 'user_id']);
        });
    }
};
