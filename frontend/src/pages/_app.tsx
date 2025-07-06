// 🐺 LOBISOMEM ONLINE - Next.js App Component
// Global app configuration and providers

import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Inter, Cinzel, Pirata_One } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

// Context Providers
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { ThemeProvider } from '@/context/ThemeContext';

// Components
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { PageLoading } from '@/components/common/LoadingSpinner';

// Styles
import '@/styles/globals.css';

// =============================================================================
// FONT CONFIGURATION
// =============================================================================
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
});

const pirataOne = Pirata_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pirata',
  display: 'swap',
});

// =============================================================================
// PAGE TRANSITION VARIANTS
// =============================================================================
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.3,
};

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================
export default function App({ Component, pageProps, router }: AppProps) {
  const { pathname } = useRouter();

  // ✅ ADICIONADO: Suprimir warnings de hydration em desenvolvimento
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error;
      console.error = (...args) => {
        if (args[0]?.includes?.('Hydration')) return;
        if (args[0]?.includes?.('Text content does not match')) return;
        originalError(...args);
      };
    }
  }, []);

  return (
    <>
      {/* HEAD com viewport no lugar correto */}
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=no, viewport-fit=cover" />
      </Head>

      <ErrorBoundary>
        {/* Font variables */}
        <div className={`${inter.variable} ${cinzel.variable} ${pirataOne.variable}`}>

          {/* ✅ CORRIGIDO: Ordem correta de Context Providers */}
          <ThemeProvider>
            <AuthProvider>
              <SocketProvider> {/* SocketProvider DEVE vir APÓS AuthProvider */}

                {/* Page Transitions */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={router.route}
                    initial="initial"
                    animate="in"
                    exit="out"
                    variants={pageVariants}
                    transition={pageTransition}
                  >
                    <Component {...pageProps} />
                  </motion.div>
                </AnimatePresence>

                {/* Global Toast Notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#2D1B1E',
                      color: '#F4E4BC',
                      border: '1px solid #8B925A',
                      fontFamily: 'var(--font-inter)',
                    },
                    success: {
                      iconTheme: {
                        primary: '#228B22',
                        secondary: '#F4E4BC',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#8B0000',
                        secondary: '#F4E4BC',
                      },
                    },
                  }}
                />

                {/* Loading Overlay for Page Transitions */}
                <AnimatePresence>
                  {router.isFallback && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50"
                    >
                      <PageLoading />
                    </motion.div>
                  )}
                </AnimatePresence>

              </SocketProvider>
            </AuthProvider>
          </ThemeProvider>
        </div>
      </ErrorBoundary>
    </>
  );
}

// =============================================================================
// GLOBAL ERROR HANDLER
// =============================================================================
if (typeof window !== 'undefined') {
  // Handle global errors
  window.addEventListener('error', (event) => {
    // ✅ MELHORADO: Filtrar erros de hydration
    if (event.error?.message?.includes?.('Hydration')) return;
    if (event.error?.message?.includes?.('Text content does not match')) return;

    console.error('Global error:', event.error);
    // You could send this to an error reporting service
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // You could send this to an error reporting service
  });

  // Performance monitoring
  if (process.env.NODE_ENV === 'development') {
    // Log performance metrics in development
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        console.log('🚀 Page Load Performance:', {
          'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
          'TCP Connection': navigation.connectEnd - navigation.connectStart,
          'Request': navigation.responseStart - navigation.requestStart,
          'Response': navigation.responseEnd - navigation.responseStart,
          'DOM Processing': navigation.domComplete - navigation.domLoading,
          'Total Load Time': navigation.loadEventEnd - navigation.navigationStart,
        });
      }, 0);
    });
  }
}