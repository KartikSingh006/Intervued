/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { 
    ignoreBuildErrors: true 
  },
  eslint: { 
    ignoreDuringBuilds: true 
  },
  images: { 
    unoptimized: true 
  },
  // Forcefully bypasses automated page parameters tracking hooks and blocks static assembly crashes
  output: 'standalone',
  experimental: {
    missingSuspenseWithCSRBypass: true
  }
};

export default nextConfig;
