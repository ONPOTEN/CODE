<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== Checking User 1 Group Membership ===\n\n";

try {
    $user = \App\Models\WpUser::find(1);
    if (!$user) {
        echo "✗ User 1 not found\n";
        exit(1);
    }

    echo "✓ User: " . $user->user_login . " (ID: " . $user->ID . ")\n\n";

    // Check memberships via GroupUser
    echo "Group Memberships (via group_users table):\n";
    $memberships = \App\Models\GroupUser::where('group_user_id', 1)->get();

    if ($memberships->count() === 0) {
        echo "  - NO MEMBERSHIPS FOUND\n";
    } else {
        foreach ($memberships as $m) {
            $group = \App\Models\Group::find($m->group_id);
            if ($group) {
                echo "  - Group {$m->group_id}: {$group->group_name}\n";
            }
        }
    }

    // Check owned groups
    echo "\nGroups Owned:\n";
    $owned = \App\Models\Group::where('group_owner_id', 1)->get();

    if ($owned->count() === 0) {
        echo "  - NO OWNED GROUPS\n";
    } else {
        foreach ($owned as $g) {
            echo "  - Group {$g->group_id}: {$g->group_name}\n";
        }
    }

    // Show all groups and their members
    echo "\n=== All Groups in Database ===\n";
    $allGroups = \App\Models\Group::all();

    foreach ($allGroups as $g) {
        echo "\nGroup {$g->group_id}: {$g->group_name}\n";
        echo "  Owner: {$g->group_owner_id}\n";

        $members = \App\Models\GroupUser::where('group_id', $g->group_id)->get();
        echo "  Members: " . $members->count() . "\n";

        foreach ($members as $m) {
            $memberUser = \App\Models\WpUser::find($m->group_user_id);
            if ($memberUser) {
                echo "    - {$memberUser->user_login} (ID: {$memberUser->ID})\n";
            }
        }

        // Check message count
        $messageCount = \App\Models\GroupMessage::where('group_id', $g->group_id)->count();
        echo "  Messages: {$messageCount}\n";
    }

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
