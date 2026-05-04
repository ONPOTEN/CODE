'use client';

import React from 'react';
import { useSidebar } from '@/contexts/SidebarContext';

interface MainLayoutProps {
  children: React.ReactNode;
  showFeedContainer?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, showFeedContainer = true }) => {
  const { isSidebarVisible } = useSidebar();

  return (
    <main className={`w-full transition-[margin-left] duration-300 ease-in-out ${showFeedContainer && isSidebarVisible ? 'lg:ml-sidebar' : ''}`}>
      {/* Desktop: Sidebar is fixed, content has margin-left. Mobile: Full width */}
      <div className={showFeedContainer ? 'feed-container pt-4 pb-20 lg:pb-4' : 'w-full pb-20 lg:pb-4'}>
        {children}
      </div>
    </main>
  );
};

export default MainLayout;
