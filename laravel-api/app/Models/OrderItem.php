<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'purchase_order_id',
        'shop_post_id',
        'product_name',
        'product_type',
        'quantity',
        'unit_price',
        'subtotal',
        'variant_options',
        'download_files',
        'link_files',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'variant_options' => 'array',
        'download_files' => 'json',
        'link_files' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the order this item belongs to
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    /**
     * Get the product this item refers to
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(ShopPost::class, 'shop_post_id');
    }

    /**
     * Scope: Get simple product items
     */
    public function scopeSimple($query)
    {
        return $query->where('product_type', 'Đơn giản');
    }

    /**
     * Scope: Get variant product items
     */
    public function scopeVariant($query)
    {
        return $query->where('product_type', 'Biến thể');
    }

    /**
     * Scope: Get download product items
     */
    public function scopeDownload($query)
    {
        return $query->where('product_type', 'Tải xuống');
    }

    /**
     * Scope: Filter by product type
     */
    public function scopeByProductType($query, string $productType)
    {
        return $query->where('product_type', $productType);
    }

    /**
     * Helper Methods
     */

    /**
     * Calculate line total (quantity * unit_price)
     */
    public function getLineTotal(): float
    {
        return (float) ($this->quantity * $this->unit_price);
    }

    /**
     * Check if it's a simple product
     */
    public function isSimpleProduct(): bool
    {
        return $this->product_type === 'Đơn giản';
    }

    /**
     * Check if it's a variant product
     */
    public function isVariantProduct(): bool
    {
        return $this->product_type === 'Biến thể';
    }

    /**
     * Check if it's a download product
     */
    public function isDownloadProduct(): bool
    {
        return $this->product_type === 'Tải xuống';
    }

    /**
     * Get variant options as formatted string
     * @return string Formatted variant options
     */
    public function getVariantString(): string
    {
        if (!$this->variant_options || !is_array($this->variant_options)) {
            return '';
        }

        $options = [];
        foreach ($this->variant_options as $name => $value) {
            $options[] = "{$name}: {$value}";
        }

        return implode(', ', $options);
    }

    /**
     * Get download file
     */
    public function getDownloadFile(): ?array
    {
        return $this->download_files;
    }

    /**
     * Get download links
     */
    public function getDownloadLinks(): array
    {
        return $this->link_files ?? [];
    }

    /**
     * Format unit price as Vietnamese currency
     */
    public function formatUnitPrice(): string
    {
        return number_format($this->unit_price, 0, '.', ',') . ' VND';
    }

    /**
     * Format subtotal as Vietnamese currency
     */
    public function formatSubtotal(): string
    {
        return number_format($this->subtotal, 0, '.', ',') . ' VND';
    }

    /**
     * Get discount amount if applicable
     */
    public function getDiscount(): float
    {
        $originalPrice = $this->product?->price ?? $this->unit_price;
        return max(0, ($originalPrice - $this->unit_price) * $this->quantity);
    }

    /**
     * Get discount percentage
     */
    public function getDiscountPercentage(): float
    {
        $originalPrice = $this->product?->price ?? $this->unit_price;
        if ($originalPrice == 0) {
            return 0;
        }
        return round((($originalPrice - $this->unit_price) / $originalPrice) * 100, 2);
    }
}
