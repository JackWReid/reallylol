import { test, expect } from "@playwright/test";

const sections = [
  {
    name: "Notes",
    path: "/note/",
    titleSelector: ".note-list-title",
    listSelector: ".note-list-item",
    mainSelector: ".note-section-main",
  },
  {
    name: "Photos",
    path: "/photo/",
    titleSelector: ".default-section-title",
    listSelector: ".photo-section-item",
    mainSelector: ".photo-section-main",
  },
  {
    name: "Posts",
    path: "/post/",
    titleSelector: ".section-title",
    listSelector: ".multi-preview-list > *",
    mainSelector: ".section-main",
  },
];

for (const section of sections) {
  test.describe(`${section.name} section`, () => {
    test(`loads and displays title`, async ({ page }) => {
      await page.goto(section.path);
      const title = page.locator(section.titleSelector);
      await expect(title).toBeVisible();
    });

    test(`renders content list`, async ({ page }) => {
      await page.goto(section.path);
      const items = page.locator(section.listSelector);
      expect(await items.count()).toBeGreaterThan(0);
    });

    test(`screenshot - visual regression`, async ({ page }) => {
      await page.goto(section.path);
      const main = page.locator(section.mainSelector);
      await expect(main).toBeVisible();
      await expect(main).toHaveScreenshot(`section-${section.name.toLowerCase()}.png`, {
        maxDiffPixelRatio: 0.05,
      });
    });
  });
}

test.describe("Sub-navigation", () => {
  test("books section has sub-nav", async ({ page }) => {
    await page.goto("/books/reading/");
    const subNav = page.locator('nav[aria-label="Sub Navigation"]');
    await expect(subNav).toBeVisible();

    const links = subNav.locator("a");
    await expect(links).toHaveCount(3);
    await expect(links.nth(0)).toHaveText("To Read");
    await expect(links.nth(1)).toHaveText("Reading");
    await expect(links.nth(2)).toHaveText("Read");
  });

  test("films section has sub-nav", async ({ page }) => {
    await page.goto("/films/watched/");
    const subNav = page.locator('nav[aria-label="Sub Navigation"]');
    await expect(subNav).toBeVisible();

    const links = subNav.locator("a");
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveText("To Watch");
    await expect(links.nth(1)).toHaveText("Watched");
  });

  test("links section has sub-nav", async ({ page }) => {
    await page.goto("/links/saved/");
    const subNav = page.locator('nav[aria-label="Sub Navigation"]');
    await expect(subNav).toBeVisible();

    const links = subNav.locator("a");
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveText("Saved Links");
    await expect(links.nth(1)).toHaveText("Blogroll");
  });
});
