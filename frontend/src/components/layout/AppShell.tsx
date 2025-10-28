'use client';

import React, { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={cn(
          "flex-1 transition-all duration-300 bg-[#F5F7FA]",
          "lg:ml-72", // Account for sidebar width on desktop (288px)
          "pt-16" // Account for navbar height
        )}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
