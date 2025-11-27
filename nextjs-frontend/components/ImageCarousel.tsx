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

  // Extract URLs from PostImage objects or use strings directly
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
    const dragThreshold = 50; // Minimum pixels to drag

    // Drag left - go to next image
    if (difference > dragThreshold) {
      goToNext();
    }
    // Drag right - go to previous image
    if (difference < -dragThreshold) {
      goToPrevious();
    }
  };

  const handleMouseLeave = () => {
    isMouseDown.current = false;
  };

  const handleSwipe = () => {
    const swipeThreshold = 50; // Minimum pixels to swipe
    const difference = touchStartX.current - touchEndX.current;

    // Swipe left - go to next image
    if (difference > swipeThreshold) {
      goToNext();
    }
    // Swipe right - go to previous image
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
      {/* Main Image */}
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
          alt={`Image ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />


        {/* Image Counter */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
            {currentIndex + 1}/{images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {hasMultipleImages && (
        <div className="flex gap-1 p-2 bg-gray-50 overflow-x-auto">
          {imageUrls.map((imgUrl, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors ${
                index === currentIndex ? 'border-blue-500' : 'border-gray-300'
              }`}
              aria-label={`Go to image ${index + 1}`}
            >
              <img src={imgUrl} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
