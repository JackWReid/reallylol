import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://really.lol",
  output: "static",
  vite: {
    resolve: {
      preserveSymlinks: true,
    },
  },
  integrations: [
    sitemap({
      serialize(item) {
        if (item.url === "https://really.lol/") item.priority = 1.0;
        else if (item.url.startsWith("https://really.lol/post")) item.priority = 0.6;
        else if (item.url.startsWith("https://really.lol/photo")) item.priority = 0.5;
        else if (item.url.startsWith("https://really.lol/note")) item.priority = 0.3;
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: { theme: "dracula" },
  },
});
