<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FriendRequestResource;
use App\Http\Resources\UserResource;
use App\Models\Friend;
use App\Models\WpUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FriendController extends Controller
{
    /**
     * Send a friend request
     */
    public function sendRequest(Request $request, $userId)
    {
        $currentUser = $request->user();

        // Can't send friend request to yourself
        if ($currentUser->ID == $userId) {
            return response()->json(['message' => 'You cannot send a friend request to yourself'], 400);
        }

        // Check if user exists
        $targetUser = WpUser::find($userId);
        if (!$targetUser) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Check if friend request already exists
        $existingRequest = Friend::where(function ($query) use ($currentUser, $userId) {
            $query->where('user_id', $currentUser->ID)
                  ->where('friend_id', $userId);
        })->orWhere(function ($query) use ($currentUser, $userId) {
            $query->where('user_id', $userId)
                  ->where('friend_id', $currentUser->ID);
        })->first();

        if ($existingRequest) {
            if ($existingRequest->status === 'accepted') {
                return response()->json(['message' => 'You are already friends'], 400);
            }
            if ($existingRequest->status === 'pending') {
                return response()->json(['message' => 'Friend request already sent'], 400);
            }
        }

        // Create friend request
        $friendRequest = Friend::create([
            'user_id' => $currentUser->ID,
            'friend_id' => $userId,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Friend request sent successfully',
            'friend_request' => $friendRequest,
        ], 201);
    }

    /**
     * Accept a friend request
     */
    public function acceptRequest(Request $request, $userId)
    {
        $currentUser = $request->user();

        // Find the friend request where current user is the friend_id (receiver)
        $friendRequest = Friend::where('user_id', $userId)
            ->where('friend_id', $currentUser->ID)
            ->where('status', 'pending')
            ->first();

        if (!$friendRequest) {
            return response()->json(['message' => 'Friend request not found'], 404);
        }

        // Update status to accepted
        $friendRequest->update(['status' => 'accepted']);

        return response()->json([
            'message' => 'Friend request accepted',
            'friend_request' => $friendRequest,
        ]);
    }

    /**
     * Reject a friend request
     */
    public function rejectRequest(Request $request, $userId)
    {
        $currentUser = $request->user();

        // Find the friend request where current user is the friend_id (receiver)
        $friendRequest = Friend::where('user_id', $userId)
            ->where('friend_id', $currentUser->ID)
            ->where('status', 'pending')
            ->first();

        if (!$friendRequest) {
            return response()->json(['message' => 'Friend request not found'], 404);
        }

        // Delete the friend request
        $friendRequest->delete();

        return response()->json(['message' => 'Friend request rejected']);
    }

    /**
     * Unfriend a user
     */
    public function unfriend(Request $request, $userId)
    {
        $currentUser = $request->user();

        // Find the friendship (either direction)
        $friendship = Friend::where(function ($query) use ($currentUser, $userId) {
            $query->where('user_id', $currentUser->ID)
                  ->where('friend_id', $userId);
        })->orWhere(function ($query) use ($currentUser, $userId) {
            $query->where('user_id', $userId)
                  ->where('friend_id', $currentUser->ID);
        })->where('status', 'accepted')
          ->first();

        if (!$friendship) {
            return response()->json(['message' => 'Friendship not found'], 404);
        }

        // Delete the friendship
        $friendship->delete();

        return response()->json(['message' => 'Successfully unfriended']);
    }

    /**
     * Get all friends
     */
    public function index(Request $request)
    {
        $currentUser = $request->user();

        // Get all accepted friendships
        $friendIds = Friend::where(function ($query) use ($currentUser) {
            $query->where('user_id', $currentUser->ID)
                  ->orWhere('friend_id', $currentUser->ID);
        })
        ->where('status', 'accepted')
        ->get()
        ->map(function ($friendship) use ($currentUser) {
            return $friendship->user_id === $currentUser->ID
                ? $friendship->friend_id
                : $friendship->user_id;
        });

        // Get user details for all friends
        $friends = WpUser::whereIn('ID', $friendIds)->get();

        return UserResource::collection($friends);
    }

    /**
     * Get pending friend requests
     */
    public function pending(Request $request)
    {
        $currentUser = $request->user();

        // Get all pending requests where current user is the receiver
        $pendingRequests = Friend::where('friend_id', $currentUser->ID)
            ->where('status', 'pending')
            ->with('user')
            ->get();

        return FriendRequestResource::collection($pendingRequests);
    }

    /**
     * Get friendship status with a specific user
     */
    public function status(Request $request, $userId)
    {
        $currentUser = $request->user();

        if ($currentUser->ID == $userId) {
            return response()->json([
                'friendship_status' => 'self',
                'is_friend' => false,
                'friend_request_sent' => false,
                'friend_request_received' => false,
            ]);
        }

        // Check for any friendship/request
        $friendship = Friend::where(function ($query) use ($currentUser, $userId) {
            $query->where('user_id', $currentUser->ID)
                  ->where('friend_id', $userId);
        })->orWhere(function ($query) use ($currentUser, $userId) {
            $query->where('user_id', $userId)
                  ->where('friend_id', $currentUser->ID);
        })->first();

        if (!$friendship) {
            return response()->json([
                'friendship_status' => 'none',
                'is_friend' => false,
                'friend_request_sent' => false,
                'friend_request_received' => false,
            ]);
        }

        $isFriend = $friendship->status === 'accepted';
        $friendRequestSent = $friendship->status === 'pending' && $friendship->user_id === $currentUser->ID;
        $friendRequestReceived = $friendship->status === 'pending' && $friendship->friend_id === $currentUser->ID;

        return response()->json([
            'friendship_status' => $friendship->status,
            'is_friend' => $isFriend,
            'friend_request_sent' => $friendRequestSent,
            'friend_request_received' => $friendRequestReceived,
        ]);
    }
}
