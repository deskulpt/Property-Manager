import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DeSkulpt",
    short_name: "DeSkulpt",
    description: "Indian industrial leasing desk — INR, UPI, eNACH, GST.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F4F1EA",
    theme_color: "#1C3F38",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
