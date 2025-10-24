import { getProduct, getProducts } from '@/lib/wordpress';
import { Product } from '@/types';
import Image from 'next/image';
import AddToCartButton from '@/components/AddToCartButton';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  // Fetch all products and find by slug (WordPress API limitation)
  const products = await getProducts({ per_page: 100 }) as Product[];
  const product = products.find(p => p.slug === slug);

  if (!product) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Không tìm thấy sản phẩm</h1>
      </div>
    );
  }

  const mainImage = product.images[0]?.src || '/placeholder-product.jpg';
  const discount = product.on_sale && product.regular_price
    ? Math.round(((parseFloat(product.regular_price) - parseFloat(product.price)) / parseFloat(product.regular_price)) * 100)
    : 0;

  return (
    <div className="container py-6">
      <div className="bg-white rounded-sm shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <div className="relative aspect-square mb-4">
              <Image
                src={mainImage}
                alt={product.name}
                fill
                className="object-cover rounded-sm"
                priority
              />
            </div>

            {/* Thumbnail Gallery */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.slice(0, 5).map((image, index) => (
                  <div key={image.id} className="relative aspect-square border border-gray-200 rounded-sm overflow-hidden cursor-pointer hover:border-primary">
                    <Image
                      src={image.src}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-2xl font-medium mb-4">{product.name}</h1>

            {/* Rating */}
            {product.rating_count > 0 && (
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center">
                  <span className="text-primary mr-1">★</span>
                  <span className="text-primary mr-2">{product.average_rating}</span>
                  <span className="text-gray-500">({product.rating_count} đánh giá)</span>
                </div>
              </div>
            )}

            {/* Price */}
            <div className="bg-gray-50 p-5 mb-6 rounded-sm">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl text-primary font-medium">
                  {parseInt(product.price).toLocaleString('vi-VN')}đ
                </span>
                {product.on_sale && product.regular_price && (
                  <>
                    <span className="text-lg text-gray-500 line-through">
                      {parseInt(product.regular_price).toLocaleString('vi-VN')}đ
                    </span>
                    <span className="bg-primary text-white px-2 py-1 rounded-sm text-sm">
                      -{discount}%
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Attributes/Variations */}
            {product.attributes.length > 0 && (
              <div className="mb-6">
                {product.attributes.map((attr) => (
                  <div key={attr.id} className="mb-4">
                    <label className="block text-sm text-gray-600 mb-2">
                      {attr.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {attr.options.map((option, index) => (
                        <button
                          key={index}
                          className="min-w-20 px-4 py-2 border border-gray-300 rounded-sm hover:border-primary hover:text-primary transition-colors"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stock Status */}
            <div className="mb-6">
              <span className={`text-sm ${product.stock_status === 'instock' ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock_status === 'instock' ? '✓ Còn hàng' : '✗ Hết hàng'}
              </span>
            </div>

            {/* Add to Cart */}
            <AddToCartButton product={product} />

            {/* Description */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-medium mb-4 uppercase text-gray-700 bg-gray-100 p-4">
                Chi tiết sản phẩm
              </h3>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
