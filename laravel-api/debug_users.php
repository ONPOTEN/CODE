<?php
// Quick debug script to check users
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\WpUser;

$users = WpUser::whereNotNull('firebase_uid')->get(['ID', 'user_login', 'user_email', 'phone', 'firebase_uid']);
echo "Users with Firebase UID:\n";
foreach($users as $u) {
    echo "ID: {$u->ID}, Login: {$u->user_login}, Email: {$u->user_email}, Phone: {$u->phone}, Firebase: {$u->firebase_uid}\n";
}
