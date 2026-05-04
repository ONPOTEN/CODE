import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.images[0]?.src || '/placeholder-product.jpg';
  const discount = product.on_sale && product.regular_price
    ? Math.round(((parseFloat(product.regular_price) - parseFloat(product.price)) / parseFloat(product.regular_price)) * 100)
    : 0;

  return (
    <Link href={`/san-pham/${product.slug}`}>
      <div className="product-card cursor-pointer h-full">
        <div className="relative aspect-square">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />

          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-0 right-0 z-10">
              <div className="relative flex items-center h-4 px-1 bg-yellow-400 text-primary text-xs font-medium">
                <span className="text-[10px] leading-none">{discount}% GIẢM</span>
              </div>
              {/* Triangle decoration */}
              <div className="absolute left-0 bottom-[-4px] border-t-[4px] border-t-yellow-600/90 border-l-[19px] border-l-transparent border-r-[19px] border-r-yellow-600/90"></div>
            </div>
          )}
        </div>

        <div className="p-2">
          {/* Product Name */}
          <h3 className="text-sm text-gray-800 line-clamp-2 h-10 mb-1">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-2 h-9 pt-2">
            <span className="text-primary text-base font-light">
              {parseInt(product.price).toLocaleString('vi-VN')}đ
            </span>
            {product.on_sale && product.regular_price && (
              <span className="text-gray-500 text-xs line-through font-light">
                {parseInt(product.regular_price).toLocaleString('vi-VN')}đ
              </span>
            )}
          </div>

          {/* Rating & Sold */}
          {product.rating_count > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <div className="flex items-center">
                <span className="text-primary">★</span>
                <span className="ml-1">{product.average_rating}</span>
              </div>
              <span>•</span>
              <span>Đã bán {product.rating_count}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
