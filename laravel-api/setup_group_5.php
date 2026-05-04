<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== Setting up Group 5 ===\n\n";

try {
    // Check if group 5 already exists
    $group = \App\Models\Group::find(5);

    if ($group) {
        echo "✓ Group 5 already exists: {$group->group_name}\n";
    } else {
        echo "✗ Group 5 not found, creating...\n\n";

        // Create group 5 with user 1 as owner
        $group = \App\Models\Group::create([
            'group_id' => 5,
            'group_name' => 'Test Group 5',
            'group_owner_id' => 1,
            'status' => 'active',
        ]);

        echo "✓ Group 5 created successfully\n";
        echo "  ID: {$group->group_id}\n";
        echo "  Name: {$group->group_name}\n";
        echo "  Owner: {$group->group_owner_id}\n";
        echo "  Status: {$group->status}\n\n";
    }

    // Verify user 1 exists
    $user = \App\Models\WpUser::find(1);
    if ($user) {
        echo "✓ User 1 exists: {$user->user_login}\n";
    } else {
        echo "✗ User 1 not found\n";
        exit(1);
    }

    // Add user 1 as member of group 5 if not already
    $membership = \App\Models\GroupUser::where('group_id', 5)
        ->where('group_user_id', 1)
        ->first();

    if ($membership) {
        echo "✓ User 1 is already a member of group 5\n";
    } else {
        echo "✗ User 1 not a member, adding...\n";

        \App\Models\GroupUser::create([
            'group_id' => 5,
            'group_user_id' => 1,
            'role' => 'member',
        ]);

        echo "✓ User 1 added as member of group 5\n";
    }

    echo "\n=== Group 5 Setup Complete ===\n";
    echo "You can now test chat at: https://centimet2.com:8088/groups/chat/5\n";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
