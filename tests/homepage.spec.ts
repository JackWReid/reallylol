import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("renders with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("really.lol");
  });

  test("has correct meta description", async ({ page }) => {
    await page.goto("/");
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute(
      "content",
      "A scrapbook, a journal, and a logbook."
    );
  });

  test("displays the home intro content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".home-main")).toBeVisible();
    await expect(page.locator(".home-intro")).toBeVisible();
  });

  test("shows current reading", async ({ page }) => {
    await page.goto("/");
    const reading = page.locator(".home-component__reading");
    await expect(reading).toBeVisible();
    await expect(reading.locator("dt")).toHaveText("Reading");
  });

  test("screenshot - header visual regression", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.locator(".site-header-wrapper")).toHaveScreenshot("homepage-header.png", {
      maxDiffPixelRatio: 0.05,
    });
  });

  test("screenshot - main content visual regression", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".home-main")).toBeVisible();
    await expect(page.locator(".home-main")).toHaveScreenshot("homepage-main.png", {
      maxDiffPixelRatio: 0.05,
    });
  });
});
