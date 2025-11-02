<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class WpUser extends Authenticatable
{
    use HasApiTokens, Notifiable;
    protected $table = 'wp_users';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'user_login',
        'user_pass',
        'user_nicename',
        'user_email',
        'user_url',
        'user_registered',
        'user_activation_key',
        'user_status',
        'display_name',
        'hobby',
        'company',
        'location',
        'role',
        'avatar',
        'profile_visibility',
        'phone',
        'email_public',
        'hobby_public',
        'company_public',
        'location_public',
        'phone_public',
        'firebase_uid',
        'auth_method',
        'last_login_at',
        'email_verified_at',
    ];

    protected $hidden = [
        'user_pass',
        'user_activation_key',
    ];

    protected $casts = [
        'user_registered' => 'datetime',
        'user_status' => 'integer',
        'email_public' => 'boolean',
        'hobby_public' => 'boolean',
        'company_public' => 'boolean',
        'location_public' => 'boolean',
        'phone_public' => 'boolean',
    ];

    /**
     * Normalize phone number when setting it
     * Ensures consistent storage with '+' prefix for international numbers
     */
    public function setPhoneAttribute($value)
    {
        if ($value) {
            // Trim whitespace
            $value = trim($value);
            // Add '+' prefix if it's not already there and looks like international format
            if (!str_starts_with($value, '+') && preg_match('/^\d{10,}$/', $value)) {
                $value = '+' . $value;
            }
        }
        $this->attributes['phone'] = $value;
    }

    public function posts(): HasMany
    {
        return $this->hasMany(WpPost::class, 'post_author', 'ID');
    }

    public function meta(): HasMany
    {
        return $this->hasMany(WpUserMeta::class, 'user_id', 'ID');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(WpComment::class, 'user_id', 'ID');
    }

    public function shareWalls(): HasMany
    {
        return $this->hasMany(ShareWall::class, 'user_id', 'ID');
    }

    public function wall(): HasMany
    {
        return $this->hasMany(WpPost::class, 'wall_id', 'ID');
    }

    public function moderations(): HasMany
    {
        return $this->hasMany(ShareWall::class, 'moderated_by', 'ID');
    }

    public function ownedGroups(): HasMany
    {
        return $this->hasMany(Group::class, 'group_owner_id', 'ID');
    }

    public function groupMemberships(): HasMany
    {
        return $this->hasMany(GroupUser::class, 'group_user_id', 'ID');
    }

    /**
     * Check if user has admin role
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if user has moderator role or higher
     */
    public function isModerator(): bool
    {
        return in_array($this->role, ['admin', 'moderator']);
    }

    /**
     * Check if user has editor role or higher
     */
    public function isEditor(): bool
    {
        return in_array($this->role, ['admin', 'moderator', 'editor']);
    }

    /**
     * Check if user has a specific role
     */
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    /**
     * Check if user has any of the given roles
     */
    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles);
    }

    /**
     * Normalize phone number for searching and comparison
     * Handles both formats with and without '+' prefix
     */
    public static function normalizePhone(string $phone): string
    {
        $phone = trim($phone);
        // Remove all non-digit characters except '+'
        $phone = preg_replace('/[^\d+]/', '', $phone);
        // Ensure '+' prefix if it looks like a phone number
        if (!str_starts_with($phone, '+') && strlen($phone) >= 10) {
            $phone = '+' . $phone;
        }
        return $phone;
    }

    /**
     * Find user by phone number with flexible matching
     * Handles different phone number formats by matching the core number
     */
    public static function findByPhone(string $phone)
    {
        $normalized = self::normalizePhone($phone);
        $withoutPlus = ltrim($normalized, '+');
        $digitsOnly = preg_replace('/[^\d]/', '', $normalized);

        \Log::info('[WpUser::findByPhone] Searching for phone', [
            'input' => $phone,
            'normalized' => $normalized,
            'without_plus' => $withoutPlus,
            'digits_only' => $digitsOnly,
        ]);

        // Try exact matches first
        $user = self::where('phone', $normalized)->first();
        if ($user) {
            \Log::info('[WpUser::findByPhone] Found via exact match', [
                'user_id' => $user->ID,
                'stored_phone' => $user->phone,
            ]);
            return $user;
        }

        $user = self::where('phone', $withoutPlus)->first();
        if ($user) {
            \Log::info('[WpUser::findByPhone] Found via exact match (without plus)', [
                'user_id' => $user->ID,
                'stored_phone' => $user->phone,
            ]);
            return $user;
        }

        // Flexible matching: match phones ending with the search digits
        $allUsers = self::whereNotNull('phone')->where('phone', '!=', '')->get();
        foreach ($allUsers as $user) {
            $storedDigits = preg_replace('/[^\d]/', '', $user->phone);
            // Match if stored phone ends with searched digits OR contains the same last N digits
            if (str_ends_with($storedDigits, $digitsOnly) || str_ends_with($digitsOnly, $storedDigits)) {
                \Log::info('[WpUser::findByPhone] Found via flexible match', [
                    'user_id' => $user->ID,
                    'stored_phone' => $user->phone,
                    'stored_digits' => $storedDigits,
                    'search_digits' => $digitsOnly,
                ]);
                return $user;
            }
        }

        \Log::warning('[WpUser::findByPhone] No user found', [
            'normalized' => $normalized,
            'digits_only' => $digitsOnly,
        ]);

        return null;
    }
}
