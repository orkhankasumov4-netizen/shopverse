'use client';
import './globals.css';
import { Inter, Outfit } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import CartDrawer from '@/components/cart/CartDrawer';

const inter  = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { token, fetchMe } = useAuthStore();
  useEffect(() => { if (token) fetchMe(); }, [token]);
  return <>{children}</>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <QueryClientProvider client={queryClient}>
            <AuthInitializer>
              {children}
              <CartDrawer />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: { fontFamily: 'var(--font-inter)' },
                  success: { iconTheme: { primary: '#007600', secondary: '#fff' } },
                }}
              />
            </AuthInitializer>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
