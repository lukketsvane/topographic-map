/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Remove deprecated options
    // appDir is now default in Next.js 14
    // serverActions is now available by default
  },
  images: {
    domains: ['i.ibb.co'], // Add any other domains you're loading images from
  },
}

export default nextConfig;