<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupPostLike extends Model
{
    protected $table = 'group_post_likes';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'post_id',
        'user_id',
    ];

    protected $casts = [
        'post_id' => 'integer',
        'user_id' => 'integer',
    ];

    /**
     * Get the post that was liked
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(GroupPost::class, 'post_id', 'id');
    }

    /**
     * Get the user who liked
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'user_id', 'ID');
    }
}
