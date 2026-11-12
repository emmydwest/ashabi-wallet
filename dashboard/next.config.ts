import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The SDK lives in ../packages/sdk. After build it ships dist/; this keeps source imports working in dev before pack.
  transpilePackages: ['ashabi-wallet-sdk'],
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
