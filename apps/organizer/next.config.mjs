/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    unoptimized: true,
  },
  experimental: {
    authInterrupts: true,
  },
}

export default nextConfig
