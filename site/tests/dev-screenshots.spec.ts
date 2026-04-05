/**
 * Development screenshot capture for visual feedback loop.
 *
 * Run with: bun run screenshot
 *
 * Takes full-page screenshots of key pages at desktop and mobile
 * viewports. Screenshots are saved to tests/screenshots/ for
 * Claude to inspect during frontend development.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "fs";
import { join } from "path";

const SCREENSHOT_DIR = join(__dirname, "screenshots");

// Key pages representing each layout type
const PAGES = [
  { name: "homepage", path: "/" },
  { name: "notes-section", path: "/note/" },
  { name: "photos-section", path: "/photo/" },
  { name: "posts-section", path: "/post/" },
  { name: "highlights-section", path: "/highlight/" },
  { name: "about", path: "/about/" },
  { name: "media-books", path: "/media/books/" },
  { name: "media-films", path: "/media/films/" },
];

// Ensure screenshot directory exists
mkdirSync(SCREENSHOT_DIR, { recursive: true });

for (const { name, path } of PAGES) {
  test(`screenshot: ${name}`, async ({ page }, testInfo) => {
    const device = testInfo.project.name.includes("mobile")
      ? "mobile"
      : "desktop";

    await page.goto(path, { waitUntil: "networkidle" });

    // Wait a moment for any CSS transitions / lazy images
    await page.waitForTimeout(500);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, `${name}-${device}.png`),
      fullPage: true,
    });
  });
}

// Single-content pages (find first available of each type)
const SINGLE_PAGES = [
  { name: "single-note", sectionPath: "/note/", linkSelector: "article time a" },
  { name: "single-post", sectionPath: "/post/", linkSelector: "article a" },
  { name: "single-photo", sectionPath: "/photo/", linkSelector: "article a" },
  { name: "single-highlight", sectionPath: "/highlight/", linkSelector: "article a" },
];

for (const { name, sectionPath, linkSelector } of SINGLE_PAGES) {
  test(`screenshot: ${name}`, async ({ page }, testInfo) => {
    const device = testInfo.project.name.includes("mobile")
      ? "mobile"
      : "desktop";

    await page.goto(sectionPath, { waitUntil: "networkidle" });

    // Find first content link and navigate to it
    const link = page.locator(linkSelector).first();
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await link.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await page.screenshot({
        path: join(SCREENSHOT_DIR, `${name}-${device}.png`),
        fullPage: true,
      });
    }
  });
}
