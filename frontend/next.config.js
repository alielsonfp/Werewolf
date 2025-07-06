/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // ✅ EXPERIMENTAL: Configurações experimentais do Next.js
  experimental: {
    // Enable SWC for better performance
    forceSwcTransforms: true,
  },

  // ✅ ADICIONADO: Configuração de locale para formatação consistente
  i18n: {
    locales: ['pt-BR'],
    defaultLocale: 'pt-BR',
  },

  // ✅ ADICIONADO: Configuração para desenvolvimento com WebSocket
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },

  // ✅ MELHORADO: Headers para WebSocket e segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // ✅ ADICIONADO: Permitir conexões WebSocket
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // ✅ ATUALIZADO: Configuração de variáveis de ambiente
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  },

  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },

  // ✅ MELHORADO: Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Audio files support
    config.module.rules.push({
      test: /\.(mp3|wav|ogg)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/audio/',
          outputPath: 'static/audio/',
        },
      },
    });

    return config;
  },

  // ✅ ADICIONADO: Redirects úteis
  async redirects() {
    return [
      {
        source: '/game',
        destination: '/lobby',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;