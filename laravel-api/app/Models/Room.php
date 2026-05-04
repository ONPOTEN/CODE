<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Room extends Model
{
    use SoftDeletes;

    // Room type constants
    const TYPE_SHOP_MESSAGE = 'shop_message';
    const TYPE_GROUP_CHAT = 'group_chat';
    const TYPE_DIRECT_MESSAGE = 'direct_message';

    protected $fillable = [
        'room_name',
        'room_type',
        'shop_id',
        'customer_id',
        'shop_owner_id',
        'subject',
        'is_active',
        'message_count',
        'last_message_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'message_count' => 'integer',
        'last_message_at' => 'datetime',
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

    public function customer(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'customer_id', 'ID');
    }

    public function shopOwner(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'shop_owner_id', 'ID');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ShopMessage::class, 'room_id');
    }

    /**
     * Scopes
     */

    public function scopeForShop(Builder $query, int $shopId): Builder
    {
        return $query->where('shop_id', $shopId);
    }

    public function scopeForCustomer(Builder $query, int $customerId): Builder
    {
        return $query->where('customer_id', $customerId);
    }

    public function scopeForOwner(Builder $query, int $ownerId): Builder
    {
        return $query->where('shop_owner_id', $ownerId);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeShopMessage(Builder $query): Builder
    {
        return $query->where('room_type', self::TYPE_SHOP_MESSAGE);
    }

    public function scopeByRoomName(Builder $query, string $roomName): Builder
    {
        return $query->where('room_name', $roomName);
    }

    public function scopeLatestMessages(Builder $query): Builder
    {
        return $query->orderByDesc('last_message_at');
    }

    /**
     * Helper Methods
     */

    /**
     * Generate room name for shop messages: {customerId}-shop{shopId}
     */
    public static function generateShopMessageRoomName(int $customerId, int $shopId): string
    {
        return "{$customerId}-shop{$shopId}";
    }

    /**
     * Create or get a shop message room
     */
    public static function createOrGetShopMessageRoom(int $customerId, int $shopId, int $shopOwnerId, ?string $subject = null): self
    {
        $roomName = self::generateShopMessageRoomName($customerId, $shopId);

        return self::firstOrCreate(
            ['room_name' => $roomName],
            [
                'room_type' => self::TYPE_SHOP_MESSAGE,
                'shop_id' => $shopId,
                'customer_id' => $customerId,
                'shop_owner_id' => $shopOwnerId,
                'subject' => $subject,
                'is_active' => true,
            ]
        );
    }

    /**
     * Mark room as having a new message
     */
    public function recordMessage(): bool
    {
        return $this->update([
            'message_count' => $this->message_count + 1,
            'last_message_at' => now(),
        ]);
    }

    /**
     * Check if this is a shop message room
     */
    public function isShopMessageRoom(): bool
    {
        return $this->room_type === self::TYPE_SHOP_MESSAGE;
    }

    /**
     * Get all participants (customer and owner)
     */
    public function getParticipants(): array
    {
        return [
            'customer_id' => $this->customer_id,
            'shop_owner_id' => $this->shop_owner_id,
        ];
    }
}
