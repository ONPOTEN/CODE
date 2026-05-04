<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\WpUser;

// Find the user
$user = WpUser::find(627);

if (!$user) {
    echo "User not found!\n";
    exit(1);
}

echo "User found!\n";
echo "ID: {$user->ID}\n";
echo "Login: {$user->user_login}\n";
echo "Email: {$user->user_email}\n";
echo "Phone (raw): |{$user->phone}|\n";
echo "Phone (length): " . strlen($user->phone) . "\n";
echo "Phone (hex): " . bin2hex($user->phone) . "\n";
echo "Phone (ord values): ";
for ($i = 0; $i < strlen($user->phone); $i++) {
    echo ord($user->phone[$i]) . " ";
}
echo "\n";
echo "Firebase UID: {$user->firebase_uid}\n";

// Test findByPhone
echo "\n=== Testing WpUser::findByPhone() ===\n";
$found = WpUser::findByPhone('+840867631313');
echo "Found by phone '+840867631313': " . ($found ? "YES (ID: {$found->ID})" : "NO") . "\n";

// Also try without +
$found2 = WpUser::findByPhone('840867631313');
echo "Found by phone '840867631313': " . ($found2 ? "YES (ID: {$found2->ID})" : "NO") . "\n";

// Direct database query
echo "\n=== Direct Database Queries ===\n";
$directQuery = WpUser::where('phone', '+840867631313')->first();
echo "Direct where phone = '+840867631313': " . ($directQuery ? "FOUND" : "NOT FOUND") . "\n";

$allUsers = WpUser::all(['ID', 'user_login', 'phone'])->take(10);
echo "\nFirst 10 users in database:\n";
foreach ($allUsers as $u) {
    echo "- ID: {$u->ID}, Login: {$u->user_login}, Phone: |{$u->phone}|\n";
}
