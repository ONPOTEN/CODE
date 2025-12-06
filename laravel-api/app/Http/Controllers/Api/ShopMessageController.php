<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShopMessageResource;
use App\Models\ShopMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShopMessageController extends Controller
{
    /**
     * Get all messages for a specific shop (for shop owner)
     */
    public function getShopMessages($shopId, Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check if user is the shop owner
        $shopMessages = ShopMessage::forShop($shopId)
            ->forOwner($user->ID)
            ->with(['shop', 'sender', 'shopOwner'])
            ->latestFirst()
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'data' => ShopMessageResource::collection($shopMessages),
            'meta' => [
                'total' => $shopMessages->total(),
                'count' => $shopMessages->count(),
                'per_page' => $shopMessages->perPage(),
                'current_page' => $shopMessages->currentPage(),
                'last_page' => $shopMessages->lastPage(),
            ]
        ]);
    }

    /**
     * Get messages from a specific customer to a shop
     */
    public function getCustomerMessages($shopId, $senderId, Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Get messages between customer and shop
        $messages = ShopMessage::forShop($shopId)
            ->where(function ($query) use ($senderId, $user) {
                $query->where('sender_id', $senderId)
                      ->orWhere('sender_id', $user->ID);
            })
            ->with(['shop', 'sender', 'shopOwner'])
            ->oldestFirst()
            ->paginate($request->input('per_page', 50));

        return response()->json([
            'data' => ShopMessageResource::collection($messages),
            'meta' => [
                'total' => $messages->total(),
                'count' => $messages->count(),
                'per_page' => $messages->perPage(),
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
            ]
        ]);
    }

    /**
     * Get unread message count for a shop owner
     */
    public function getUnreadCount($shopId, Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $unreadCount = ShopMessage::forShop($shopId)
            ->forOwner($user->ID)
            ->unread()
            ->count();

        return response()->json([
            'unread_count' => $unreadCount
        ]);
    }

    /**
     * Mark message as read
     */
    public function markAsRead($messageId, Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $message = ShopMessage::find($messageId);

        if (!$message) {
            return response()->json(['message' => 'Message not found'], 404);
        }

        // Only shop owner can mark messages as read
        if ($message->shop_owner_id != $user->ID) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $message->markAsRead();

        return response()->json([
            'message' => 'Message marked as read',
            'data' => new ShopMessageResource($message)
        ]);
    }

    /**
     * Mark message as delivered
     */
    public function markAsDelivered($messageId, Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $message = ShopMessage::find($messageId);

        if (!$message) {
            return response()->json(['message' => 'Message not found'], 404);
        }

        $message->markAsDelivered();

        return response()->json([
            'message' => 'Message marked as delivered',
            'data' => new ShopMessageResource($message)
        ]);
    }

    /**
     * Delete a message (soft delete)
     */
    public function destroy($messageId, Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $message = ShopMessage::find($messageId);

        if (!$message) {
            return response()->json(['message' => 'Message not found'], 404);
        }

        // Only shop owner can delete messages
        if ($message->shop_owner_id != $user->ID) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $message->delete();

        return response()->json([
            'message' => 'Message deleted successfully'
        ]);
    }

    /**
     * Store a new shop message (called from Socket.IO server)
     * This is typically called from backend services
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shop_id' => 'required|integer|exists:shops,id',
            'sender_id' => 'required|integer',
            'shop_owner_id' => 'required|integer',
            'message' => 'required|string|max:65000', // Increased to support multiple image URLs
        ]);

        $message = ShopMessage::create($validated);

        return response()->json([
            'message' => 'Message saved successfully',
            'data' => new ShopMessageResource($message->load(['shop', 'sender', 'shopOwner']))
        ], 201);
    }
}
