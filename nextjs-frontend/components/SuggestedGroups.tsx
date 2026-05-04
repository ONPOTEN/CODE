'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { groups, Group } from '@/lib/api';

interface SuggestedGroupsProps {
  currentGroupId?: number;
  layout?: 'vertical' | 'horizontal';
}

export default function SuggestedGroups({ currentGroupId, layout = 'vertical' }: SuggestedGroupsProps) {
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchSuggestedGroups = async () => {
      try {
        setLoading(true);
        // Using index for suggestions since we might not have enough popular groups
        const response = await groups.index({ per_page: 10 });
        let groupsList = response.data || [];
        
        // Filter out the current group
        if (currentGroupId) {
          groupsList = groupsList.filter(g => g.group_id !== currentGroupId);
        }
        
        // Shuffle and pick up to 5 groups
        groupsList = groupsList.sort(() => 0.5 - Math.random()).slice(0, 5);
        
        setSuggestedGroups(groupsList);
      } catch (error) {
        console.error('Failed to fetch suggested groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestedGroups();
  }, [currentGroupId]);

  useEffect(() => {
    handleScroll();
  }, [suggestedGroups, layout]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-4 text-lg">Gợi ý nhóm</h3>
        <div className={layout === 'horizontal' ? "flex gap-4 overflow-x-hidden" : "space-y-4"}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={layout === 'horizontal' ? "w-60 flex-none border border-gray-200 rounded-lg p-3 flex flex-col items-center animate-pulse" : "animate-pulse flex items-center gap-3"}>
              <div className={layout === 'horizontal' ? "w-16 h-16 bg-gray-200 rounded-lg mb-3" : "w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0"}></div>
              <div className={layout === 'horizontal' ? "w-full space-y-2 flex flex-col items-center" : "flex-1 min-w-0 space-y-2"}>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                {layout === 'horizontal' && <div className="h-8 bg-gray-200 rounded w-full mt-2"></div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestedGroups.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-lg">Gợi ý nhóm</h3>
        <Link href="/groups" className="text-sm text-blue-600 hover:underline">
          Xem tất cả
        </Link>
      </div>
      
      {layout === 'horizontal' ? (
        <div className="relative group w-full overflow-hidden">
          {showLeftArrow && (
            <button 
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 z-10 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 focus:outline-none"
              aria-label="Scroll left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto gap-4 pb-2 snap-x scrollbar-hide scroll-smooth"
          >
            {suggestedGroups.map((group) => (
              <div key={group.group_id} className="flex-none w-[200px] border border-gray-200 rounded-lg p-3 snap-start flex flex-col items-center text-center bg-white hover:bg-gray-50 transition-colors">
                <Link href={`/groups/${group.group_id}`} className="mb-3">
                  {group.avatar ? (
                    <img 
                      src={group.avatar} 
                      alt={group.group_name} 
                      className="w-16 h-16 rounded-lg object-cover border border-gray-100 mx-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl mx-auto">
                      {group.group_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                
                <div className="flex-1 w-full">
                  <Link href={`/groups/${group.group_id}`}>
                    <h4 className="font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors">
                      {group.group_name}
                    </h4>
                  </Link>
                  <div className="text-xs text-gray-500 mt-1 mb-3">
                    <span>{group.members_count || 0} thành viên</span>
                  </div>
                </div>
                
                <Link 
                  href={`/groups/${group.group_id}`}
                  className="w-full py-1.5 flex justify-center items-center bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md text-sm font-medium transition-colors"
                >
                  Tham gia
                </Link>
              </div>
            ))}
          </div>

          {showRightArrow && suggestedGroups.length > 0 && (
            <button 
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2 z-10 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 focus:outline-none"
              aria-label="Scroll right"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {suggestedGroups.map((group) => (
            <div key={group.group_id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link href={`/groups/${group.group_id}`} className="flex-shrink-0">
                {group.avatar ? (
                  <img 
                    src={group.avatar} 
                    alt={group.group_name} 
                    className="w-12 h-12 rounded-lg object-cover border border-gray-100"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                    {group.group_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              
              <div className="flex-1 min-w-0">
                <Link href={`/groups/${group.group_id}`}>
                  <h4 className="font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors">
                    {group.group_name}
                  </h4>
                </Link>
                <div className="flex items-center text-xs text-gray-500 mt-0.5">
                  <span>{group.members_count || 0} thành viên</span>
                  {group.posts_count ? (
                    <>
                      <span className="mx-1">•</span>
                      <span>{group.posts_count} bài viết</span>
                    </>
                  ) : null}
                </div>
              </div>
              
              <Link 
                href={`/groups/${group.group_id}`}
                className="mt-2 sm:mt-0 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              >
                Tham gia
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
