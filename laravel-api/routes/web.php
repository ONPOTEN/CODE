<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ShareImageController;
use App\Http\Controllers\SharePageController;

Route::get('/', function () {
    return view('welcome');
});

// Share Image Routes (public, no auth required)
Route::get('/share-image/{postId}', [ShareImageController::class, 'generate'])
    ->where('postId', '[0-9]+')
    ->name('share-image.generate');

// Shop Post Share Image Route (specific for shop posts)
Route::get('/share-image/shop-post/{postId}', [ShareImageController::class, 'generateShopPost'])
    ->where('postId', '[0-9]+')
    ->name('share-image.shop-post');

// Share Page Routes with OG meta tags (for social media crawlers)
Route::get('/share/posts/{id}', [SharePageController::class, 'post'])
    ->where('id', '[0-9]+')
    ->name('share.post');

Route::get('/share/group-posts/{id}', [SharePageController::class, 'groupPost'])
    ->where('id', '[0-9]+')
    ->name('share.group-post');

Route::get('/share/shops/{shopId}/posts/{postId}', [SharePageController::class, 'shopPost'])
    ->where(['shopId' => '[0-9]+', 'postId' => '[0-9]+'])
    ->name('share.shop-post');

// Debug endpoint for ShopPost images
Route::get('/debug/shop-post/{postId}', [ShareImageController::class, 'debugShopPost'])
    ->where('postId', '[0-9]+')
    ->name('debug.shop-post');
