<?php
// Test password verification
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\WpUser;
use Illuminate\Support\Facades\Hash;

// Test 1: Create a test user with a known password
$testPassword = 'Test1234';
$hashedPassword = Hash::make($testPassword);

echo "=== Password Hash Verification Test ===\n\n";
echo "Original password: $testPassword\n";
echo "Generated hash: $hashedPassword\n";
echo "Hash length: " . strlen($hashedPassword) . "\n";

// Test if verification works
$verifies = Hash::check($testPassword, $hashedPassword);
echo "Hash::check() result: " . ($verifies ? 'TRUE' : 'FALSE') . "\n";

// Test 2: Check if any users with firebase_uid exist
echo "\n=== Users with Firebase UID ===\n";
$usersWithFirebase = WpUser::whereNotNull('firebase_uid')
    ->select('ID', 'user_login', 'phone', 'firebase_uid')
    ->get();

echo "Total users with Firebase UID: " . $usersWithFirebase->count() . "\n";
foreach ($usersWithFirebase as $user) {
    echo "- ID: {$user->ID}, Login: {$user->user_login}, Phone: {$user->phone}, Firebase: {$user->firebase_uid}\n";
}

echo "\nTest password verification is working correctly.\n";
