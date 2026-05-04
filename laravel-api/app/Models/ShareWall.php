<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShareWall extends Model
{
    protected $fillable = [
        'user_id',
        'post_id',
        'post_type',
        'group_post_id',
        'status',
        'rejection_reason',
        'moderated_by',
        'moderated_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'moderated_at' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_ACCEPTED = 'accepted';
    const STATUS_REJECTED = 'rejected';

    // Post type constants
    const POST_TYPE_WPPOST = null; // blank/null for WpPost
    const POST_TYPE_GROUPPOST = 'grouppost';

    public function user(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'user_id', 'ID');
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(WpPost::class, 'post_id', 'ID');
    }

    public function groupPost(): BelongsTo
    {
        return $this->belongsTo(GroupPost::class, 'group_post_id', 'id');
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'moderated_by', 'ID');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeAccepted($query)
    {
        return $query->where('status', self::STATUS_ACCEPTED);
    }

    public function scopeRejected($query)
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    public function scopeWpPost($query)
    {
        return $query->whereNull('post_type');
    }

    public function scopeGroupPost($query)
    {
        return $query->where('post_type', self::POST_TYPE_GROUPPOST);
    }
}
