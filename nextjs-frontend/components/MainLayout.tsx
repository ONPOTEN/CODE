'use client';

import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
  showFeedContainer?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, showFeedContainer = true }) => {
  return (
    <main className={`w-full ${showFeedContainer ? 'lg:ml-sidebar' : ''}`}>
      {/* Desktop: Sidebar is fixed, content has margin-left. Mobile: Full width */}
      <div className={showFeedContainer ? 'feed-container pt-4 pb-20 lg:pb-4' : 'w-full pb-20 lg:pb-4'}>
        {children}
      </div>
    </main>
  );
};

export default MainLayout;
