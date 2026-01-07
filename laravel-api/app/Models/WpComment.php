<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WpComment extends Model
{
    protected $table = 'wp_comments';
    protected $primaryKey = 'comment_ID';
    public $timestamps = false;

    protected $fillable = [
        'comment_post_ID',
        'comment_author',
        'comment_author_email',
        'comment_author_url',
        'comment_author_IP',
        'comment_date',
        'comment_date_gmt',
        'comment_content',
        'image',
        'comment_karma',
        'comment_approved',
        'comment_agent',
        'comment_type',
        'comment_parent',
        'user_id',
    ];

    protected $casts = [
        'comment_date' => 'datetime',
        'comment_date_gmt' => 'datetime',
        'comment_karma' => 'integer',
        'comment_parent' => 'integer',
        'user_id' => 'integer',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(WpPost::class, 'comment_post_ID', 'ID');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'user_id', 'ID');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'user_id', 'ID');
    }

    public function scopeApproved($query)
    {
        return $query->where('comment_approved', '1');
    }
}
