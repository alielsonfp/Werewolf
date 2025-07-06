// 🐺 WEREWOLF - Next.js Document
// Custom HTML document structure

import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-BR" className="dark"> {/* ✅ ADICIONADO: lang="pt-BR" */}
      <Head>
        {/* Favicon and App Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#8B925A" />
        <meta name="msapplication-TileColor" content="#2D1B1E" />
        <meta name="theme-color" content="#2D1B1E" />

        {/* ✅ MELHORADO: Meta Tags mais completas */}
        <meta name="description" content="Werewolf - O clássico jogo de dedução social online. Entre na vila e descubra quem são os lobisomens!" />
        <meta name="keywords" content="werewolf, lobisomem, jogo online, multiplayer, dedução social, mafia" />
        <meta name="author" content="Werewolf Team" />
        <meta name="robots" content="index, follow" />

        {/* ✅ ADICIONADO: Meta tags para PWA */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Werewolf" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Werewolf - O Jogo de Dedução Social" />
        <meta property="og:description" content="O clássico jogo de dedução social online. Descubra quem são os lobisomens antes que eliminem toda a vila!" />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:url" content="https://werewolf-game.com" />
        <meta property="og:site_name" content="Werewolf" />
        <meta property="og:locale" content="pt_BR" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Werewolf - O Jogo de Dedução Social" />
        <meta name="twitter:description" content="O clássico jogo de dedução social online. Descubra quem são os lobisomens!" />
        <meta name="twitter:image" content="/og-image.png" />

        {/* DNS Prefetch for performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />

        {/* Preconnect for critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Google Fonts - Medieval theme */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Pirata+One&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* ✅ MELHORADO: Critical CSS mais robusto */}
        <style>{`
          /* Prevent Flash of Unstyled Content */
          html {
            visibility: hidden;
            opacity: 0;
            scroll-behavior: smooth;
          }
          
          html.fonts-loaded {
            visibility: visible;
            opacity: 1;
          }

          /* Loading state */
          .page-loading {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #2D1B1E 0%, #1a1a2e 100%);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* Dark theme by default */
          body {
            background-color: #2D1B1E;
            color: #F4E4BC;
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* ✅ MELHORADO: Custom scrollbar mais bonito */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          ::-webkit-scrollbar-track {
            background: rgba(45, 27, 30, 0.1);
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb {
            background: rgba(139, 146, 90, 0.5);
            border-radius: 4px;
            transition: background 0.2s ease;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: rgba(139, 146, 90, 0.8);
          }

          ::-webkit-scrollbar-corner {
            background: transparent;
          }

          /* Firefox scrollbar */
          * {
            scrollbar-width: thin;
            scrollbar-color: rgba(139, 146, 90, 0.5) rgba(45, 27, 30, 0.1);
          }

          /* Disable text selection on UI elements */
          button, .btn, .no-select {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }

          /* ✅ MELHORADO: Focus visible para acessibilidade */
          .focus-visible,
          *:focus-visible {
            outline: 2px solid #8B925A;
            outline-offset: 2px;
            border-radius: 4px;
          }

          /* ✅ ADICIONADO: Supressão de hydration warnings no console */
          .hydration-safe {
            opacity: 0;
          }

          .hydration-safe.hydrated {
            opacity: 1;
            transition: opacity 0.2s ease;
          }

          /* ✅ ADICIONADO: Animações de entrada suaves */
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .fade-in-up {
            animation: fadeInUp 0.5s ease forwards;
          }

          /* ✅ ADICIONADO: Prevenção de layout shift */
          .prevent-layout-shift {
            min-height: 1px;
          }

          /* ✅ ADICIONADO: Estilos para loading states */
          .skeleton {
            background: linear-gradient(90deg, #2D1B1E 25%, #3D2B2E 50%, #2D1B1E 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
          }

          @keyframes loading {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }

          /* ✅ ADICIONADO: Estilos para modo high contrast */
          @media (prefers-contrast: high) {
            body {
              background-color: #000;
              color: #fff;
            }
          }

          /* ✅ ADICIONADO: Estilos para reduced motion */
          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
      </Head>

      <body>
        {/* Page loading overlay */}
        <div id="page-loading" className="page-loading">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🐺</div>
            <div style={{ fontSize: '1.5rem', fontFamily: 'Cinzel, serif', color: '#8B925A' }}>
              Werewolf
            </div>
            <div style={{ fontSize: '0.9rem', color: '#F4E4BC', marginTop: '0.5rem' }}>
              Carregando...
            </div>
          </div>
        </div>

        <Main />
        <NextScript />

        {/* ✅ MELHORADO: Scripts de inicialização mais robustos */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                // Remove loading overlay with smooth transition
                const loading = document.getElementById('page-loading');
                if (loading) {
                  setTimeout(() => {
                    loading.style.opacity = '0';
                    loading.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                      loading.remove();
                    }, 300);
                  }, 800);
                }

                // Mark fonts as loaded
                document.documentElement.classList.add('fonts-loaded');

                // Initialize focus-visible polyfill
                try {
                  let hadKeyboardEvent = true;
                  let keyboardThrottleTimeout;

                  const detectKeyboard = function(e) {
                    if (e.metaKey || e.altKey || e.ctrlKey) return;
                    hadKeyboardEvent = true;
                    document.body.classList.add('using-keyboard');
                  };

                  const detectMouse = function() {
                    hadKeyboardEvent = false;
                    document.body.classList.remove('using-keyboard');
                  };

                  document.addEventListener('keydown', detectKeyboard, true);
                  document.addEventListener('mousedown', detectMouse, true);
                  document.addEventListener('pointerdown', detectMouse, true);
                  document.addEventListener('touchstart', detectMouse, true);
                } catch (e) {
                  console.warn('Focus-visible polyfill error:', e);
                }

                // Performance monitoring in development
                if (${process.env.NODE_ENV === 'development'}) {
                  window.addEventListener('load', function() {
                    setTimeout(() => {
                      try {
                        const navigation = performance.getEntriesByType('navigation')[0];
                        if (navigation) {
                          console.log('📊 Page Performance:', {
                            'Total Load Time': Math.round(navigation.loadEventEnd - navigation.navigationStart) + 'ms',
                            'DOM Content Loaded': Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart) + 'ms',
                            'First Paint': Math.round(performance.getEntriesByType('paint')[0]?.startTime || 0) + 'ms'
                          });
                        }
                      } catch (e) {
                        console.warn('Performance monitoring error:', e);
                      }
                    }, 1000);
                  });
                }

                // Global error handling
                window.addEventListener('error', function(e) {
                  // Filter out hydration warnings in development
                  if (e.error?.message?.includes?.('Hydration') || 
                      e.error?.message?.includes?.('Text content does not match')) {
                    return;
                  }
                  console.error('Global error:', e.error);
                });

                window.addEventListener('unhandledrejection', function(e) {
                  console.error('Unhandled promise rejection:', e.reason);
                });
              });
            `,
          }}
        />

        {/* NoScript fallback */}
        <noscript>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#2D1B1E',
            color: '#F4E4BC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            zIndex: 9999,
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '2rem' }}>🐺</div>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontFamily: 'Cinzel, serif' }}>Werewolf</h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem', maxWidth: '400px' }}>
              JavaScript é necessário para jogar este jogo online.
            </p>
            <p style={{ fontSize: '1rem', color: '#8B925A' }}>
              Por favor, ative o JavaScript no seu navegador e recarregue a página.
            </p>
          </div>
        </noscript>
      </body>
    </Html>
  );
}