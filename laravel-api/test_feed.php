<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\ShopPost;

// Test the query
$posts = ShopPost::with(['shop', 'author'])
    ->whereHas('shop', function ($q) {
        $q->where('status', 'active');
    })
    ->where('status', 'published')
    ->where('type', 'post')
    ->latest()
    ->take(10)
    ->get();

echo 'Found ' . $posts->count() . ' posts' . PHP_EOL;
foreach ($posts as $post) {
    echo '- ID: ' . $post->id . ', Title: ' . $post->title . ', Shop: ' . ($post->shop ? $post->shop->name : 'N/A') . PHP_EOL;
}
