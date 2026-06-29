import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // 🚀 Dynamically switch to the Vercel engine when deploying
  nitro: process.env.VERCEL ? { preset: "vercel" } : undefined,
  tanstackStart: {
    server: {
      entry: "server",
    },
  },
});
