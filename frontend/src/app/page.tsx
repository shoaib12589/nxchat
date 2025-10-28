'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Redirect based on user role
        switch (user.role) {
          case 'super_admin':
            router.push('/superadmin');
            break;
          case 'company_admin':
            router.push('/company');
            break;
          case 'agent':
            router.push('/agent');
            break;
          default:
            router.push('/login');
        }
      } else {
        // Redirect to login if not authenticated
        router.push('/login');
      }
    }
  }, [isAuthenticated, user, router, isLoading]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Redirecting...</span>
      </div>
    </div>
  );
}