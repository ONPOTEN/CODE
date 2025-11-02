<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupUser extends Model
{
    protected $table = 'group_users';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'group_id',
        'group_user_id',
        'group_role',
        'status',
    ];

    protected $casts = [
        'group_id' => 'integer',
        'group_user_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Role constants
    const ROLE_ADMIN = 'admin';
    const ROLE_MODERATOR = 'moderator';
    const ROLE_USER = 'user';

    // Status constants
    const STATUS_ACTIVE = 'active';
    const STATUS_PENDING = 'pending';
    const STATUS_BANNED = 'banned';

    /**
     * Get available roles
     */
    public static function getRoles(): array
    {
        return [
            self::ROLE_ADMIN => 'Administrator',
            self::ROLE_MODERATOR => 'Moderator',
            self::ROLE_USER => 'Member',
        ];
    }

    /**
     * Get available statuses
     */
    public static function getStatuses(): array
    {
        return [
            self::STATUS_ACTIVE => 'Active',
            self::STATUS_PENDING => 'Pending',
            self::STATUS_BANNED => 'Banned',
        ];
    }

    /**
     * Relationship: Group that this membership belongs to
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class, 'group_id', 'group_id');
    }

    /**
     * Relationship: User who is a member
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'group_user_id', 'ID');
    }

    /**
     * Scope: Get admin members
     */
    public function scopeAdmins($query)
    {
        return $query->where('group_role', self::ROLE_ADMIN);
    }

    /**
     * Scope: Get moderators
     */
    public function scopeModerators($query)
    {
        return $query->where('group_role', self::ROLE_MODERATOR);
    }

    /**
     * Scope: Get regular members
     */
    public function scopeMembers($query)
    {
        return $query->where('group_role', self::ROLE_USER);
    }

    /**
     * Scope: Get active members
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope: Get pending members
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope: Get banned members
     */
    public function scopeBanned($query)
    {
        return $query->where('status', self::STATUS_BANNED);
    }

    /**
     * Scope: Get by group
     */
    public function scopeInGroup($query, $groupId)
    {
        return $query->where('group_id', $groupId);
    }

    /**
     * Scope: Get by user
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('group_user_id', $userId);
    }

    /**
     * Check if user is admin
     */
    public function isAdmin(): bool
    {
        return $this->group_role === self::ROLE_ADMIN;
    }

    /**
     * Check if user is moderator
     */
    public function isModerator(): bool
    {
        return $this->group_role === self::ROLE_MODERATOR;
    }

    /**
     * Check if user is regular member
     */
    public function isMember(): bool
    {
        return $this->group_role === self::ROLE_USER;
    }

    /**
     * Check if member is active
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Check if member is pending
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if member is banned
     */
    public function isBanned(): bool
    {
        return $this->status === self::STATUS_BANNED;
    }
}
