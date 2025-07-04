// 🐺 WEREWOLF - Next.js Document
// Custom HTML document structure

import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-BR" className="dark">
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

        {/* Meta Tags */}
        <meta name="description" content="Werewolf - O clássico jogo de dedução social online. Entre na vila e descubra quem são os lobisomens!" />
        <meta name="keywords" content="werewolf, lobisomem, jogo online, multiplayer, dedução social, mafia" />
        <meta name="author" content="Werewolf Team" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Werewolf - O Jogo de Dedução Social" />
        <meta property="og:description" content="O clássico jogo de dedução social online. Descubra quem são os lobisomens antes que eliminem toda a vila!" />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:url" content="https://werewolf-game.com" />
        <meta property="og:site_name" content="Werewolf" />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="Werewolf" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Werewolf" />
        <meta name="mobile-web-app-capable" content="yes" />

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

        {/* Critical CSS for preventing FOUC */}
        <style>{`
          /* Prevent Flash of Unstyled Content */
          html {
            visibility: hidden;
            opacity: 0;
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
          }

          /* Custom scrollbar */
          ::-webkit-scrollbar {
            width: 8px;
          }

          ::-webkit-scrollbar-track {
            background: rgba(45, 27, 30, 0.1);
          }

          ::-webkit-scrollbar-thumb {
            background: rgba(139, 146, 90, 0.5);
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: rgba(139, 146, 90, 0.8);
          }

          /* Disable text selection on UI elements */
          button, .btn, .no-select {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }

          /* Focus visible for accessibility */
          .focus-visible {
            outline: 2px solid #8B925A;
            outline-offset: 2px;
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
          </div>
        </div>

        <Main />
        <NextScript />

        {/* Remove loading overlay and show fonts loaded */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                // Remove loading overlay
                const loading = document.getElementById('page-loading');
                if (loading) {
                  setTimeout(() => {
                    loading.style.opacity = '0';
                    setTimeout(() => {
                      loading.remove();
                    }, 300);
                  }, 1000);
                }

                // Mark fonts as loaded
                document.documentElement.classList.add('fonts-loaded');
              });

              // Handle focus-visible polyfill
              try {
                document.addEventListener('keydown', function(e) {
                  if (e.key === 'Tab') {
                    document.body.classList.add('using-keyboard');
                  }
                });

                document.addEventListener('mousedown', function() {
                  document.body.classList.remove('using-keyboard');
                });
              } catch (e) {
                console.warn('Focus-visible polyfill error:', e);
              }
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
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Werewolf</h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
              JavaScript é necessário para jogar.
            </p>
            <p>
              Por favor, ative o JavaScript no seu navegador e recarregue a página.
            </p>
          </div>
        </noscript>
      </body>
    </Html>
  );
}