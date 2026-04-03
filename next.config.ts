import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  dev: {
    turbopack: {
      enabled: false,
    },
  },
};

export default nextConfig;
