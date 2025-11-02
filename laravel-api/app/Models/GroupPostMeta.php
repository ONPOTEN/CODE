<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupPostMeta extends Model
{
    protected $table = 'group_postmeta';
    protected $primaryKey = 'meta_id';
    public $timestamps = false;

    protected $fillable = [
        'post_id',
        'meta_key',
        'meta_value',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(GroupPost::class, 'post_id', 'id');
    }
}
