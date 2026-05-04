<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class ShopMessage extends Model
{
    use SoftDeletes;

    // Status constants
    const STATUS_SENT = 'sent';
    const STATUS_DELIVERED = 'delivered';
    const STATUS_READ = 'read';

    protected $fillable = [
        'shop_id',
        'sender_id',
        'shop_owner_id',
        'room_id',
        'message',
        'status',
        'is_read',
        'read_at',
        'is_pinned',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'is_pinned' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relationships
     */

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'sender_id', 'ID');
    }

    public function shopOwner(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'shop_owner_id', 'ID');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(ShopMessage::class, 'reply_to_message_id');
    }

    /**
     * Get all of the message's reactions.
     */
    public function reactions(): MorphMany
    {
        return $this->morphMany(MessageReaction::class, 'reactable');
    }

    /**
     * Scopes
     */

    public function scopeForShop(Builder $query, int $shopId): Builder
    {
        return $query->where('shop_id', $shopId);
    }

    public function scopeFromSender(Builder $query, int $senderId): Builder
    {
        return $query->where('sender_id', $senderId);
    }

    public function scopeForOwner(Builder $query, int $ownerId): Builder
    {
        return $query->where('shop_owner_id', $ownerId);
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->where('is_read', false);
    }

    public function scopeRead(Builder $query): Builder
    {
        return $query->where('is_read', true);
    }

    public function scopeLatestFirst(Builder $query): Builder
    {
        return $query->orderBy('created_at', 'desc');
    }

    public function scopeOldestFirst(Builder $query): Builder
    {
        return $query->orderBy('created_at', 'asc');
    }

    /**
     * Helper Methods
     */

    public function markAsRead(): bool
    {
        if ($this->is_read) {
            return true;
        }

        return $this->update([
            'is_read' => true,
            'status' => self::STATUS_READ,
            'read_at' => now(),
        ]);
    }

    public function markAsDelivered(): bool
    {
        if ($this->status === self::STATUS_DELIVERED || $this->status === self::STATUS_READ) {
            return true;
        }

        return $this->update([
            'status' => self::STATUS_DELIVERED,
        ]);
    }

    public function isRead(): bool
    {
        return $this->is_read;
    }

    public function isSent(): bool
    {
        return $this->status === self::STATUS_SENT;
    }

    public function isDelivered(): bool
    {
        return $this->status === self::STATUS_DELIVERED || $this->status === self::STATUS_READ;
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
