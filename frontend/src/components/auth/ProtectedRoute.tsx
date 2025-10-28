'use client';

import React, { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { User } from '@/types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: User['role'][];
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  requireAuth = true,
}) => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return; // Wait for auth state to load

    if (requireAuth && !isAuthenticated) {
      // Redirect to login if not authenticated
      router.push('/login');
      return;
    }

    if (isAuthenticated && user && allowedRoles.length > 0) {
      // Check if user has required role
      if (!allowedRoles.includes(user.role)) {
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
        return;
      }
    }
  }, [isAuthenticated, user, isLoading, allowedRoles, requireAuth, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render children if not authenticated and auth is required
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Don't render children if user doesn't have required role
  if (isAuthenticated && user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
};

// Convenience components for different role-based routes
export const SuperAdminRoute: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['super_admin']}>{children}</ProtectedRoute>
);

export const CompanyAdminRoute: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['company_admin']}>{children}</ProtectedRoute>
);

export const AgentRoute: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['agent']}>{children}</ProtectedRoute>
);

export const AdminRoute: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['super_admin', 'company_admin']}>{children}</ProtectedRoute>
);

export const AuthenticatedRoute: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['super_admin', 'company_admin', 'agent']}>{children}</ProtectedRoute>
);
