'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AgentRoute } from '@/components/auth/ProtectedRoute';

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  return (
    <AgentRoute>
      <AppShell>
        {children}
      </AppShell>
    </AgentRoute>
  );
}
