import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.VITE_BASE_PATH || "/";
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/*.png", "images/*.svg"],
      manifest: {
        id: base,
        name: "SportNow",
        short_name: "SportNow",
        description: "属于你的体育时刻。NBA 与足球中文新闻阅读。",
        lang: "zh-CN",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#080a0d",
        theme_color: "#080a0d",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        // Future news.json is network-first and has a bounded offline fallback.
        // JSON is deliberately excluded from the build precache above.
        runtimeCaching: [
          {
            urlPattern: /\/data\/news\.json$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "sportnow-news-v1",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 1, maxAgeSeconds: 3600 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  test: { include: ["tests/**/*.test.ts"] },
});
