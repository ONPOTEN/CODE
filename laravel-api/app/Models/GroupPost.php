<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GroupPost extends Model
{
    protected $table = 'group_posts';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'group_id',
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
        'featured_image',
    ];

    protected $casts = [
        'post_date' => 'datetime',
        'post_date_gmt' => 'datetime',
        'post_modified' => 'datetime',
        'post_modified_gmt' => 'datetime',
        'post_parent' => 'integer',
        'menu_order' => 'integer',
        'comment_count' => 'integer',
        'group_id' => 'integer',
    ];

    const CREATED_AT = 'post_date';
    const UPDATED_AT = 'post_modified';

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class, 'group_id', 'group_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'post_author', 'ID');
    }

    public function meta(): HasMany
    {
        return $this->hasMany(GroupPostMeta::class, 'post_id', 'id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(GroupComment::class, 'post_id', 'id');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(GroupPostLike::class, 'post_id', 'id');
    }

    public function dislikes(): HasMany
    {
        return $this->hasMany(GroupPostDislike::class, 'post_id', 'id');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(GroupPostShare::class, 'post_id', 'id');
    }

    /**
     * Get likes count
     */
    public function getLikesCount(): int
    {
        return $this->likes()->count();
    }

    /**
     * Get dislikes count
     */
    public function getDislikesCount(): int
    {
        return $this->dislikes()->count();
    }

    /**
     * Get shares count
     */
    public function getSharesCount(): int
    {
        return $this->shares()->count();
    }

    /**
     * Get comments count
     */
    public function getCommentsCountAttribute(): int
    {
        return $this->comments()->count();
    }

    /**
     * Check if a user has liked this post
     */
    public function hasUserLiked($userId): bool
    {
        return $this->likes()
            ->where('user_id', $userId)
            ->exists();
    }

    /**
     * Check if a user has disliked this post
     */
    public function hasUserDisliked($userId): bool
    {
        return $this->dislikes()
            ->where('user_id', $userId)
            ->exists();
    }

    public function scopePublished($query)
    {
        return $query->where('post_status', 'publish');
    }

    public function scopeOfType($query, $type)
    {
        return $query->where('post_type', $type);
    }

    public function scopeInGroup($query, $groupId)
    {
        return $query->where('group_id', $groupId);
    }
}
