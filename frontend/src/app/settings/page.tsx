'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Redirect to role-specific settings page
      switch (user.role) {
        case 'super_admin':
          router.replace('/superadmin/settings');
          break;
        case 'company_admin':
          router.replace('/company/settings');
          break;
        case 'agent':
          router.replace('/agent/settings');
          break;
        default:
          router.replace('/profile');
      }
    } else if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, user, router, isLoading]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Redirecting to settings...</span>
      </div>
    </div>
  );
}
