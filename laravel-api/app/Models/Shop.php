<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shop extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'description',
        'logo',
        'banner',
        'image_1',
        'image_2',
        'image_3',
        'image_4',
        'image_5',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'phone',
        'email',
        'website',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'user_id', 'ID');
    }

    public function posts(): HasMany
    {
        return $this->hasMany(ShopPost::class);
    }

    public function pages(): HasMany
    {
        return $this->hasMany(ShopPost::class)->where('type', 'page');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ShopMessage::class);
    }
}
