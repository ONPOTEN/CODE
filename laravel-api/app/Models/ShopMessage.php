<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
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
}
