<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\WpPost;
use App\Models\WpUser;
use App\Models\GroupPost;
use App\Models\ShopPost;

class SharePageController extends Controller
{
    /**
     * Display share page for a post with OG meta tags
     */
    public function post($id)
    {
        $post = WpPost::with('author')->find($id);

        if (!$post) {
            abort(404, 'Bài viết không tìm thấy');
        }

        // Generate share image URL
        $shareImageUrl = config('app.url') . '/share-image/' . $post->ID;

        return view('share.post', [
            'post' => $post,
            'shareImageUrl' => $shareImageUrl,
        ]);
    }

    /**
     * Display share page for a group post with OG meta tags
     */
    public function groupPost($id)
    {
        $post = GroupPost::with(['author', 'group'])->find($id);

        if (!$post) {
            abort(404, 'Bài viết nhóm không tìm thấy');
        }

        // Generate share image URL
        $shareImageUrl = config('app.url') . '/share-image/' . $post->id;

        return view('share.group-post', [
            'post' => $post,
            'shareImageUrl' => $shareImageUrl,
        ]);
    }

    /**
     * Display share page for a shop post/product with OG meta tags
     */
    public function shopPost($shopId, $postId)
    {
        $product = ShopPost::with('shop')->find($postId);

        if (!$product) {
            abort(404, 'Sản phẩm không tìm thấy');
        }

        // Generate share image URL - use shop-post specific route
        $shareImageUrl = config('app.url') . '/share-image/shop-post/' . $product->id;

        return view('share.shop-post', [
            'product' => $product,
            'shareImageUrl' => $shareImageUrl,
        ]);
    }
}
