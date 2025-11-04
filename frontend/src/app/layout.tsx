import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './sidebar-custom.css';
import { ThemeProvider } from '@/components/theme-provider';
import { SocketProvider } from '@/contexts/SocketContext';
import { Toaster } from '@/components/ui/sonner';
import { AuthInitializer } from '@/components/AuthInitializer';
import { ClientOnly } from '@/components/ClientOnly';
import { FaviconUpdater } from '@/components/FaviconUpdater';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NxChat - Customer Support Platform',
  description: 'Modern customer support platform with AI-powered chat, ticketing, and analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ClientOnly>
            <FaviconUpdater />
            <AuthInitializer />
            <SocketProvider>
              {children}
              <Toaster />
            </SocketProvider>
          </ClientOnly>
        </ThemeProvider>
      </body>
    </html>
  );
}