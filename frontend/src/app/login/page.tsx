'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, user, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean>(true);

  // Check registration status
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await apiClient.getRegistrationStatus();
        setRegistrationEnabled(response.enabled);
      } catch (error: any) {
        // Silently fail if backend is offline - this is expected behavior
        // Only log non-network errors
        if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
          console.error('Failed to check registration status:', error);
        }
        // On error, assume registration is enabled
        setRegistrationEnabled(true);
      }
    };

    checkRegistrationStatus();
  }, []);

  // Redirect after successful login
  useEffect(() => {
    console.log('Login page useEffect - isAuthenticated:', isAuthenticated, 'user:', user);
    if (isAuthenticated && user) {
      console.log('Redirecting user with role:', user.role);
      setSuccessMessage(`Welcome back, ${user.name}! Redirecting...`);
      // Add a small delay to ensure auth state is fully updated
      setTimeout(() => {
        switch (user.role) {
          case 'super_admin':
            console.log('Redirecting to /superadmin');
            router.replace('/superadmin');
            break;
          case 'company_admin':
            console.log('Redirecting to /company');
            router.replace('/company');
            break;
          case 'agent':
            console.log('Redirecting to /agent');
            router.replace('/agent');
            break;
          default:
            console.log('Redirecting to /login (default)');
            router.replace('/login');
        }
      }, 1000);
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage(null);
    setIsMaintenanceMode(false);

    try {
      await login(formData);
      // Success message will be set by useEffect when user state updates
    } catch (error: any) {
      // Check if it's a maintenance mode error
      if (error.response?.data?.maintenance_mode) {
        setIsMaintenanceMode(true);
      }
      // Error is handled by the store
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    
    // Clear any existing errors when user starts typing
    if (error) {
      clearError();
    }
    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your NxChat account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMaintenanceMode && (
              <Alert className="mb-6 border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200">
                <AlertDescription>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">System Maintenance</span>
                  </div>
                  <p className="mt-2 text-sm">
                    The system is currently under maintenance. 
                    Please try again later.
                  </p>
                </AlertDescription>
              </Alert>
            )}
            
            {error && !isMaintenanceMode && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {successMessage && (
              <Alert className="mb-6 border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading || isMaintenanceMode}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading || isMaintenanceMode}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || isMaintenanceMode}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isMaintenanceMode}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : isMaintenanceMode ? (
                  'System Under Maintenance'
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            {registrationEnabled && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link
                    href="/register"
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
}
