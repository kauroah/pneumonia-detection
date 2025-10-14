/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['onnxruntime-node'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'onnxruntime-node'];
    }
    return config;
  },

  // (from your .mjs)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Allow your Supabase image host
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vnytsooflmrgfetykcxt.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Or use a wildcard if you have multiple envs:
      // { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' }
    ],
    // If you want to skip image optimization entirely, you can also set:
    // unoptimized: true,
  },
};

module.exports = nextConfig;
