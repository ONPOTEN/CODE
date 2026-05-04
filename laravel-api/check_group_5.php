<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== Checking Database for Group 5 ===\n\n";

try {
    // Check if group 5 exists
    $group5 = \App\Models\Group::find(5);

    if ($group5) {
        echo "✓ Group 5 EXISTS: {$group5->group_name}\n";
        echo "  Owner ID: {$group5->group_owner_id}\n";
        echo "  Status: {$group5->status}\n";
    } else {
        echo "✗ Group 5 NOT FOUND\n\n";

        // Show all available groups
        echo "Available groups in database:\n";
        $groups = \App\Models\Group::all();

        if ($groups->count() === 0) {
            echo "  - NO GROUPS FOUND\n";
        } else {
            foreach ($groups as $g) {
                echo "  - ID: {$g->group_id}, Name: {$g->group_name}, Owner: {$g->group_owner_id}\n";
            }
        }

        echo "\n✓ Solution: Use one of the existing group IDs above\n";
        echo "✓ Or create a new group: https://centimet2.com:8088/groups\n";
    }

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
