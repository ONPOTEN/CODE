<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * First step: Update existing 'active' status records to 'approved'
     */
    public function up(): void
    {
        // Update existing 'active' status to 'approved' in group_users table
        DB::table('group_users')->where('status', 'active')->update(['status' => 'approved']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert 'approved' status back to 'active' if migration is rolled back
        DB::table('group_users')->where('status', 'approved')->update(['status' => 'active']);
    }
};
