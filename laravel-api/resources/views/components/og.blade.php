<meta property="og:title" content="{{ $title }}">
<meta property="og:description" content="{{ $description }}">
<meta property="og:image" content="{{ $image }}">
<meta property="og:url" content="{{ $url }}">
<meta property="og:type" content="{{ $type ?? 'article' }}"/>
<meta property="og:site_name" content="Centimet2"/>

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ $title }}">
<meta name="twitter:description" content="{{ $description }}">
<meta name="twitter:image" content="{{ $image }}">
@if(isset($author))
<meta name="twitter:creator" content="{{ $author }}">
@endif

@if(isset($publishedTime))
<meta property="article:published_time" content="{{ $publishedTime }}">
@endif
@if(isset($modifiedTime))
<meta property="article:modified_time" content="{{ $modifiedTime }}">
@endif
@if(isset($section))
<meta property="article:section" content="{{ $section }}">
@endif
