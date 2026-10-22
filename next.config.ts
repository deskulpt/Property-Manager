import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Playwright (or another agent) to run a second Next process beside
  // `npm run dev` without fighting over `.next/dev/lock`.
  distDir: process.env.DESKULPT_DIST_DIR || ".next",
  // The dev server is bound on 0.0.0.0 and opened at 127.0.0.1. Next only
  // allows localhost unless this hostname is listed, and a blocked HMR socket
  // prevents the app from hydrating.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
