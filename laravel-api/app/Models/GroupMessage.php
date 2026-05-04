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

    /**
     * Check if message contains embedded images
     */
    public function hasEmbeddedImages(): bool
    {
        return preg_match('/\[IMAGE\].*?\[\/IMAGE\]/s', $this->message) === 1;
    }

    /**
     * Get embedded image URLs from message
     */
    public function getEmbeddedImages(): array
    {
        $images = [];
        preg_match_all('/\[IMAGE\](.*?)\[\/IMAGE\]/s', $this->message, $matches);

        if (!empty($matches[1])) {
            $images = $matches[1];
        }

        return $images;
    }

    /**
     * Get message text without image markup
     */
    public function getTextContent(): string
    {
        return trim(preg_replace('/\[IMAGE\].*?\[\/IMAGE\]/s', '', $this->message));
    }

    /**
     * Get parsed message content with text and images separated
     */
    public function getParsedContent(): array
    {
        return [
            'text' => $this->getTextContent(),
            'images' => $this->getEmbeddedImages(),
            'has_images' => $this->hasEmbeddedImages(),
        ];
    }
}
