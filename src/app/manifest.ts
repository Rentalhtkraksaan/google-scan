import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smart QR Review",
    short_name: "Smart QR",
    description: "Platform Akselerasi Ulasan Bintang 5 Google Bisnis",
    start_url: "/portal",
    display: "standalone",
    background_color: "#070b14",
    theme_color: "#070b14",
    orientation: "portrait",
    icons: [
      {
        src: "/api/og",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/og",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
