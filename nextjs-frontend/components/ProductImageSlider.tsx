'use client';

import { useState, useRef } from 'react';

interface ProductImageSliderProps {
  images: string[];
  title: string;
}

export function ProductImageSlider({ images, title }: ProductImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const mouseStartX = useRef(0);
  const isMouseDown = useRef(false);

  const imageUrls = images.filter(url => url);

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
    const dragThreshold = 50;

    if (difference > dragThreshold) {
      goToNext();
    }
    if (difference < -dragThreshold) {
      goToPrevious();
    }
  };

  const handleMouseLeave = () => {
    isMouseDown.current = false;
  };

  const handleSwipe = () => {
    const swipeThreshold = 50;
    const difference = touchStartX.current - touchEndX.current;

    if (difference > swipeThreshold) {
      goToNext();
    }
    if (difference < -swipeThreshold) {
      goToPrevious();
    }
  };

  if (!imageUrls || imageUrls.length === 0) {
    return null;
  }

  const hasMultipleImages = imageUrls.length > 1;

  return (
    <div className="rounded-lg overflow-hidden shadow-md">
      {/* Main Image Container */}
      <div
        className="relative w-full cursor-grab active:cursor-grabbing select-none"
        style={{ maxHeight: '400px' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={imageUrls[currentIndex]}
          alt={`${title} - Image ${currentIndex + 1}`}
          className="w-full h-auto max-h-96 object-contain bg-gray-100 rounded-lg"
          onClick={() => window.open(imageUrls[currentIndex], '_blank')}
        />

        {/* Image Counter */}
        {hasMultipleImages && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm font-medium">
            {currentIndex + 1} / {imageUrls.length}
          </div>
        )}

        {/* Navigation Arrows - Always Visible */}
        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 md:p-3 rounded-full shadow-md transition-opacity z-10"
              aria-label="Previous image"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 md:p-3 rounded-full shadow-md transition-opacity z-10"
              aria-label="Next image"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {hasMultipleImages && (
        <div className="flex gap-2 p-3 bg-gray-50 overflow-x-auto">
          {imageUrls.map((imgUrl, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-blue-500 scale-105 shadow-md'
                  : 'border-gray-300 opacity-70 hover:opacity-100'
              }`}
              aria-label={`Go to image ${index + 1}`}
            >
              <img
                src={imgUrl}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
