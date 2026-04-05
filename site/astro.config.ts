import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import { remarkHugoShortcodes } from "./src/lib/remark-hugo-shortcodes";

export default defineConfig({
  site: "https://really.lol",
  output: "static",
  adapter: cloudflare({
    imageService: "passthrough",
    sessions: false,
  }),
  vite: {
    resolve: {
      preserveSymlinks: true,
    },
  },
  integrations: [
    preact(),
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
    remarkPlugins: [remarkHugoShortcodes],
    shikiConfig: { theme: "dracula" },
  },
});
