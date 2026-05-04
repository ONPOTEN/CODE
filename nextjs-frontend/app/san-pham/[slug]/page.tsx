import { getProduct, getProducts } from '@/lib/wordpress';
import { Product } from '@/types';
import Image from 'next/image';
import AddToCartButton from '@/components/AddToCartButton';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  // Lấy tất cả sản phẩm và tìm theo slug (hạn chế của API WordPress)
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
      <div className="bg-grey-200 rounded-sm shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Hình ảnh sản phẩm */}
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

            {/* Thư viện hình ảnh thu nhỏ */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.slice(0, 5).map((image, index) => (
                  <div key={image.id} className="relative aspect-square border border-gray-300 rounded-sm overflow-hidden cursor-pointer hover:border-primary">
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

          {/* Thông tin sản phẩm */}
          <div>
            <h1 className="text-2xl font-medium mb-4">{product.name}</h1>

            {/* Đánh giá */}
            {product.rating_count > 0 && (
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center">
                  <span className="text-primary mr-1">★</span>
                  <span className="text-primary mr-2">{product.average_rating}</span>
                  <span className="text-gray-500">({product.rating_count} đánh giá)</span>
                </div>
              </div>
            )}

            {/* Giá */}
            <div className="bg-white p-5 mb-6 rounded-sm">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl text-primary font-medium">
                  {parseInt(product.price).toLocaleString('vi-VN')}đ
                </span>
                {product.on_sale && product.regular_price && (
                  <>
                    <span className="text-lg text-gray-500 line-through">
                      {parseInt(product.regular_price).toLocaleString('vi-VN')}đ
                    </span>
                    <span className="bg-primary text-gray-900 px-2 py-1 rounded-sm text-sm">
                      -{discount}%
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Thuộc tính/Biến thể */}
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

            {/* Trạng thái tồn kho */}
            <div className="mb-6">
              <span className={`text-sm ${product.stock_status === 'instock' ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock_status === 'instock' ? '✓ Còn hàng' : '✗ Hết hàng'}
              </span>
            </div>

            {/* Thêm vào giỏ hàng */}
            <AddToCartButton product={product} />

            {/* Mô tả */}
            <div className="mt-8 pt-8 border-t border-gray-300">
              <h3 className="text-lg font-medium mb-4 uppercase text-gray-700 bg-blue-500 p-4">
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
