import { test, expect } from "@playwright/test";

test.describe("Responsive layout", () => {
  test("homepage renders on mobile", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "mobile-safari") {
      test.skip();
    }
    await page.goto("/");
    await expect(page.locator(".home-main")).toBeVisible();
    await expect(page.locator(".site-header")).toBeVisible();

    await expect(page.locator(".site-header-wrapper")).toHaveScreenshot(
      "header-mobile.png",
      { maxDiffPixelRatio: 0.05 }
    );
    await expect(page.locator(".home-main")).toHaveScreenshot(
      "home-main-mobile.png",
      { maxDiffPixelRatio: 0.05 }
    );
  });

  test("homepage renders on desktop", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "desktop-chromium") {
      test.skip();
    }
    await page.goto("/");
    await expect(page.locator(".home-main")).toBeVisible();
    await expect(page.locator(".site-header")).toBeVisible();

    await expect(page.locator(".site-header-wrapper")).toHaveScreenshot(
      "header-desktop.png",
      { maxDiffPixelRatio: 0.05 }
    );
    await expect(page.locator(".home-main")).toHaveScreenshot(
      "home-main-desktop.png",
      { maxDiffPixelRatio: 0.05 }
    );
  });

  test("section page renders on mobile", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "mobile-safari") {
      test.skip();
    }
    await page.goto("/note/");
    const main = page.locator(".note-section-main");
    await expect(main).toBeVisible();

    await expect(main).toHaveScreenshot("section-main-mobile.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("section page renders on desktop", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "desktop-chromium") {
      test.skip();
    }
    await page.goto("/note/");
    const main = page.locator(".note-section-main");
    await expect(main).toBeVisible();

    await expect(main).toHaveScreenshot("section-main-desktop.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
