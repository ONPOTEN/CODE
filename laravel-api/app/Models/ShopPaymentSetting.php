<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopPaymentSetting extends Model
{
    protected $fillable = [
        'shop_id',
        'bank_name',
        'account_number',
        'account_holder',
        'upi_id',
        'phone',
        'qr_code',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }
}
