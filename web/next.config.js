/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'isjsbwjxvpmmgwvvksit.supabase.co',
      }
    ],
  },
};

module.exports = nextConfig;
