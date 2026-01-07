'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SidebarContextType {
  isSidebarVisible: boolean;
  toggleSidebar: () => void;
  showSidebar: () => void;
  hideSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible(prev => !prev);
  }, []);

  const showSidebar = useCallback(() => {
    setIsSidebarVisible(true);
  }, []);

  const hideSidebar = useCallback(() => {
    setIsSidebarVisible(false);
  }, []);

  return (
    <SidebarContext.Provider value={{ isSidebarVisible, toggleSidebar, showSidebar, hideSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
