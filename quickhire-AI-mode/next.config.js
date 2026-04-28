const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.js');

const nextConfig = {
  // NOTE: distDir changed to 'build' - this is NOT standard .next folder
  // Remove this line if you want the standard .next output directory
  distDir: 'build',
 
  // Page extensions
  pageExtensions: ['js', 'jsx'],
  
  // Turbopack configuration
  turbopack: {
    // Set root directory to avoid lockfile conflicts
    resolveAlias: {
      '@': '.',
    },
    resolveExtensions: ['.jsx', '.js', '.json'],
  },
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: false, // Disable for now to avoid critters error
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
  
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'quickhire.services',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'demo16.vcto.in',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Enable TypeScript path aliases
  transpilePackages: ['@mui/material', '@mui/icons-material'],
  
  // Webpack configuration for MUI (fallback when turbopack disabled)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '.',
    };
    config.resolve.extensions = ['.js', '.jsx', '.json'];
    return config;
  },
  
  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
