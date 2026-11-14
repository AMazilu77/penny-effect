import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Only our own /media routes, which serve image URLs stored in our
    // database (src/lib/media.ts). No remotePatterns: allowing arbitrary
    // remote hosts would turn the optimizer into an open proxy.
    localPatterns: [{ pathname: "/media/**" }],
  },
  async redirects() {
    return [
      // The old mock charity search was replaced by Discover (Milestone 2).
      // Temporary (307), so the path can be reused later.
      { source: "/charities", destination: "/discover", permanent: false },
    ];
  },
};

export default nextConfig;
