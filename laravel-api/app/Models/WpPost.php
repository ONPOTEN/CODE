<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WpPost extends Model
{
    protected $table = 'wp_posts';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'post_author',
        'post_date',
        'post_date_gmt',
        'post_content',
        'post_title',
        'post_excerpt',
        'post_status',
        'comment_status',
        'ping_status',
        'post_password',
        'post_name',
        'to_ping',
        'pinged',
        'post_modified',
        'post_modified_gmt',
        'post_content_filtered',
        'post_parent',
        'guid',
        'menu_order',
        'post_type',
        'post_mime_type',
        'comment_count',
        'visibility',
        'wall_id',
    ];

    protected $casts = [
        'post_date' => 'datetime',
        'post_date_gmt' => 'datetime',
        'post_modified' => 'datetime',
        'post_modified_gmt' => 'datetime',
        'post_parent' => 'integer',
        'menu_order' => 'integer',
        'comment_count' => 'integer',
        'wall_id' => 'integer',
    ];

    const CREATED_AT = 'post_date';
    const UPDATED_AT = 'post_modified';

    public function author(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'post_author', 'ID');
    }

    public function meta(): HasMany
    {
        return $this->hasMany(WpPostMeta::class, 'post_id', 'ID');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(WpComment::class, 'comment_post_ID', 'ID');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(Like::class, 'post_id', 'ID');
    }

    public function dislikes(): HasMany
    {
        return $this->hasMany(Dislike::class, 'post_id', 'ID');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(Share::class, 'post_id', 'ID');
    }

    public function shareWalls(): HasMany
    {
        return $this->hasMany(ShareWall::class, 'post_id', 'ID');
    }

    public function scopePublished($query)
    {
        return $query->where('post_status', 'publish');
    }

    public function scopeOfType($query, $type)
    {
        return $query->where('post_type', $type);
    }
}
