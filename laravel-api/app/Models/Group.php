<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Group extends Model
{
    protected $table = 'groups';
    protected $primaryKey = 'group_id';
    public $timestamps = true;

    protected $fillable = [
        'group_name',
        'description',
        'group_owner_id',
        'status',
        'visibility',
        'avatar',
        'cover_image',
        'requires_approval',
        'requires_approval_posts',
    ];

    protected $casts = [
        'group_owner_id' => 'integer',
        'requires_approval' => 'boolean',
        'requires_approval_posts' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'group_owner_id', 'ID');
    }

    public function posts(): HasMany
    {
        return $this->hasMany(GroupPost::class, 'group_id', 'group_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(GroupUser::class, 'group_id', 'group_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopePublic($query)
    {
        return $query->where('visibility', 'public');
    }

    public function scopePrivate($query)
    {
        return $query->where('visibility', 'private');
    }
}
