@extends('layouts.app')

@section('title', ($post->post_title ?? 'Bài viết nhóm') . ' - ' . ($post->group->group_name ?? 'Nhóm') . ' | Centimet2')

@section('meta')
    @include('components.og', [
        'title' => ($post->post_title ?? 'Bài viết nhóm') . ' - ' . ($post->group->group_name ?? 'Nhóm'),
        'description' => Str::limit(strip_tags($post->post_content ?? $post->post_excerpt ?? ''), 150),
        'image' => $shareImageUrl ?? ($post->images[0] ?? config('app.url') . '/images/default-og.png'),
        'url' => config('app.frontend_url', 'https://centimet2.com') . '/group-posts/' . $post->id,
        'type' => 'article',
        'author' => $post->author->display_name ?? $post->author->name ?? $post->author->username ?? 'Centimet2 User',
        'publishedTime' => $post->post_date ?? $post->created_at ?? null,
        'modifiedTime' => $post->post_modified ?? $post->updated_at ?? null,
        'section' => $post->group->group_name ?? 'Nhóm',
    ])
@endsection

@section('content')
<script>
    // Redirect to Next.js frontend
    window.location.href = '{{ config('app.frontend_url', 'https://centimet2.com') }}/group-posts/{{ $post->id }}';
</script>
<noscript>
    <meta http-equiv="refresh" content="0;url={{ config('app.frontend_url', 'https://centimet2.com') }}/group-posts/{{ $post->id }}">
</noscript>
<div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
        <h1 class="text-2xl font-bold mb-4">{{ $post->post_title ?? 'Bài viết nhóm' }}</h1>
        @if($post->group)
        <p class="text-sm text-gray-500 mb-2">Nhóm: {{ $post->group->group_name }}</p>
        @endif
        <p class="text-gray-600 mb-4">{{ Str::limit(strip_tags($post->post_content ?? $post->post_excerpt ?? ''), 200) }}</p>
        <a href="{{ config('app.frontend_url', 'https://centimet2.com') }}/group-posts/{{ $post->id }}"
           class="text-blue-600 hover:underline">
            Xem bài viết
        </a>
    </div>
</div>
@endsection
