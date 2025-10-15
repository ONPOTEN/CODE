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
}
