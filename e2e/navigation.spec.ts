import { test, expect } from "./fixtures";
import { seedProfiles, cleanupAll } from "./helpers/db";

test.beforeEach(async () => {
  await cleanupAll();
  await seedProfiles();
});

test.afterEach(async () => {
  await cleanupAll();
  await seedProfiles();
});

test("NAV-001: Header menu links work", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.locator('[data-testid="nav-menu"]')).toBeVisible({ timeout: 5_000 });

  // Open hamburger menu
  await page.locator('[data-testid="nav-menu"]').click();

  // Menu shows Roasteries and Estates links
  await expect(page.getByRole("link", { name: /Roasteries/i })).toBeVisible({ timeout: 3_000 });
  await expect(page.getByRole("link", { name: /Estates/i })).toBeVisible();

  // Click Roasteries
  await page.getByRole("link", { name: /Roasteries/i }).click();
  await expect(page).toHaveURL(/\/roasteries/);

  // Go back to feed
  await page.goto("/feed");
  await page.locator('[data-testid="nav-menu"]').click();
  await expect(page.getByRole("link", { name: /Estates/i })).toBeVisible({ timeout: 3_000 });

  // Click Estates
  await page.getByRole("link", { name: /Estates/i }).click();
  await expect(page).toHaveURL(/\/estates/);
});

test("NAV-002: Logo link navigates to feed", async ({ page }) => {
  await page.goto("/roasteries");

  // Click "Coffeebook" logo text
  await page.getByRole("link", { name: "Coffeebook" }).click();
  await expect(page).toHaveURL(/\/feed/);
});
