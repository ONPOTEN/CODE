@extends('layouts.app')

@section('title', ($product->title ?? 'Sản phẩm') . ' - ' . ($product->shop->shop_name ?? 'Shop') . ' | Centimet2')

@section('meta')
    @include('components.og', [
        'title' => ($product->title ?? 'Sản phẩm') . ' - ' . ($product->shop->shop_name ?? 'Shop'),
        'description' => $product->price
            ? number_format($product->price, 0, ',', '.') . ' ' . ($product->currency ?? 'VND') . ' - ' . Str::limit(strip_tags($product->description ?? ''), 120)
            : Str::limit(strip_tags($product->description ?? ''), 150),
        'image' => $shareImageUrl ?? ($product->featured_image ?? (is_array($product->images) && count($product->images) > 0 ? (is_string($product->images[0]) ? $product->images[0] : $product->images[0]['url'] ?? '') : '') ?? config('app.url') . '/images/default-og.png'),
        'url' => config('app.frontend_url', 'https://centimet2.com') . '/shops/' . ($product->shop_id ?? $product->shop->id ?? 0) . '/posts/' . $product->id,
        'type' => 'product',
        'author' => $product->shop->shop_name ?? 'Centimet2 Shop',
        'publishedTime' => $product->created_at ?? null,
        'modifiedTime' => $product->updated_at ?? null,
        'section' => $product->shop->shop_name ?? 'Shop',
    ])
    @if($product->price)
    <meta property="product:price:amount" content="{{ $product->price }}">
    <meta property="product:price:currency" content="{{ $product->currency ?? 'VND' }}">
    @endif
    @if($product->shop)
    <meta property="product:retailer" content="{{ $product->shop->shop_name }}">
    @endif
@endsection

@section('content')
<script>
    // Redirect to Next.js frontend
    window.location.href = '{{ config('app.frontend_url', 'https://centimet2.com') }}/shops/{{ $product->shop_id ?? $product->shop->id ?? 0 }}/posts/{{ $product->id }}';
</script>
<noscript>
    <meta http-equiv="refresh" content="0;url={{ config('app.frontend_url', 'https://centimet2.com') }}/shops/{{ $product->shop_id ?? $product->shop->id ?? 0 }}/posts/{{ $product->id }}">
</noscript>
<div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">{{ $product->title ?? 'Sản phẩm' }}</h1>
        @if($product->shop)
        <p class="text-sm text-gray-500 mb-2">Shop: {{ $product->shop->shop_name }}</p>
        @endif
        @if($product->price)
        <p class="text-xl font-semibold text-green-600 mb-4">
            {{ number_format($product->price, 0, ',', '.') }} {{ $product->currency ?? 'VND' }}
        </p>
        @endif
        <p class="text-gray-600 mb-4">{{ Str::limit(strip_tags($product->description ?? ''), 200) }}</p>
        <a href="{{ config('app.frontend_url', 'https://centimet2.com') }}/shops/{{ $product->shop_id ?? $product->shop->id ?? 0 }}/posts/{{ $product->id }}"
           class="text-blue-600 hover:underline">
            Xem sản phẩm
        </a>
    </div>
</div>
@endsection
