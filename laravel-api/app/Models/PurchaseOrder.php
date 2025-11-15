<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    protected $fillable = [
        'user_id',
        'shop_id',
        'order_number',
        'status',
        'subtotal',
        'tax',
        'shipping_fee',
        'discount',
        'total_amount',
        'notes',
        'shipping_address',
        'billing_address',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'shipping_address' => 'array',
        'billing_address' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the customer who made this order
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'user_id', 'ID');
    }

    /**
     * Get the shop for this order
     */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    /**
     * Get all items in this order
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Scope: Get simple product items
     * Query items with product_type "Đơn giản"
     */
    public function simpleProducts()
    {
        return $this->items()->where('product_type', 'Đơn giản');
    }

    /**
     * Scope: Get variant product items
     * Query items with product_type "Biến thể"
     */
    public function variantProducts()
    {
        return $this->items()->where('product_type', 'Biến thể');
    }

    /**
     * Scope: Get download product items
     * Query items with product_type "Tải xuống"
     */
    public function downloadProducts()
    {
        return $this->items()->where('product_type', 'Tải xuống');
    }

    /**
     * Scope: Filter by order status
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeProcessing($query)
    {
        return $query->where('status', 'processing');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByCustomer($query, int $customerId)
    {
        return $query->where('user_id', $customerId);
    }

    public function scopeByShop($query, int $shopId)
    {
        return $query->where('shop_id', $shopId);
    }

    /**
     * Helper Methods
     */

    /**
     * Generate a unique order number
     */
    public static function generateOrderNumber(): string
    {
        $prefix = 'ORD-';
        $timestamp = date('YmdHis'); // YYYYMMDDHHMISS
        $random = str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

        return $prefix . $timestamp . '-' . $random;
    }

    /**
     * Get count of simple product items
     */
    public function getSimpleProductsCount(): int
    {
        return $this->simpleProducts()->count();
    }

    /**
     * Get count of variant product items
     */
    public function getVariantProductsCount(): int
    {
        return $this->variantProducts()->count();
    }

    /**
     * Get count of download product items
     */
    public function getDownloadProductsCount(): int
    {
        return $this->downloadProducts()->count();
    }

    /**
     * Check if order contains simple products
     */
    public function hasSimpleProducts(): bool
    {
        return $this->getSimpleProductsCount() > 0;
    }

    /**
     * Check if order contains variant products
     */
    public function hasVariantProducts(): bool
    {
        return $this->getVariantProductsCount() > 0;
    }

    /**
     * Check if order contains download products
     */
    public function hasDownloadProducts(): bool
    {
        return $this->getDownloadProductsCount() > 0;
    }

    /**
     * Get total item count
     */
    public function getTotalItemsCount(): int
    {
        return $this->items()->sum('quantity');
    }

    /**
     * Format order total as Vietnamese currency
     */
    public function formatTotal(): string
    {
        return number_format($this->total_amount, 0, '.', ',') . ' VND';
    }

    /**
     * Format subtotal as Vietnamese currency
     */
    public function formatSubtotal(): string
    {
        return number_format($this->subtotal, 0, '.', ',') . ' VND';
    }

    /**
     * Calculate and get tax amount
     */
    public function getTaxAmount(): float
    {
        return (float) $this->tax;
    }

    /**
     * Calculate and get shipping fee
     */
    public function getShippingFee(): float
    {
        return (float) $this->shipping_fee;
    }

    /**
     * Calculate and get discount amount
     */
    public function getDiscount(): float
    {
        return (float) $this->discount;
    }

    /**
     * Get percentage of discount
     */
    public function getDiscountPercentage(): float
    {
        if ($this->subtotal == 0) {
            return 0;
        }
        return round(($this->discount / $this->subtotal) * 100, 2);
    }

    /**
     * Check if order is paid
     */
    public function isPaid(): bool
    {
        return $this->status === 'completed' || $this->status === 'processing';
    }

    /**
     * Check if order is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if order is cancelled
     */
    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }
}
