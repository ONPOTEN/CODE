<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class MessageReaction extends Model
{
    protected $fillable = [
        'reactable_id',
        'reactable_type',
        'user_id',
        'emoji',
    ];

    /**
     * Get the parent reactable model (Message or ShopMessage).
     */
    public function reactable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the user who reacted.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'user_id', 'ID');
    }
}
