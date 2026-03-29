import { test, expect } from "./fixtures";
import {
  seedProfiles,
  seedRoasteries,
  seedEstates,
  seedEntries,
  cleanupAll,
  ROASTERIES,
  ESTATES,
  ENTRIES,
} from "./helpers/db";

// Seed standard feed data before each test
test.beforeEach(async () => {
  await cleanupAll();
  await seedProfiles();
  await seedRoasteries([ROASTERIES.subko, ROASTERIES.bt]);
  await seedEstates([ESTATES.moolay, ESTATES.krh]);
  await seedEntries([
    ENTRIES.feed1,
    ENTRIES.feed2,
    ENTRIES.feed3,
    ENTRIES.feed4,
  ]);
});

test.afterEach(async () => {
  await cleanupAll();
  await seedProfiles();
});

test("FEED-001: Feed page displays all entries", async ({ page }) => {
  await page.goto("/feed");

  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Vidit Dark")).toBeVisible();
  await expect(page.getByText("Karan Medium")).toBeVisible();
  await expect(page.getByText("Amar Espresso")).toBeVisible();
});

test("FEED-002: Entry cards are clickable links to detail page", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 10_000 });

  // Click entry card
  await page.getByText("Vidit Light").click();

  // Should navigate to entry detail
  await expect(page).toHaveURL(/\/entry\/e-feed-1/);
  await expect(page.getByText("Vidit Light")).toBeVisible();
});

test("FEED-003: Profile filter shows only one profile's entries", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 10_000 });

  // Click Karan filter — use filter bar buttons
  await page.getByRole("button", { name: "Karan" }).click();

  // URL should have profile=karan
  await expect(page).toHaveURL(/profile=karan/);

  // Only Karan's entries visible
  await expect(page.getByText("Karan Medium")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Vidit Light")).not.toBeVisible();
  await expect(page.getByText("Vidit Dark")).not.toBeVisible();
  await expect(page.getByText("Amar Espresso")).not.toBeVisible();
});

test("FEED-004: Profile filter All shows all entries", async ({ page }) => {
  await page.goto("/feed?profile=karan");
  await expect(page.getByText("Karan Medium")).toBeVisible({ timeout: 10_000 });

  // Click "All" profile button (the first "All" button in filter bar)
  // The filter bar has multiple "All" buttons — one for profiles, one for roasts
  // Target by position in the profile filter section
  await page.getByRole("button", { name: "All" }).first().click();

  // URL should not have profile param
  await expect(page).toHaveURL(/\/feed(?!\?.*profile)/);

  // All 4 entries visible
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Karan Medium")).toBeVisible();
  await expect(page.getByText("Amar Espresso")).toBeVisible();
});

test("FEED-005: Clicking active profile filter toggles it off", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 10_000 });

  // Click Vidit filter to activate
  await page.getByRole("button", { name: "Vidit" }).click();
  await page.waitForURL(/profile=vidit/, { timeout: 5_000 });

  // Click Vidit again to deactivate
  await page.getByRole("button", { name: "Vidit" }).click();

  // Wait for URL to update (no profile param)
  await page.waitForURL((url) => !url.searchParams.has("profile"), { timeout: 5_000 });

  // All entries visible
  await expect(page.getByText("Karan Medium")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Amar Espresso")).toBeVisible();
});

test("FEED-006: Roast filter shows only matching roast level", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 10_000 });

  // Click "Light" roast filter button
  // The filter bar section has roast level buttons including "Light"
  await page.getByRole("button", { name: "Light" }).click();

  // URL should have roast=light
  await expect(page).toHaveURL(/roast=light/);

  // Only light roast entries visible
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Vidit Dark")).not.toBeVisible();
  await expect(page.getByText("Karan Medium")).not.toBeVisible();
  await expect(page.getByText("Amar Espresso")).not.toBeVisible();
});

test("FEED-007: All Roasts clears roast filter", async ({ page }) => {
  await page.goto("/feed?roast=dark");
  // Should show only dark entries
  await expect(page.getByText("Vidit Dark")).toBeVisible({ timeout: 10_000 });

  // Click "All Roasts" button
  await page.getByRole("button", { name: "All Roasts" }).click();

  // Wait for URL to update
  await page.waitForURL((url) => !url.searchParams.has("roast"), { timeout: 5_000 });

  // All entries visible
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Karan Medium")).toBeVisible();
});

test("FEED-008: Combined filters — profile + roast", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 10_000 });

  // Filter by Vidit
  await page.getByRole("button", { name: "Vidit" }).click();
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Vidit Dark")).toBeVisible();
  await expect(page.getByText("Karan Medium")).not.toBeVisible();

  // Add Light roast filter
  await page.getByRole("button", { name: "Light" }).click();

  // URL should have both params
  await expect(page).toHaveURL(/profile=vidit/);
  await expect(page).toHaveURL(/roast=light/);

  // Only Vidit Light visible
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Vidit Dark")).not.toBeVisible();
  await expect(page.getByText("Karan Medium")).not.toBeVisible();
});

test("FEED-009: Roastery filter shows only entries from one roastery", async ({ page }) => {
  await page.goto("/feed");
  // Wait for the filter bar to appear with Subko button
  await expect(page.getByRole("button", { name: "Subko" })).toBeVisible({ timeout: 10_000 });

  // Click Subko roastery filter button
  await page.getByRole("button", { name: "Subko" }).click();

  // URL should have roastery param
  await expect(page).toHaveURL(/roastery=r-subko/);

  // Only Subko entries: Vidit Light (r-subko), Karan Medium (r-subko)
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Karan Medium")).toBeVisible();
  // Blue Tokai entries should not be visible
  await expect(page.getByText("Vidit Dark")).not.toBeVisible();
});

test("FEED-010: Estate filter shows only entries from one estate", async ({ page }) => {
  await page.goto("/feed");
  // Wait for page load with estate filter bar
  await expect(page.getByRole("button", { name: "Moolay Estate" })).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Moolay Estate" }).click();

  await expect(page).toHaveURL(/estate=e-moolay/);

  // Only Vidit Light (e-moolay)
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Vidit Dark")).not.toBeVisible();
  await expect(page.getByText("Karan Medium")).not.toBeVisible();
});

test("FEED-011: Empty state shows no entries message", async ({ page }) => {
  // Clean and re-seed with only profiles (no entries)
  await cleanupAll();
  await seedProfiles();

  await page.goto("/feed");

  // Empty state message
  await expect(page.getByText(/no entries yet/i)).toBeVisible({ timeout: 5_000 });
});

test("FEED-012: FAB navigates to new entry page", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.getByText("Vidit Light")).toBeVisible({ timeout: 10_000 });

  // FAB is a link to /entry/new
  const fab = page.locator('a[href="/entry/new"]');
  await expect(fab).toBeVisible();

  await fab.click();
  await expect(page).toHaveURL(/\/entry\/new/);
});
