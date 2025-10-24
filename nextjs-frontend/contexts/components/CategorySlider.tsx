'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Category } from '@/types';

interface CategorySliderProps {
  categories: Category[];
}

export default function CategorySlider({ categories }: CategorySliderProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 p-5 min-w-max">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/danh-muc/${category.slug}`}
            className="flex flex-col items-center gap-2 w-28 hover:-translate-y-1 transition-transform"
          >
            {category.image?.src ? (
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-100">
                <Image
                  src={category.image.src}
                  alt={category.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
            )}
            <span className="text-sm text-center text-gray-700 font-medium line-clamp-2">
              {category.name}
            </span>
            {category.count && (
              <span className="text-xs text-gray-500">
                {category.count} sản phẩm
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
