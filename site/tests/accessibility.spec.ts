import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("skip-to-content link exists and works", async ({ page }) => {
    await page.goto("/");

    const skipLink = page.locator("a.skip-link");
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
    await expect(skipLink).toHaveText("Skip to content");

    // Skip link should become visible on focus (keyboard navigation)
    await skipLink.focus();
    await expect(skipLink).toBeVisible();

    // Clicking it should move focus to main content
    await skipLink.click();
    const mainContent = page.locator("#main-content");
    await expect(mainContent).toBeVisible();
  });

  test("main navigation has aria-label", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();
  });

  test("pagination has aria-label", async ({ page }) => {
    await page.goto("/note/");
    const pagination = page.locator('nav[aria-label="Pagination"]');
    // Pagination only appears if there are multiple pages
    const count = await pagination.count();
    if (count > 0) {
      await expect(pagination).toBeVisible();
      await expect(pagination.locator('[aria-current="page"]')).toBeVisible();
    }
  });

  test("viewport meta tag is set", async ({ page }) => {
    await page.goto("/");
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute(
      "content",
      "width=device-width, initial-scale=1.0"
    );
  });

  test("page has lang attribute", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "en-gb");
  });

  test("images have alt attributes", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      // All images should have an alt attribute (can be empty for decorative)
      await expect(images.nth(i)).toHaveAttribute("alt", /.*/);
    }
  });
});
