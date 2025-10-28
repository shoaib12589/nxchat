'use client';

import { useEffect } from 'react';

export const useHydrationFix = () => {
  useEffect(() => {
    // Suppress hydration warnings caused by browser extensions
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('Hydration failed') &&
        args[0].includes('bis_skin_checked')
      ) {
        // Suppress Bitdefender and other browser extension hydration warnings
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
