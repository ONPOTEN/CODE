<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopPost extends Model
{
    protected $fillable = [
        'shop_id',
        'user_id',
        'title',
        'slug',
        'content',
        'price_range',
        'type',
        'status',
        'featured_images',
        'view_count',
    ];

    protected $casts = [
        'view_count' => 'integer',
        'featured_images' => 'array',
    ];

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'user_id', 'ID');
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopePosts($query)
    {
        return $query->where('type', 'post');
    }

    public function scopePages($query)
    {
        return $query->where('type', 'page');
    }
}
