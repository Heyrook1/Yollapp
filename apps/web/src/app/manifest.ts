import type { MetadataRoute } from "next";

/**
 * PWA manifest — uygulamanın telefona/masaüstüne kurulabilmesini sağlar.
 * Next.js bunu /manifest.webmanifest olarak sunar.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YOLLA — Her yere. Her şeyi. Daha hızlı.",
    short_name: "YOLLA",
    description:
      "Kıbrıs'ın kurye ağı. Dakikalar içinde kurye bul, gönderini canlı takip et.",
    start_url: "/sender",
    id: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B1220",
    theme_color: "#0B1220",
    lang: "tr",
    dir: "ltr",
    categories: ["business", "productivity", "travel"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Paket gönder",
        short_name: "Gönder",
        url: "/sender/shipments/new",
      },
      {
        name: "Gönderilerim",
        short_name: "Gönderiler",
        url: "/sender/shipments",
      },
    ],
  };
}
