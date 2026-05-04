<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Message extends Model
{
    use SoftDeletes;

    // Message types constants
    const TYPE_TEXT = 'text';
    const TYPE_IMAGE = 'image';
    const TYPE_FILE = 'file';
    const TYPE_VIDEO = 'video';
    const TYPE_AUDIO = 'audio';
    const TYPE_SYSTEM = 'system';

    // Message status constants
    const STATUS_SENT = 'sent';
    const STATUS_DELIVERED = 'delivered';
    const STATUS_READ = 'read';
    const STATUS_FAILED = 'failed';

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'reply_to_message_id',
        'message',
        'type',
        'status',
        'file_path',
        'file_name',
        'file_type',
        'file_size',
        'is_read',
        'is_edited',
        'edited_at',
        'delivered_at',
        'read_at',
        'is_pinned',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'is_edited' => 'boolean',
        'edited_at' => 'datetime',
        'delivered_at' => 'datetime',
        'read_at' => 'datetime',
        'is_pinned' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $appends = [
        'is_file_message',
        'formatted_file_size',
    ];

    /**
     * Relationships
     */

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'sender_id', 'ID');
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reply_to_message_id');
    }

    public function replies()
    {
        return $this->hasMany(Message::class, 'reply_to_message_id');
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

    public function scopeUnread(Builder $query): Builder
    {
        return $query->where('is_read', false);
    }

    public function scopeRead(Builder $query): Builder
    {
        return $query->where('is_read', true);
    }

    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    public function scopeTextMessages(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_TEXT);
    }

    public function scopeFileMessages(Builder $query): Builder
    {
        return $query->whereIn('type', [
            self::TYPE_IMAGE,
            self::TYPE_FILE,
            self::TYPE_VIDEO,
            self::TYPE_AUDIO
        ]);
    }

    public function scopeForConversation(Builder $query, int $conversationId): Builder
    {
        return $query->where('conversation_id', $conversationId);
    }

    public function scopeFromSender(Builder $query, int $senderId): Builder
    {
        return $query->where('sender_id', $senderId);
    }

    public function scopeLatestFirst(Builder $query): Builder
    {
        return $query->orderBy('created_at', 'desc');
    }

    public function scopeOldestFirst(Builder $query): Builder
    {
        return $query->orderBy('created_at', 'asc');
    }

    public function scopeSearchByContent(Builder $query, string $search): Builder
    {
        return $query->where('message', 'like', "%{$search}%");
    }

    /**
     * Accessors
     */

    public function getIsFileMessageAttribute(): bool
    {
        return in_array($this->type, [
            self::TYPE_IMAGE,
            self::TYPE_FILE,
            self::TYPE_VIDEO,
            self::TYPE_AUDIO
        ]);
    }

    public function getFormattedFileSizeAttribute(): ?string
    {
        if (!$this->file_size) {
            return null;
        }

        $units = ['B', 'KB', 'MB', 'GB'];
        $size = $this->file_size;
        $unitIndex = 0;

        while ($size >= 1024 && $unitIndex < count($units) - 1) {
            $size /= 1024;
            $unitIndex++;
        }

        return round($size, 2) . ' ' . $units[$unitIndex];
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
            'delivered_at' => now(),
        ]);
    }

    public function markAsFailed(): bool
    {
        return $this->update([
            'status' => self::STATUS_FAILED,
        ]);
    }

    public function isTextMessage(): bool
    {
        return $this->type === self::TYPE_TEXT;
    }

    public function isImageMessage(): bool
    {
        return $this->type === self::TYPE_IMAGE;
    }

    public function isFileMessage(): bool
    {
        return $this->type === self::TYPE_FILE;
    }

    public function isVideoMessage(): bool
    {
        return $this->type === self::TYPE_VIDEO;
    }

    public function isAudioMessage(): bool
    {
        return $this->type === self::TYPE_AUDIO;
    }

    public function isSystemMessage(): bool
    {
        return $this->type === self::TYPE_SYSTEM;
    }

    public function hasFile(): bool
    {
        return !empty($this->file_path);
    }

    public function isEdited(): bool
    {
        return $this->is_edited;
    }

    public function isReply(): bool
    {
        return !empty($this->reply_to_message_id);
    }

    public function getFileUrl(): ?string
    {
        if (!$this->file_path) {
            return null;
        }

        return asset('storage/' . $this->file_path);
    }

    /**
     * Update message content and mark as edited
     */
    public function updateContent(string $newMessage): bool
    {
        return $this->update([
            'message' => $newMessage,
            'is_edited' => true,
            'edited_at' => now(),
        ]);
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
