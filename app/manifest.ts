import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DapurQu",
    short_name: "DapurQu",
    description: "Ide menu, resep, dan cara memasak dengan bantuan AI.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Sama dengan warna ikon agar splash screen Android menyatu dengan ikon
    background_color: "#974118",
    theme_color: "#974118",
    lang: "id",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
