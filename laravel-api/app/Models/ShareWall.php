<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShareWall extends Model
{
    protected $fillable = ['user_id', 'post_id'];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'user_id', 'ID');
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(WpPost::class, 'post_id', 'ID');
    }
}
