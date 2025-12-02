<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupMessage extends Model
{
    protected $table = 'group_messages';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'group_id',
        'user_id',
        'message',
    ];

    protected $casts = [
        'group_id' => 'integer',
        'user_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class, 'group_id', 'group_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'user_id', 'ID');
    }
}
