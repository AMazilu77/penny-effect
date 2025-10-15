import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 eslint: {
    ignoreDuringBuilds: true, // ✅ prevents ESLint from failing builds
  },

};

export default nextConfig;
