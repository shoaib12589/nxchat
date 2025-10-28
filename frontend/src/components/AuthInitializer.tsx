'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useHydrationFix } from '@/hooks/useHydrationFix';

export const AuthInitializer: React.FC = () => {
  useHydrationFix(); // Suppress hydration warnings from browser extensions

  useEffect(() => {
    // Initialize auth state from localStorage only on client side
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (token && refreshToken) {
      // Set authentication state immediately
      useAuthStore.setState({
        token,
        refreshToken,
        isAuthenticated: true,
        isLoading: true // Keep loading true while verifying session
      });
      
      // Then verify the session with the server
      useAuthStore.getState().refreshAuth().finally(() => {
        // Set loading to false after verification attempt
        useAuthStore.setState({ isLoading: false });
      });
    } else {
      // No tokens found, ensure user is not authenticated
      useAuthStore.setState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  }, []);

  return null; // This component doesn't render anything
};
