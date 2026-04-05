import { test, expect } from "@playwright/test";

test.describe("Site header and navigation", () => {
  test("displays site title linking to home", async ({ page }) => {
    await page.goto("/");
    const titleLink = page.locator(".site-header h1 a");
    await expect(titleLink).toHaveText("really.lol");
    await expect(titleLink).toHaveAttribute("href", /\/$/);
  });

  test("has all main nav links", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    const links = nav.locator("a");
    const expectedLinks = [
      { text: "Posts", href: /\/post\/?$/ },
      { text: "Notes", href: /\/note\/?$/ },
      { text: "Photos", href: /\/photo\/?$/ },
      { text: "Books", href: /\/books\/reading\/?$/ },
      { text: "Films", href: /\/films\/watched\/?$/ },
      { text: "Links", href: /\/links\/saved\/?$/ },
    ];

    await expect(links).toHaveCount(expectedLinks.length);

    for (const expected of expectedLinks) {
      const link = nav.locator("a", { hasText: expected.text });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", expected.href);
    }
  });

  test("nav links navigate correctly", async ({ page }) => {
    await page.goto("/");

    await page.locator('nav[aria-label="Main navigation"] a', { hasText: "Notes" }).click();
    await expect(page).toHaveURL(/\/note\/?$/);

    await page.locator('nav[aria-label="Main navigation"] a', { hasText: "Photos" }).click();
    await expect(page).toHaveURL(/\/photo\/?$/);
  });
});

test.describe("Footer", () => {
  test("displays footer with links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator(".site-footer");
    await expect(footer).toBeVisible();
    await expect(footer.locator('a[href*="social.lol"]')).toBeVisible();
    await expect(footer.locator('a[href*="/now"]')).toBeVisible();
    await expect(footer.locator('a[href*="index.xml"]')).toBeVisible();
  });

  test("displays random photo box on desktop", async ({ page }, testInfo) => {
    if (testInfo.project.name === "mobile-safari") {
      test.skip();
    }
    await page.goto("/");
    const photoBox = page.locator(".photo-box");
    await expect(photoBox).toBeVisible();
  });
});
