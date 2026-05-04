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
        Schema::table('wp_users', function (Blueprint $table) {
            if (!Schema::hasColumn('wp_users', 'firebase_uid')) {
                $table->string('firebase_uid')->nullable()->unique();
            }
            if (!Schema::hasColumn('wp_users', 'auth_method')) {
                $table->string('auth_method')->nullable();
            }
            if (!Schema::hasColumn('wp_users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable();
            }
            if (!Schema::hasColumn('wp_users', 'email_verified_at')) {
                $table->timestamp('email_verified_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wp_users', function (Blueprint $table) {
            $table->dropColumnIfExists(['firebase_uid', 'auth_method', 'last_login_at', 'email_verified_at']);
        });
    }
};
