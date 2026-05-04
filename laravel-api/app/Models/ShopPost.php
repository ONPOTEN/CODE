<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShopPost extends Model
{
    protected $fillable = [
        'shop_id',
        'user_id',
        'category_id',
        'title',
        'slug',
        'content',
        'price_range',
        'type',
        'product_type',
        'status',
        'featured_images',
        'view_count',
        'price',
        'sale_price',
        'main_image',
        'other_images',
        'video',
        'video_upload_status',
        'video_upload_error',
        'categories',
        'short_description',
        'detail_description',
        'download_files',
        'link_files',
        'attributes',
    ];

    protected $casts = [
        'view_count' => 'integer',
        'featured_images' => 'array',
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'other_images' => 'array',
        'categories' => 'array',
        'download_files' => 'json',
        'link_files' => 'array',
        'attributes' => 'array',
    ];

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(WpUser::class, 'user_id', 'ID');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Engagement Relationships
     */

    public function likes(): HasMany
    {
        return $this->hasMany(ShopPostLike::class, 'post_id', 'id');
    }

    public function dislikes(): HasMany
    {
        return $this->hasMany(ShopPostDislike::class, 'post_id', 'id');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(ShopPostShare::class, 'post_id', 'id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(ShopPostComment::class, 'post_id', 'id');
    }

    /**
     * Get likes count
     */
    public function getLikesCount(): int
    {
        return $this->likes()->count();
    }

    /**
     * Get dislikes count
     */
    public function getDislikesCount(): int
    {
        return $this->dislikes()->count();
    }

    /**
     * Get shares count
     */
    public function getSharesCount(): int
    {
        return $this->shares()->count();
    }

    /**
     * Get comments count
     */
    public function getCommentsCount(): int
    {
        return $this->comments()->approved()->count();
    }

    /**
     * Check if a user has liked this post
     */
    public function hasUserLiked($userId): bool
    {
        return $this->likes()->where('user_id', $userId)->exists();
    }

    /**
     * Check if a user has disliked this post
     */
    public function hasUserDisliked($userId): bool
    {
        return $this->dislikes()->where('user_id', $userId)->exists();
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopePosts($query)
    {
        return $query->where('type', 'post');
    }

    public function scopePages($query)
    {
        return $query->where('type', 'page');
    }

    public function scopeSimpleProducts($query)
    {
        return $query->where('product_type', 'Đơn giản');
    }

    public function scopeVariantProducts($query)
    {
        return $query->where('product_type', 'Biến thể');
    }

    public function scopeDownloadProducts($query)
    {
        return $query->where('product_type', 'Tải xuống');
    }

    public function scopeByProductType($query, string $productType)
    {
        return $query->where('product_type', $productType);
    }

    /**
     * Helper Methods for Simple Products
     */

    /**
     * Get the discount percentage
     * @return float|null The discount percentage, or null if no sale price
     */
    public function getDiscountPercentage(): ?float
    {
        if (!$this->price || !$this->sale_price) {
            return null;
        }

        if ($this->price == 0) {
            return null;
        }

        return round((($this->price - $this->sale_price) / $this->price) * 100, 2);
    }

    /**
     * Check if product is on sale
     * @return bool True if sale_price is less than price
     */
    public function isOnSale(): bool
    {
        return $this->sale_price && $this->price && $this->sale_price < $this->price;
    }

    /**
     * Get the display price (sale_price if on sale, otherwise price)
     * @return float|null The price to display to customers
     */
    public function getDisplayPrice(): ?float
    {
        return $this->isOnSale() ? $this->sale_price : $this->price;
    }

    /**
     * Format price for display (with thousands separator)
     * @param float|null $priceValue The price to format (uses display price if not provided)
     * @return string Formatted price string
     */
    public function formatPrice(?float $priceValue = null): string
    {
        $price = $priceValue ?? $this->getDisplayPrice();
        if ($price === null) {
            return '0 VND';
        }
        return number_format($price, 0, '.', ',') . ' VND';
    }

    /**
     * Get all image URLs (main image + other images)
     * @return array Array of image URLs
     */
    public function getAllImages(): array
    {
        $images = [];

        if ($this->main_image) {
            $images[] = $this->main_image;
        }

        if ($this->other_images && is_array($this->other_images)) {
            $images = array_merge($images, $this->other_images);
        }

        return $images;
    }

    /**
     * Get category names as array
     * @return array Array of category names
     */
    public function getCategoryNames(): array
    {
        if (!$this->categories || !is_array($this->categories)) {
            return [];
        }

        return array_map(function ($category) {
            return is_array($category) ? ($category['name'] ?? '') : $category;
        }, $this->categories);
    }

    /**
     * Helper Methods for Download Products
     */

    /**
     * Get downloadable file
     * @return array|null Single downloadable file object or null
     */
    public function getDownloadFile(): ?array
    {
        if (!$this->download_files || !is_array($this->download_files)) {
            return null;
        }

        return $this->download_files;
    }

    /**
     * Get external links
     * @return array Array of external links
     */
    public function getLinkFiles(): array
    {
        if (!$this->link_files || !is_array($this->link_files)) {
            return [];
        }

        return $this->link_files;
    }

    /**
     * Get total number of downloads available (file + links)
     * @return int Total downloadable items
     */
    public function getTotalDownloads(): int
    {
        $fileCount = $this->getDownloadFile() ? 1 : 0;
        return $fileCount + count($this->getLinkFiles());
    }

    /**
     * Check if product has downloadable file
     * @return bool True if product has file
     */
    public function hasDownloadFile(): bool
    {
        return $this->getDownloadFile() !== null;
    }

    /**
     * Check if product has external links
     * @return bool True if product has links
     */
    public function hasLinkFiles(): bool
    {
        return count($this->getLinkFiles()) > 0;
    }

    /**
     * Get file name from download file object
     * @param array|null $file File object with name and url (if null, uses $this->download_files)
     * @return string File name
     */
    public function getFileName(?array $file = null): string
    {
        $fileObj = $file ?? $this->getDownloadFile();
        if (!$fileObj) {
            return '';
        }
        return $fileObj['name'] ?? basename($fileObj['url'] ?? '');
    }

    /**
     * Get link title from link file object
     * @param array $link Link object with title and url
     * @return string Link title
     */
    public function getLinkTitle(array $link): string
    {
        return $link['title'] ?? $link['url'] ?? 'Download';
    }

    /**
     * Helper Methods for Variant Products
     */

    /**
     * Get product attributes
     * @return array Array of product attributes
     */
    public function getAttributes(): array
    {
        if (!$this->attributes || !is_array($this->attributes)) {
            return [];
        }

        return $this->attributes;
    }

    /**
     * Get attribute names
     * @return array Array of attribute names
     */
    public function getAttributeNames(): array
    {
        $attributes = $this->getAttributes();

        if (empty($attributes)) {
            return [];
        }

        return array_map(function ($attribute) {
            return is_array($attribute) ? ($attribute['name'] ?? '') : $attribute;
        }, $attributes);
    }

    /**
     * Get attribute options for a specific attribute
     * @param string $attributeName The attribute name to get options for
     * @return array Array of options for the attribute
     */
    public function getAttributeOptions(string $attributeName): array
    {
        $attributes = $this->getAttributes();

        foreach ($attributes as $attribute) {
            if (is_array($attribute) && ($attribute['name'] ?? '') === $attributeName) {
                return $attribute['options'] ?? [];
            }
        }

        return [];
    }

    /**
     * Check if product has attributes
     * @return bool True if product has attributes
     */
    public function hasAttributes(): bool
    {
        return count($this->getAttributes()) > 0;
    }

    /**
     * Get total number of attribute options
     * @return int Total number of options across all attributes
     */
    public function getTotalAttributeOptions(): int
    {
        $total = 0;
        foreach ($this->getAttributes() as $attribute) {
            if (is_array($attribute) && isset($attribute['options'])) {
                $total += count($attribute['options']);
            }
        }

        return $total;
    }

    /**
     * Get attribute by name
     * @param string $attributeName The attribute name
     * @return array|null The attribute data or null if not found
     */
    public function getAttributeByName(string $attributeName): ?array
    {
        $attributes = $this->getAttributes();

        foreach ($attributes as $attribute) {
            if (is_array($attribute) && ($attribute['name'] ?? '') === $attributeName) {
                return $attribute;
            }
        }

        return null;
    }
}
