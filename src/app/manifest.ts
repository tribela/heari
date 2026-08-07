import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "헤아리",
    short_name: "헤아리",
    description: "초성으로 단어를 헤아리기",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#1a1a2e",
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable" as any,
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable" as any,
      },
    ],
  };
}