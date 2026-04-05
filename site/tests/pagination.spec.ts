import { test, expect } from "@playwright/test";

test.describe("Pagination", () => {
  test("notes section shows pagination when there are enough pages", async ({ page }) => {
    await page.goto("/note/");
    const pagination = page.locator('nav[aria-label="Pagination"]');
    const count = await pagination.count();

    if (count > 0) {
      // Should show page count
      const pageCount = pagination.locator(".page-count");
      await expect(pageCount).toBeVisible();
      await expect(pageCount).toHaveAttribute("aria-current", "page");

      // First page: Back should be disabled, Next should be a link
      const backDisabled = pagination.locator(".prev-wrapper span[aria-disabled]");
      const backLink = pagination.locator(".prev-wrapper a");

      // On page 1, back is disabled
      if ((await backDisabled.count()) > 0) {
        await expect(backDisabled).toHaveText("Back");
        const nextLink = pagination.locator(".next-wrapper a");
        await expect(nextLink).toBeVisible();
        await expect(nextLink).toHaveText("Next");
      }
    }
  });

  test("can navigate to next page", async ({ page }) => {
    await page.goto("/note/");
    const pagination = page.locator('nav[aria-label="Pagination"]');

    if ((await pagination.count()) > 0) {
      const nextLink = pagination.locator('.next-wrapper a[aria-label="Next page"]');
      if ((await nextLink.count()) > 0) {
        await nextLink.click();
        await expect(page).toHaveURL(/\/note\/page\/2\/?$/);

        // Page 2 should have a working Back link
        const backLink = page.locator('.prev-wrapper a[aria-label="Previous page"]');
        await expect(backLink).toBeVisible();
        await expect(backLink).toHaveText("Back");
      }
    }
  });
});
