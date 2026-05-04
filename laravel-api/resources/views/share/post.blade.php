@extends('layouts.app')

@section('title', ($post->post_title ?? 'Bài viết') . ' | Centimet2')

@section('meta')
    @include('components.og', [
        'title' => $post->post_title ?? 'Bài viết',
        'description' => Str::limit(strip_tags($post->post_content ?? $post->post_excerpt ?? ''), 150),
        'image' => $shareImageUrl ?? config('app.url') . '/images/default-og.png',
        'url' => config('app.frontend_url', 'https://centimet2.com') . '/posts/' . $post->ID,
        'type' => 'article',
        'author' => $post->author->display_name ?? $post->author->user_nicename ?? 'Centimet2 User',
        'publishedTime' => $post->post_date ?? null,
        'modifiedTime' => $post->post_modified ?? null,
    ])
@endsection

@section('content')
<script>
    // Redirect to Next.js frontend
    window.location.href = '{{ config('app.frontend_url', 'https://centimet2.com') }}/posts/{{ $post->ID }}';
</script>
<noscript>
    <meta http-equiv="refresh" content="0;url={{ config('app.frontend_url', 'https://centimet2.com') }}/posts/{{ $post->ID }}">
</noscript>
<div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">{{ $post->post_title ?? 'Bài viết' }}</h1>
        <p class="text-gray-600 mb-4">{{ Str::limit(strip_tags($post->post_content ?? $post->post_excerpt ?? ''), 200) }}</p>
        <a href="{{ config('app.frontend_url', 'https://centimet2.com') }}/posts/{{ $post->ID }}"
           class="text-blue-600 hover:underline">
            Xem bài viết
        </a>
    </div>
</div>
@endsection
