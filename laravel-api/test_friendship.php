<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Friend;
use App\Models\WpUser;

// Check the friendship between user 667 and 625
$userId1 = 667;
$userId2 = 625;

echo "Checking friendship between user $userId1 and $userId2\n";
echo "---------------------------------------------------\n";

// Direct query
$friendship = Friend::where(function ($query) use ($userId1, $userId2) {
    $query->where('user_id', $userId1)
          ->where('friend_id', $userId2);
})->orWhere(function ($query) use ($userId1, $userId2) {
    $query->where('user_id', $userId2)
          ->where('friend_id', $userId1);
})->first();

if ($friendship) {
    echo "Friendship found!\n";
    echo "  - ID: {$friendship->id}\n";
    echo "  - User ID: {$friendship->user_id}\n";
    echo "  - Friend ID: {$friendship->friend_id}\n";
    echo "  - Status: {$friendship->status}\n";
    echo "  - Created at: {$friendship->created_at}\n";
} else {
    echo "No friendship found between these users\n";
}

echo "\n\nAll friendships involving user 667:\n";
$allFriendships = Friend::where('user_id', 667)->orWhere('friend_id', 667)->get();
foreach ($allFriendships as $f) {
    echo "  - ID: {$f->id}, user_id: {$f->user_id}, friend_id: {$f->friend_id}, status: {$f->status}\n";
}

echo "\n\nAll friendships involving user 625:\n";
$allFriendships = Friend::where('user_id', 625)->orWhere('friend_id', 625)->get();
foreach ($allFriendships as $f) {
    echo "  - ID: {$f->id}, user_id: {$f->user_id}, friend_id: {$f->friend_id}, status: {$f->status}\n";
}
