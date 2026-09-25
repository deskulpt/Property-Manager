import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is bound on 0.0.0.0 and opened at 127.0.0.1. Next only
  // allows localhost unless this hostname is listed, and a blocked HMR socket
  // prevents the app from hydrating.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
