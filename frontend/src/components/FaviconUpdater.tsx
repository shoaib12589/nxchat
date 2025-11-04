'use client';

import { useEffect } from 'react';
import apiClient from '@/lib/api';

export const FaviconUpdater: React.FC = () => {
  useEffect(() => {
    const updateFavicon = async () => {
      try {
        const response = await apiClient.getSystemSettings();
        if (response.success && response.data?.app_favicon) {
          const faviconUrl = response.data.app_favicon;
          
          // Remove existing favicon links
          const existingLinks = document.querySelectorAll("link[rel*='icon'], link[rel*='apple-touch-icon']");
          existingLinks.forEach(link => link.remove());

          // Determine MIME type based on file extension
          const getMimeType = (url: string): string => {
            const ext = url.toLowerCase().split('.').pop();
            switch (ext) {
              case 'ico':
                return 'image/x-icon';
              case 'png':
                return 'image/png';
              case 'jpg':
              case 'jpeg':
                return 'image/jpeg';
              case 'svg':
                return 'image/svg+xml';
              case 'gif':
                return 'image/gif';
              case 'webp':
                return 'image/webp';
              default:
                return 'image/x-icon';
            }
          };

          const mimeType = getMimeType(faviconUrl);

          // Create and add new favicon link
          const link = document.createElement('link');
          link.rel = 'icon';
          link.type = mimeType;
          link.href = faviconUrl;
          document.head.appendChild(link);

          // Also add shortcut icon for better browser compatibility
          const shortcutLink = document.createElement('link');
          shortcutLink.rel = 'shortcut icon';
          shortcutLink.type = mimeType;
          shortcutLink.href = faviconUrl;
          document.head.appendChild(shortcutLink);

          // Add apple-touch-icon for iOS devices
          const appleLink = document.createElement('link');
          appleLink.rel = 'apple-touch-icon';
          appleLink.href = faviconUrl;
          document.head.appendChild(appleLink);

          console.log('✅ Favicon updated:', faviconUrl);
        }
      } catch (error) {
        console.error('Failed to update favicon:', error);
      }
    };

    updateFavicon();
  }, []);

  return null;
};

