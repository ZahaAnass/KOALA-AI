import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("renders the hero and navigates to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /sign in/i }).first().click();
    await expect(page).toHaveURL(/sign-in/);
  });

  test("features section is reachable from the anchor", async ({ page }) => {
    await page.goto("/#features");
    await expect(page.locator("#features")).toBeVisible();
  });

  test("unauthenticated dashboard access redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("shows a 404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.getByText(/not found|introuvable/i)).toBeVisible();
  });
});
