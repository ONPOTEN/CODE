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
        Schema::create('message_reactions', function (Blueprint $table) {
            $table->id();
            $table->morphs('reactable'); // reactable_id, reactable_type
            $table->unsignedBigInteger('user_id');
            $table->string('emoji');
            $table->timestamps();

            // A user can only react once per message (Zalo style)
            $table->unique(['reactable_id', 'reactable_type', 'user_id']);
            
            // Index for faster access
            $table->index(['reactable_id', 'reactable_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('message_reactions');
    }
};
