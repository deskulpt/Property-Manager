import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Easy Rental",
    short_name: "Easy Rental",
    description: "Easy Rental — industrial leasing desk by DeSkulpt Inc. INR, UPI, eNACH, GST.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#eef2f5",
    theme_color: "#13253a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
