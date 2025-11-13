<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    /**
     * Get all rooms for authenticated user (as shop owner or customer)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Get rooms where user is shop owner or customer
        $rooms = Room::where(function ($query) use ($user) {
            $query->where('shop_owner_id', $user->ID)
                  ->orWhere('customer_id', $user->ID);
        })
        ->active()
        ->shopMessage()
        ->with(['shop', 'customer', 'shopOwner'])
        ->latestMessages()
        ->paginate($request->input('per_page', 20));

        return response()->json([
            'data' => $rooms->items(),
            'meta' => [
                'total' => $rooms->total(),
                'count' => $rooms->count(),
                'per_page' => $rooms->perPage(),
                'current_page' => $rooms->currentPage(),
                'last_page' => $rooms->lastPage(),
            ]
        ]);
    }

    /**
     * Create or get a shop message room
     * POST /api/v1/rooms/shop-message
     */
    public function createShopMessageRoom(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'customer_id' => 'required|integer',
            'shop_id' => 'required|integer',
            'shop_owner_id' => 'required|integer',
            'subject' => 'nullable|string|max:255',
        ]);

        try {
            // Create or get the room with the specified naming convention
            $room = Room::createOrGetShopMessageRoom(
                $validated['customer_id'],
                $validated['shop_id'],
                $validated['shop_owner_id'],
                $validated['subject'] ?? null
            );

            return response()->json([
                'message' => 'Room created or retrieved successfully',
                'data' => $room->load(['shop', 'customer', 'shopOwner']),
                'room_name' => $room->room_name,  // e.g., "656-shop1"
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create room',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get a specific room by ID or room name
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Try to find by ID first, then by room name
        $room = Room::where('id', $id)
            ->orWhere('room_name', $id)
            ->first();

        if (!$room) {
            return response()->json(['message' => 'Room not found'], 404);
        }

        // Check if user is participant
        if ($room->customer_id != $user->ID && $room->shop_owner_id != $user->ID) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => $room->load(['shop', 'customer', 'shopOwner', 'messages'])
        ]);
    }

    /**
     * Get room by room name (useful for frontend to get room details using Socket.IO room name)
     * GET /api/v1/rooms/by-name/{roomName}
     */
    public function getByRoomName(Request $request, string $roomName): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $room = Room::byRoomName($roomName)->first();

        if (!$room) {
            return response()->json(['message' => 'Room not found'], 404);
        }

        // Check if user is participant
        if ($room->customer_id != $user->ID && $room->shop_owner_id != $user->ID) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => $room->load(['shop', 'customer', 'shopOwner', 'messages'])
        ]);
    }

    /**
     * Get rooms for a specific shop (for shop owner)
     * GET /api/v1/shops/{shopId}/rooms
     */
    public function getShopRooms(Request $request, int $shopId): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $rooms = Room::forShop($shopId)
            ->forOwner($user->ID)
            ->active()
            ->shopMessage()
            ->with(['shop', 'customer', 'shopOwner'])
            ->latestMessages()
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'data' => $rooms->items(),
            'meta' => [
                'total' => $rooms->total(),
                'count' => $rooms->count(),
                'per_page' => $rooms->perPage(),
                'current_page' => $rooms->currentPage(),
                'last_page' => $rooms->lastPage(),
            ]
        ]);
    }

    /**
     * Update room metadata (e.g., mark as read, update subject)
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $room = Room::findOrFail($id);

        // Only shop owner can update room settings
        if ($room->shop_owner_id != $user->ID) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'subject' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);

        $room->update($validated);

        return response()->json([
            'message' => 'Room updated successfully',
            'data' => $room->load(['shop', 'customer', 'shopOwner'])
        ]);
    }

    /**
     * Close a room (soft delete or mark inactive)
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $room = Room::findOrFail($id);

        // Only shop owner can close rooms
        if ($room->shop_owner_id != $user->ID) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $room->delete();

        return response()->json([
            'message' => 'Room closed successfully'
        ]);
    }

    /**
     * Get room statistics
     */
    public function getStats(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $room = Room::findOrFail($id);

        // Check if user is participant
        if ($room->customer_id != $user->ID && $room->shop_owner_id != $user->ID) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => [
                'id' => $room->id,
                'room_name' => $room->room_name,
                'message_count' => $room->message_count,
                'last_message_at' => $room->last_message_at,
                'is_active' => $room->is_active,
                'created_at' => $room->created_at,
                'updated_at' => $room->updated_at,
            ]
        ]);
    }
}
