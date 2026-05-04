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
        Schema::create('shop_payment_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_id');
            $table->string('bank_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('account_holder')->nullable();
            $table->string('upi_id')->nullable();
            $table->string('phone')->nullable();
            $table->longText('qr_code')->nullable(); // Store full QR code URL or base64 image
            $table->timestamps();

            // Foreign key constraint
            $table->foreign('shop_id')->references('id')->on('shops')->onDelete('cascade');

            // Unique constraint: one payment setting per shop
            $table->unique('shop_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shop_payment_settings');
    }
};
