<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\WpUser;

// Simulate the request
$phone = '+840867631313';

echo "=== Testing byPhoneQuery Endpoint Manually ===\n";
echo "Phone input: $phone\n";

// Use the model's findByPhone helper which handles normalization
$user = WpUser::findByPhone($phone);

if (!$user) {
    echo "Result: User not found\n";
} else {
    echo "Result: User found!\n";
    echo "User ID: {$user->ID}\n";
    echo "User Login: {$user->user_login}\n";
    echo "User Email: {$user->user_email}\n";
    echo "Phone: {$user->phone}\n";
    echo "Firebase UID: {$user->firebase_uid}\n";
}
