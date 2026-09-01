import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coffee Journal",
    short_name: "Coffee Journal",
    description:
      "Diario de café: registra bolsas, intentos de espresso y recetas reproducibles.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f2e6",
    theme_color: "#1b2a6e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
