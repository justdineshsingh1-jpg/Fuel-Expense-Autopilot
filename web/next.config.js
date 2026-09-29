/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow any image domain for development/demo
      },
    ],
  },
}

module.exports = nextConfig
