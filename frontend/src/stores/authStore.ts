import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginRequest, RegisterRequest } from '@/types';
import apiClient from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true, // Start with loading true
      error: null,

      // Actions
      login: async (credentials: LoginRequest) => {
        console.log('Auth store login called with:', credentials);
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.login(credentials);
          console.log('Login API response:', response);
          
          if (response.success && response.data) {
            const { user, token, refresh_token } = response.data;
            console.log('Login successful, user:', user, 'token:', token);
            
            // Store tokens in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('refresh_token', refresh_token);
            
            set({
              user,
              token,
              refreshToken: refresh_token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            console.log('Auth state updated successfully');
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error: any) {
          console.error('Login error:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
          });
          throw error;
        }
      },

      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.register(userData);
          
          if (response.success && response.data) {
            const { user, token, refresh_token } = response.data;
            
            // Store tokens in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('refresh_token', refresh_token);
            
            set({
              user,
              token,
              refreshToken: refresh_token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(response.message || 'Registration failed');
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          await apiClient.logout();
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API call failed:', error);
        } finally {
          // Clear tokens from localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }

        try {
          const response = await apiClient.getProfile();
          
          if (response.success && response.data) {
            set({
              user: response.data,
              isAuthenticated: true,
              error: null,
              isLoading: false,
            });
          } else {
            throw new Error('Failed to refresh auth');
          }
        } catch (error) {
          // Refresh failed, clear auth state
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Session expired. Please login again.',
          });
        }
      },

      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.updateProfile(data);
          
          if (response.success && response.data) {
            set({
              user: response.data,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(response.message || 'Profile update failed');
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Profile update failed';
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Auth initialization is now handled by AuthInitializer component
