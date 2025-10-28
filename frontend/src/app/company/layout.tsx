'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { CompanyAdminRoute } from '@/components/auth/ProtectedRoute';

interface CompanyLayoutProps {
  children: React.ReactNode;
}

export default function CompanyLayout({ children }: CompanyLayoutProps) {
  return (
    <CompanyAdminRoute>
      <AppShell>
        {children}
      </AppShell>
    </CompanyAdminRoute>
  );
}
