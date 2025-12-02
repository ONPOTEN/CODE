<?php

namespace App\Http\Controllers\Api;

use App\Models\Group;
use App\Models\GroupMessage;
use App\Http\Controllers\Controller;
use App\Http\Resources\GroupMessageResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupMessageController extends Controller
{
    /**
     * Get messages for a group with pagination
     */
    public function index(Request $request, Group $group): JsonResponse
    {
        // Verify user is a member of the group
        $isMember = $group->members()->where('group_user_id', auth()->id())->exists();

        if (!$isMember && $group->group_owner_id !== auth()->id()) {
            return response()->json([
                'message' => 'You are not a member of this group',
                'data' => []
            ], 403);
        }

        $perPage = $request->input('per_page', 50);

        $messages = $group->messages()
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => GroupMessageResource::collection($messages->items()),
            'pagination' => [
                'total' => $messages->total(),
                'per_page' => $messages->perPage(),
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
            ]
        ]);
    }

    /**
     * Store a new message
     */
    public function store(Request $request, Group $group): JsonResponse
    {
        // Verify user is a member of the group
        $isMember = $group->members()->where('group_user_id', auth()->id())->exists();

        if (!$isMember && $group->group_owner_id !== auth()->id()) {
            return response()->json([
                'message' => 'You are not a member of this group',
            ], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $message = GroupMessage::create([
            'group_id' => $group->group_id,
            'user_id' => auth()->id(),
            'message' => $validated['message'],
        ]);

        $message->load('user');

        return response()->json([
            'message' => 'Message created successfully',
            'data' => new GroupMessageResource($message),
        ], 201);
    }

    /**
     * Update a message
     */
    public function update(Request $request, Group $group, GroupMessage $message): JsonResponse
    {
        // Verify the message belongs to this group
        if ($message->group_id !== $group->group_id) {
            return response()->json([
                'message' => 'Message not found in this group',
            ], 404);
        }

        // Verify user owns the message
        if ($message->user_id !== auth()->id()) {
            return response()->json([
                'message' => 'You can only edit your own messages',
            ], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $message->update(['message' => $validated['message']]);

        return response()->json([
            'message' => 'Message updated successfully',
            'data' => new GroupMessageResource($message->load('user')),
        ]);
    }

    /**
     * Delete a message
     */
    public function destroy(Request $request, Group $group, GroupMessage $message): JsonResponse
    {
        // Verify the message belongs to this group
        if ($message->group_id !== $group->group_id) {
            return response()->json([
                'message' => 'Message not found in this group',
            ], 404);
        }

        // Verify user owns the message or is group owner
        if ($message->user_id !== auth()->id() && $group->group_owner_id !== auth()->id()) {
            return response()->json([
                'message' => 'You do not have permission to delete this message',
            ], 403);
        }

        $message->delete();

        return response()->json([
            'message' => 'Message deleted successfully',
        ]);
    }
}
