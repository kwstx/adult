import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ioredis"],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
