<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Friend;
use App\Repositories\MessageRepository;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    protected $messageRepository;

    public function __construct(MessageRepository $messageRepository)
    {
        $this->messageRepository = $messageRepository;
    }

    /**
     * Generate room name from user IDs (ascending order for consistency)
     */
    private function generateRoomName($hostId, $remoteId)
    {
        $ids = [$hostId, $remoteId];
        sort($ids);
        return "{$ids[0]}-{$ids[1]}";
    }

    /**
     * Check if two users are friends
     */
    private function areFriends($userId1, $userId2)
    {
        return Friend::where(function ($query) use ($userId1, $userId2) {
            $query->where('user_id', $userId1)
                  ->where('friend_id', $userId2);
        })->orWhere(function ($query) use ($userId1, $userId2) {
            $query->where('user_id', $userId2)
                  ->where('friend_id', $userId1);
        })->where('status', 'accepted')->exists();
    }
    /**
     * Get all conversations for the authenticated user
     */
    public function getConversations(Request $request)
    {
        $userId = $request->user()->ID;

        $conversations = Conversation::where('user1_id', $userId)
            ->orWhere('user2_id', $userId)
            ->with(['user1', 'user2', 'messages' => function ($query) {
                $query->latest()->limit(1);
            }])
            ->orderBy('last_message_at', 'desc')
            ->get();

        $formatted = $conversations->map(function ($conversation) use ($userId) {
            $otherUser = $conversation->getOtherUser($userId);
            $lastMessage = $conversation->messages->first();

            // Generate room name: current user is host
            $roomName = $this->generateRoomName($userId, $otherUser->ID);

            return [
                'id' => $conversation->id,
                'room_name' => $roomName,
                'other_user' => [
                    'id' => $otherUser->ID,
                    'name' => $otherUser->display_name ?? $otherUser->user_login,
                    'email' => $otherUser->user_email,
                ],
                'last_message' => $lastMessage ? [
                    'message' => $lastMessage->message,
                    'created_at' => $lastMessage->created_at,
                    'is_mine' => $lastMessage->sender_id == $userId,
                ] : null,
                'unread_count' => $conversation->getUnreadCount($userId),
                'updated_at' => $conversation->last_message_at,
            ];
        });

        return response()->json($formatted);
    }

    /**
     * Get or create a conversation with a specific user (only if friends)
     */
    public function getOrCreateConversation(Request $request, $otherUserId)
    {
        $userId = $request->user()->ID;

        // Check if users are friends
        if (!$this->areFriends($userId, $otherUserId)) {
            return response()->json([
                'message' => 'You can only chat with friends. Send a friend request first.'
            ], 403);
        }

        // Ensure consistent ordering for unique constraint
        $user1 = min($userId, $otherUserId);
        $user2 = max($userId, $otherUserId);

        $conversation = Conversation::firstOrCreate(
            ['user1_id' => $user1, 'user2_id' => $user2],
            ['last_message_at' => now()]
        );

        $conversation->load(['user1', 'user2']);

        $otherUser = $conversation->getOtherUser($userId);

        // Generate room name: current user is host
        $roomName = $this->generateRoomName($userId, $otherUserId);

        return response()->json([
            'id' => $conversation->id,
            'room_name' => $roomName,
            'other_user' => [
                'id' => $otherUser->ID,
                'name' => $otherUser->display_name ?? $otherUser->user_login,
                'email' => $otherUser->user_email,
            ],
        ]);
    }

    /**
     * Get messages for a specific conversation
     */
    public function getMessages(Request $request, $conversationId)
    {
        $userId = $request->user()->ID;

        $conversation = Conversation::where('id', $conversationId)
            ->where(function ($query) use ($userId) {
                $query->where('user1_id', $userId)
                    ->orWhere('user2_id', $userId);
            })
            ->firstOrFail();

        // Get the other user's ID
        $otherUserId = $conversation->user1_id == $userId
            ? $conversation->user2_id
            : $conversation->user1_id;

        // Generate room name for this conversation
        $roomName = $this->generateRoomName($userId, $otherUserId);

        $messages = Message::where('conversation_id', $conversationId)
            ->with('sender')
            ->orderBy('created_at', 'asc')
            ->get();

        // Mark messages as read
        Message::where('conversation_id', $conversationId)
            ->where('sender_id', '!=', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $formatted = $messages->map(function ($message) use ($userId) {
            return [
                'id' => $message->id,
                'message' => $message->message,
                'sender' => [
                    'id' => $message->sender->ID,
                    'name' => $message->sender->display_name ?? $message->sender->user_login,
                ],
                'is_mine' => $message->sender_id == $userId,
                'is_read' => $message->is_read,
                'created_at' => $message->created_at,
            ];
        });

        return response()->json([
            'room_name' => $roomName,
            'messages' => $formatted,
        ]);
    }

    /**
     * Send a new message
     */
    public function sendMessage(Request $request, $conversationId)
    {
        $userId = $request->user()->ID;

        $validated = $request->validate([
            'message' => 'required|string|max:5000',
            'reply_to_message_id' => 'nullable|integer|exists:messages,id',
        ]);

        $conversation = Conversation::where('id', $conversationId)
            ->where(function ($query) use ($userId) {
                $query->where('user1_id', $userId)
                    ->orWhere('user2_id', $userId);
            })
            ->firstOrFail();

        // Create message using repository
        $message = $this->messageRepository->createTextMessage(
            $conversationId,
            $userId,
            $validated['message'],
            $validated['reply_to_message_id'] ?? null
        );

        // Update conversation's last_message_at
        $conversation->update(['last_message_at' => now()]);

        $message->load(['sender', 'replyTo.sender']);

        // Get the other user's ID
        $otherUserId = $conversation->user1_id == $userId
            ? $conversation->user2_id
            : $conversation->user1_id;

        // Generate room names for the message
        $senderRoomName = $this->generateRoomName($userId, $otherUserId);
        $recipientRoomName = $this->generateRoomName($otherUserId, $userId);

        // Don't set is_mine here - let frontend determine based on sender.id
        $messageData = [
            'id' => $message->id,
            'message' => $message->message,
            'type' => $message->type,
            'status' => $message->status,
            'sender' => [
                'id' => $message->sender->ID,
                'name' => $message->sender->display_name ?? $message->sender->user_login,
            ],
            'sender_id' => $message->sender->ID, // Add sender_id for easier comparison
            'reply_to' => $message->replyTo ? [
                'id' => $message->replyTo->id,
                'message' => $message->replyTo->message,
                'sender_name' => $message->replyTo->sender->display_name ?? $message->replyTo->sender->user_login,
            ] : null,
            'is_mine' => true, // This is for the API response only
            'is_read' => false,
            'is_edited' => false,
            'created_at' => $message->created_at,
            'conversation_id' => (int) $conversationId, // Ensure it's an integer
            'host_room' => $senderRoomName,
            'remote_room' => $recipientRoomName,
        ];

        // Emit Socket.IO event to notify the recipient
        $this->emitNewMessage($conversation, $messageData, $userId);

        return response()->json($messageData, 201);
    }

    /**
     * Edit a message
     */
    public function editMessage(Request $request, $conversationId, $messageId)
    {
        $userId = $request->user()->ID;

        $validated = $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        // Verify user owns the message
        $message = Message::where('id', $messageId)
            ->where('conversation_id', $conversationId)
            ->where('sender_id', $userId)
            ->firstOrFail();

        $message->updateContent($validated['message']);
        $message->load('sender');

        return response()->json([
            'id' => $message->id,
            'message' => $message->message,
            'is_edited' => $message->is_edited,
            'edited_at' => $message->edited_at,
        ]);
    }

    /**
     * Delete a message
     */
    public function deleteMessage(Request $request, $conversationId, $messageId)
    {
        $userId = $request->user()->ID;

        // Verify user owns the message
        $message = Message::where('id', $messageId)
            ->where('conversation_id', $conversationId)
            ->where('sender_id', $userId)
            ->firstOrFail();

        $this->messageRepository->deleteMessage($messageId);

        return response()->json([
            'message' => 'Message deleted successfully',
        ]);
    }

    /**
     * Get conversation statistics
     */
    public function getConversationStats(Request $request, $conversationId)
    {
        $userId = $request->user()->ID;

        // Verify user is part of conversation
        Conversation::where('id', $conversationId)
            ->where(function ($query) use ($userId) {
                $query->where('user1_id', $userId)
                    ->orWhere('user2_id', $userId);
            })
            ->firstOrFail();

        $stats = $this->messageRepository->getConversationStats($conversationId);

        return response()->json($stats);
    }

    /**
     * Search messages in a conversation
     */
    public function searchMessages(Request $request, $conversationId)
    {
        $userId = $request->user()->ID;

        $validated = $request->validate([
            'query' => 'required|string|min:1',
        ]);

        // Verify user is part of conversation
        Conversation::where('id', $conversationId)
            ->where(function ($query) use ($userId) {
                $query->where('user1_id', $userId)
                    ->orWhere('user2_id', $userId);
            })
            ->firstOrFail();

        $messages = $this->messageRepository->searchMessages(
            $conversationId,
            $validated['query']
        );

        $formatted = $messages->map(function ($message) use ($userId) {
            return [
                'id' => $message->id,
                'message' => $message->message,
                'sender' => [
                    'id' => $message->sender->ID,
                    'name' => $message->sender->display_name ?? $message->sender->user_login,
                ],
                'is_mine' => $message->sender_id == $userId,
                'created_at' => $message->created_at,
            ];
        });

        return response()->json($formatted);
    }

    /**
     * Mark messages as delivered
     */
    public function markAsDelivered(Request $request, $conversationId)
    {
        $userId = $request->user()->ID;

        $validated = $request->validate([
            'message_ids' => 'required|array',
            'message_ids.*' => 'integer|exists:messages,id',
        ]);

        foreach ($validated['message_ids'] as $messageId) {
            $this->messageRepository->markMessageAsDelivered($messageId);
        }

        return response()->json([
            'message' => 'Messages marked as delivered',
        ]);
    }

    /**
     * Emit new message event to Socket.IO server
     */
    private function emitNewMessage($conversation, $messageData, $senderId)
    {
        try {
            $recipientId = $conversation->user1_id == $senderId
                ? $conversation->user2_id
                : $conversation->user1_id;

            // Generate room name for sender (sender is host)
            $senderRoomName = $this->generateRoomName($senderId, $recipientId);

            // Generate room name for recipient (recipient is host)
            $recipientRoomName = $this->generateRoomName($recipientId, $senderId);

            $socketUrl = env('SOCKET_IO_URL', 'http://localhost:3000');

            $ch = curl_init($socketUrl . '/api/emit-message');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'senderId' => $senderId,
                'recipientId' => $recipientId,
                'messageData' => $messageData,
                'senderRoomName' => $senderRoomName,
                'recipientRoomName' => $recipientRoomName,
            ]));
            curl_setopt($ch, CURLOPT_TIMEOUT, 2);
            curl_exec($ch);
            curl_close($ch);
        } catch (\Exception $e) {
            // Log error but don't fail the request
            \Log::error('Socket.IO emit failed: ' . $e->getMessage());
        }
    }
}
