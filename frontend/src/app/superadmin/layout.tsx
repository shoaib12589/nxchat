'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SuperAdminRoute } from '@/components/auth/ProtectedRoute';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  return (
    <SuperAdminRoute>
      <AppShell>
        {children}
      </AppShell>
    </SuperAdminRoute>
  );
}
