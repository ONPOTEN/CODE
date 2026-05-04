'use client';

import { useState, useRef } from 'react';
import { PostImage } from '@/lib/api';

interface ImageCarouselProps {
  images: string[] | PostImage[];
  postId: number;
}

export function ImageCarousel({ images, postId }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const mouseStartX = useRef(0);
  const isMouseDown = useRef(false);

  // Trích xuất URL từ đối tượng PostImage hoặc sử dụng chuỗi trực tiếp
  const imageUrls = images.map((img) => {
    if (typeof img === 'string') {
      return img;
    }
    return img.url || '';
  }).filter(url => url);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? imageUrls.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === imageUrls.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDown.current = true;
    mouseStartX.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isMouseDown.current) return;
    isMouseDown.current = false;

    const difference = mouseStartX.current - e.clientX;
    const dragThreshold = 50; // Số pixel tối thiểu để kéo

    // Kéo sang trái - chuyển đến hình ảnh tiếp theo
    if (difference > dragThreshold) {
      goToNext();
    }
    // Kéo sang phải - chuyển về hình ảnh trước
    if (difference < -dragThreshold) {
      goToPrevious();
    }
  };

  const handleMouseLeave = () => {
    isMouseDown.current = false;
  };

  const handleSwipe = () => {
    const swipeThreshold = 50; // Số pixel tối thiểu để vuốt
    const difference = touchStartX.current - touchEndX.current;

    // Vuốt sang trái - chuyển đến hình ảnh tiếp theo
    if (difference > swipeThreshold) {
      goToNext();
    }
    // Vuốt sang phải - chuyển về hình ảnh trước
    if (difference < -swipeThreshold) {
      goToPrevious();
    }
  };

  if (!imageUrls || imageUrls.length === 0) {
    return null;
  }

  const hasMultipleImages = imageUrls.length > 1;

  return (
    <div className="relative mt-3 rounded-lg overflow-hidden bg-gray-100">
      {/* Hình ảnh chính */}
      <div
        className="relative w-full aspect-square cursor-grab active:cursor-grabbing select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={imageUrls[currentIndex]}
          alt={`Hình ảnh ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />


        {/* Bộ đếm hình ảnh */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
            {currentIndex + 1}/{images.length}
          </div>
        )}
      </div>

      {/* Điều hướng hình ảnh thu nhỏ */}
      {hasMultipleImages && (
        <div className="flex gap-1 p-2 bg-gray-50 overflow-x-auto">
          {imageUrls.map((imgUrl, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors ${
                index === currentIndex ? 'border-blue-500' : 'border-gray-300'
              }`}
              aria-label={`Đi đến hình ảnh ${index + 1}`}
            >
              <img src={imgUrl} alt={`Ảnh thu nhỏ ${index + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
