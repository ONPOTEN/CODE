<?php

namespace App\Repositories;

use App\Models\Message;
use App\Models\Conversation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class MessageRepository
{
    /**
     * Create a new text message
     */
    public function createTextMessage(
        int $conversationId,
        int $senderId,
        string $message,
        ?int $replyToMessageId = null
    ): Message {
        return Message::create([
            'conversation_id' => $conversationId,
            'sender_id' => $senderId,
            'message' => $message,
            'type' => Message::TYPE_TEXT,
            'status' => Message::STATUS_SENT,
            'reply_to_message_id' => $replyToMessageId,
        ]);
    }

    /**
     * Create a file message (image, video, audio, document)
     */
    public function createFileMessage(
        int $conversationId,
        int $senderId,
        string $type,
        string $filePath,
        string $fileName,
        string $fileType,
        int $fileSize,
        ?string $caption = null,
        ?int $replyToMessageId = null
    ): Message {
        return Message::create([
            'conversation_id' => $conversationId,
            'sender_id' => $senderId,
            'message' => $caption ?? '',
            'type' => $type,
            'status' => Message::STATUS_SENT,
            'file_path' => $filePath,
            'file_name' => $fileName,
            'file_type' => $fileType,
            'file_size' => $fileSize,
            'reply_to_message_id' => $replyToMessageId,
        ]);
    }

    /**
     * Create a system message
     */
    public function createSystemMessage(int $conversationId, string $message): Message
    {
        return Message::create([
            'conversation_id' => $conversationId,
            'sender_id' => 0, // System sender
            'message' => $message,
            'type' => Message::TYPE_SYSTEM,
            'status' => Message::STATUS_SENT,
            'is_read' => true,
        ]);
    }

    /**
     * Get messages for a conversation with pagination
     */
    public function getConversationMessages(
        int $conversationId,
        int $perPage = 50,
        int $page = 1
    ): LengthAwarePaginator {
        return Message::forConversation($conversationId)
            ->with(['sender', 'replyTo.sender'])
            ->oldestFirst()
            ->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Get recent messages for a conversation
     */
    public function getRecentMessages(int $conversationId, int $limit = 50): Collection
    {
        return Message::forConversation($conversationId)
            ->with(['sender', 'replyTo.sender'])
            ->oldestFirst()
            ->limit($limit)
            ->get();
    }

    /**
     * Get messages before a specific message ID (for infinite scroll)
     */
    public function getMessagesBefore(
        int $conversationId,
        int $beforeMessageId,
        int $limit = 50
    ): Collection {
        return Message::forConversation($conversationId)
            ->where('id', '<', $beforeMessageId)
            ->with(['sender', 'replyTo.sender'])
            ->latestFirst()
            ->limit($limit)
            ->get()
            ->reverse()
            ->values();
    }

    /**
     * Get messages after a specific message ID (for real-time updates)
     */
    public function getMessagesAfter(
        int $conversationId,
        int $afterMessageId
    ): Collection {
        return Message::forConversation($conversationId)
            ->where('id', '>', $afterMessageId)
            ->with(['sender', 'replyTo.sender'])
            ->oldestFirst()
            ->get();
    }

    /**
     * Get unread messages count for a user in a conversation
     */
    public function getUnreadCount(int $conversationId, int $userId): int
    {
        return Message::forConversation($conversationId)
            ->where('sender_id', '!=', $userId)
            ->unread()
            ->count();
    }

    /**
     * Mark all messages in a conversation as read for a user
     */
    public function markConversationAsRead(int $conversationId, int $userId): int
    {
        return Message::forConversation($conversationId)
            ->where('sender_id', '!=', $userId)
            ->unread()
            ->update([
                'is_read' => true,
                'status' => Message::STATUS_READ,
                'read_at' => now(),
            ]);
    }

    /**
     * Mark specific message as read
     */
    public function markMessageAsRead(int $messageId): bool
    {
        $message = Message::find($messageId);
        return $message ? $message->markAsRead() : false;
    }

    /**
     * Mark message as delivered
     */
    public function markMessageAsDelivered(int $messageId): bool
    {
        $message = Message::find($messageId);
        return $message ? $message->markAsDelivered() : false;
    }

    /**
     * Update message content
     */
    public function updateMessage(int $messageId, string $newContent): ?Message
    {
        $message = Message::find($messageId);

        if (!$message) {
            return null;
        }

        $message->updateContent($newContent);
        return $message->fresh();
    }

    /**
     * Delete message (soft delete)
     */
    public function deleteMessage(int $messageId): bool
    {
        $message = Message::find($messageId);
        return $message ? $message->delete() : false;
    }

    /**
     * Permanently delete message
     */
    public function forceDeleteMessage(int $messageId): bool
    {
        $message = Message::withTrashed()->find($messageId);
        return $message ? $message->forceDelete() : false;
    }

    /**
     * Search messages in a conversation
     */
    public function searchMessages(
        int $conversationId,
        string $searchTerm,
        int $limit = 50
    ): Collection {
        return Message::forConversation($conversationId)
            ->searchByContent($searchTerm)
            ->with(['sender'])
            ->latestFirst()
            ->limit($limit)
            ->get();
    }

    /**
     * Get file messages from a conversation
     */
    public function getFileMessages(int $conversationId, ?string $type = null): Collection
    {
        $query = Message::forConversation($conversationId)
            ->fileMessages()
            ->with(['sender'])
            ->latestFirst();

        if ($type) {
            $query->byType($type);
        }

        return $query->get();
    }

    /**
     * Get message statistics for a conversation
     */
    public function getConversationStats(int $conversationId): array
    {
        $messages = Message::forConversation($conversationId);

        return [
            'total_messages' => $messages->count(),
            'text_messages' => (clone $messages)->textMessages()->count(),
            'file_messages' => (clone $messages)->fileMessages()->count(),
            'unread_messages' => (clone $messages)->unread()->count(),
            'images' => (clone $messages)->byType(Message::TYPE_IMAGE)->count(),
            'videos' => (clone $messages)->byType(Message::TYPE_VIDEO)->count(),
            'audio' => (clone $messages)->byType(Message::TYPE_AUDIO)->count(),
            'files' => (clone $messages)->byType(Message::TYPE_FILE)->count(),
        ];
    }

    /**
     * Get last message in a conversation
     */
    public function getLastMessage(int $conversationId): ?Message
    {
        return Message::forConversation($conversationId)
            ->with(['sender'])
            ->latestFirst()
            ->first();
    }

    /**
     * Delete all messages in a conversation
     */
    public function deleteConversationMessages(int $conversationId): int
    {
        return Message::forConversation($conversationId)->delete();
    }

    /**
     * Get messages by date range
     */
    public function getMessagesByDateRange(
        int $conversationId,
        string $startDate,
        string $endDate
    ): Collection {
        return Message::forConversation($conversationId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with(['sender'])
            ->oldestFirst()
            ->get();
    }

    /**
     * Get message by ID with relationships
     */
    public function findMessage(int $messageId): ?Message
    {
        return Message::with(['sender', 'conversation', 'replyTo.sender'])
            ->find($messageId);
    }

    /**
     * Check if user can access message
     */
    public function canUserAccessMessage(int $messageId, int $userId): bool
    {
        $message = Message::with('conversation')->find($messageId);

        if (!$message) {
            return false;
        }

        return $message->conversation->user1_id === $userId
            || $message->conversation->user2_id === $userId;
    }

    /**
     * Get replied messages count
     */
    public function getRepliesCount(int $messageId): int
    {
        return Message::where('reply_to_message_id', $messageId)->count();
    }

    /**
     * Get all replies to a message
     */
    public function getReplies(int $messageId): Collection
    {
        return Message::where('reply_to_message_id', $messageId)
            ->with(['sender'])
            ->oldestFirst()
            ->get();
    }
}
