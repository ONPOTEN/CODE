import { useState } from 'react';

interface ShopImagesCarouselProps {
  image1?: string | null;
  image2?: string | null;
  image3?: string | null;
  image4?: string | null;
  image5?: string | null;
}

interface ImageSet {
  title: string;
  images: { url: string; label: string }[];
}

export default function ShopImagesCarousel({
  image1,
  image2,
  image3,
  image4,
  image5,
}: ShopImagesCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const imageSets: ImageSet[] = [];

  // Build image sets
  if (image1 || image2) {
    imageSets.push({
      title: 'Giấy phép kinh doanh',
      images: [
        ...(image1 ? [{ url: image1, label: 'Giấy DKKD' }] : []),
        ...(image2 ? [{ url: image2, label: 'Giấy phép kinh doanh' }] : []),
      ],
    });
  }
  if (image2 || image3) {
    imageSets.push({
      title: 'Chứng chỉ liên quan',
      images: [
        ...(image2 ? [{ url: image2, label: 'Giấy phép kinh doanh' }] : []),
        ...(image3 ? [{ url: image3, label: 'Chứng chỉ liên quan' }] : []),
      ],
    });
  }
  if (image3 || image4) {
    imageSets.push({
      title: 'Hình ảnh cửa hàng',
      images: [
        ...(image3 ? [{ url: image3, label: 'Chứng chỉ liên quan' }] : []),
        ...(image4 ? [{ url: image4, label: 'Hình ảnh cửa hàng' }] : []),
      ],
    });
  }
  if (image4 || image5) {
    imageSets.push({
      title: 'Hình ảnh bổ sung',
      images: [
        ...(image4 ? [{ url: image4, label: 'Hình ảnh cửa hàng' }] : []),
        ...(image5 ? [{ url: image5, label: 'Ảnh bổ sung' }] : []),
      ],
    });
  }
  if (image5 || image1) {
    imageSets.push({
      title: 'Ảnh bổ sung',
      images: [
        ...(image5 ? [{ url: image5, label: 'Ảnh bổ sung' }] : []),
        ...(image1 ? [{ url: image1, label: 'Giấy DKKD' }] : []),
      ],
    });
  }

  if (imageSets.length === 0) return null;

  const currentSet = imageSets[currentIndex % imageSets.length];

  const handleTouchStart = (e: React.TouchEvent) => {
    e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const touchStart = e.targetTouches[0].clientX;
    if (touchStart - touchEnd > 50) {
      setCurrentIndex((prev) => (prev + 1) % imageSets.length);
    } else if (touchEnd - touchStart > 50) {
      setCurrentIndex((prev) => (prev - 1 + imageSets.length) % imageSets.length);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 px-6 py-4">
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Thông tin cửa hàng
        </h2>
      </div>

      {/* Carousel */}
      <div
        className="relative p-4 md:p-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Images Grid */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {currentSet.images.map((image, idx) => (
            <button
              key={idx}
              onClick={() => window.open(image.url, '_blank')}
              className="group relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <img
                src={image.url}
                alt={image.label}
                className="w-full h-full object-cover"
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                <span className="text-white text-xs font-medium">{image.label}</span>
              </div>
              {/* Zoom icon */}
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % imageSets.length)}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-110 md:right-4"
          aria-label="Next"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentIndex((prev) => (prev - 1 + imageSets.length) % imageSets.length)}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-110 md:left-4"
          aria-label="Previous"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {imageSets.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentIndex % imageSets.length === i
                  ? 'w-8 bg-gradient-to-r from-orange-500 to-red-500 shadow-md'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to image set ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
