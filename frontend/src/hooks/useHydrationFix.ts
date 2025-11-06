'use client';

import { useEffect } from 'react';

export const useHydrationFix = () => {
  useEffect(() => {
    // Suppress hydration warnings caused by browser extensions
    const originalError = console.error;
    console.error = (...args) => {
      // Suppress hydration warnings from browser extensions
      if (
        typeof args[0] === 'string' &&
        args[0].includes('Hydration failed') &&
        args[0].includes('bis_skin_checked')
      ) {
        return;
      }

      // Suppress network connection errors when backend is offline (expected behavior)
      const firstArg = args[0];
      
      // Check for AxiosError with network issues
      if (firstArg && typeof firstArg === 'object') {
        const errorObj = firstArg as any;
        if (
          errorObj.name === 'AxiosError' ||
          errorObj.code === 'ERR_NETWORK' ||
          errorObj.message === 'Network Error'
        ) {
          // Backend is offline - this is expected, don't log
          return;
        }
      }
      
      // Check string messages for network/auth errors
      if (typeof firstArg === 'string') {
        if (
          firstArg.includes('ERR_CONNECTION_REFUSED') || 
          firstArg.includes('Network Error') ||
          firstArg.includes('Failed to update favicon') ||
          firstArg.includes('Failed to check registration status') ||
          firstArg.includes('401') ||
          firstArg.includes('Unauthorized')
        ) {
          // Backend is offline or user not authenticated - this is expected, don't log
          return;
        }
      }
      
      // Check if any argument contains network/auth error info
      const hasExpectedError = args.some(arg => {
        if (typeof arg === 'string') {
          return arg.includes('ERR_CONNECTION_REFUSED') || 
                 arg.includes('ERR_NETWORK') ||
                 arg.includes('localhost:3001') ||
                 arg.includes('401') ||
                 arg.includes('Unauthorized');
        }
        if (arg && typeof arg === 'object') {
          const errorObj = arg as any;
          return errorObj.code === 'ERR_NETWORK' ||
                 errorObj.message === 'Network Error' ||
                 errorObj.response?.status === 401 ||
                 errorObj.response?.status === 403;
        }
        return false;
      });
      
      if (hasExpectedError) {
        // Backend is offline or user not authenticated - this is expected, don't log
        return;
      }

      originalError.apply(console, args);
    };

    // Cleanup function to restore original console.error
    return () => {
      console.error = originalError;
    };
  }, []);
};
