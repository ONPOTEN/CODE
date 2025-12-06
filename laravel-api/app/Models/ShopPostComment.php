<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShopPostComment extends Model
{
    protected $table = 'shop_post_comments';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'post_id',
        'user_id',
        'parent_id',
        'content',
        'status',
    ];

    protected $casts = [
        'post_id' => 'integer',
        'user_id' => 'integer',
        'parent_id' => 'integer',
    ];

    /**
     * Get the post that was commented on
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(ShopPost::class, 'post_id', 'id');
    }

    /**
     * Get the user who commented
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'user_id', 'ID');
    }

    /**
     * Get the parent comment (for replies)
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(ShopPostComment::class, 'parent_id', 'id');
    }

    /**
     * Get the replies to this comment
     */
    public function replies(): HasMany
    {
        return $this->hasMany(ShopPostComment::class, 'parent_id', 'id');
    }

    /**
     * Scope for approved comments only
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope for top-level comments (no parent)
     */
    public function scopeTopLevel($query)
    {
        return $query->whereNull('parent_id');
    }
}
