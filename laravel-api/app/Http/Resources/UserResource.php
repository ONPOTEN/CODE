<?php

namespace App\Http\Resources;

use App\Models\Friend;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $currentUser = $request->user();
        $friendshipData = $this->getFriendshipStatus($currentUser);
        $isOwnProfile = $currentUser && $currentUser->ID == $this->ID;
        $isFriend = $friendshipData['is_friend'];

        // Determine what fields should be visible based on privacy settings
        $shouldShowEmail = $isOwnProfile || $this->email_public || $isFriend;
        $shouldShowHobby = $isOwnProfile || $this->hobby_public || $isFriend;
        $shouldShowCompany = $isOwnProfile || $this->company_public || $isFriend;
        $shouldShowLocation = $isOwnProfile || $this->location_public || $isFriend;
        $shouldShowPhone = $isOwnProfile || $this->phone_public || $isFriend;

        return [
            'id' => $this->ID,
            'name' => $this->display_name,
            'username' => $this->user_login,
            'email' => $shouldShowEmail ? $this->user_email : null,
            'display_name' => $this->display_name,
            'nicename' => $this->user_nicename,
            'url' => $this->user_url,
            'hobby' => $shouldShowHobby ? $this->hobby : null,
            'company' => $shouldShowCompany ? $this->company : null,
            'location' => $shouldShowLocation ? $this->location : null,
            'role' => $this->role,
            'avatar' => $this->avatar,
            'avatar_url' => $this->avatar,  // Avatar field now stores full S3 URL directly
            'profile_visibility' => $this->profile_visibility,
            'phone' => $shouldShowPhone ? $this->phone : null,
            'email_public' => $isOwnProfile ? $this->email_public : null,
            'hobby_public' => $isOwnProfile ? $this->hobby_public : null,
            'company_public' => $isOwnProfile ? $this->company_public : null,
            'location_public' => $isOwnProfile ? $this->location_public : null,
            'phone_public' => $isOwnProfile ? $this->phone_public : null,
            'created_at' => $this->user_registered?->toIso8601String(),
            'updated_at' => $this->user_registered?->toIso8601String(),
            'registered' => $this->user_registered?->toIso8601String(),
            'meta' => $this->when($request->input('include_meta'), function () {
                return $this->meta->pluck('meta_value', 'meta_key');
            }),
            // Friendship status fields
            'friendship_status' => $friendshipData['friendship_status'],
            'is_friend' => $friendshipData['is_friend'],
            'friend_request_sent' => $friendshipData['friend_request_sent'],
            'friend_request_received' => $friendshipData['friend_request_received'],
        ];
    }

    private function getFriendshipStatus($currentUser): array
    {
        if (!$currentUser || $currentUser->ID == $this->ID) {
            return [
                'friendship_status' => 'none',
                'is_friend' => false,
                'friend_request_sent' => false,
                'friend_request_received' => false,
            ];
        }

        // Check for any friendship/request
        $friendship = Friend::where(function ($query) use ($currentUser) {
            $query->where('user_id', $currentUser->ID)
                  ->where('friend_id', $this->ID);
        })->orWhere(function ($query) use ($currentUser) {
            $query->where('user_id', $this->ID)
                  ->where('friend_id', $currentUser->ID);
        })->first();

        if (!$friendship) {
            return [
                'friendship_status' => 'none',
                'is_friend' => false,
                'friend_request_sent' => false,
                'friend_request_received' => false,
            ];
        }

        $isFriend = $friendship->status === 'accepted';
        $friendRequestSent = $friendship->status === 'pending' && $friendship->user_id === $currentUser->ID;
        $friendRequestReceived = $friendship->status === 'pending' && $friendship->friend_id === $currentUser->ID;

        return [
            'friendship_status' => $friendship->status,
            'is_friend' => $isFriend,
            'friend_request_sent' => $friendRequestSent,
            'friend_request_received' => $friendRequestReceived,
        ];
    }
}
