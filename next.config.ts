import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The old mock charity search was replaced by Discover (Milestone 2).
      // Temporary (307), so the path can be reused later.
      { source: "/charities", destination: "/discover", permanent: false },
    ];
  },
};

export default nextConfig;
