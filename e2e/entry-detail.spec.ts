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

test.beforeEach(async () => {
  await cleanupAll();
  await seedProfiles();
  await seedRoasteries([ROASTERIES.subko]);
  await seedEstates([ESTATES.moolay]);
  await seedEntries([ENTRIES.detailTest, ENTRIES.minimal]);
});

test.afterEach(async () => {
  await cleanupAll();
  await seedProfiles();
});

test("DETAIL-001: Entry detail page displays all fields correctly", async ({ page }) => {
  await page.goto("/entry/e-detail-test");

  await expect(page.getByRole("heading", { name: "Detail Test Blend" })).toBeVisible();
  await expect(page.getByText("8.5/10")).toBeVisible();
  // Roastery
  await expect(page.getByText("Subko")).toBeVisible();
  // Estate
  await expect(page.getByText("Moolay Estate")).toBeVisible();
  // Brew params grid
  await expect(page.getByText("18g")).toBeVisible();
  await expect(page.getByText("36g")).toBeVisible();
  await expect(page.getByText("28s")).toBeVisible();
  await expect(page.getByText("4.5")).toBeVisible();
  // Flavor notes
  await expect(page.getByText("chocolate")).toBeVisible();
  await expect(page.getByText("caramel")).toBeVisible();
  // Taste notes
  await expect(page.getByText("Rich and sweet")).toBeVisible();
  // Notes
  await expect(page.getByText("Pull at 9 bar")).toBeVisible();
  // Profile avatar "V" for Vidit
  await expect(page.getByText("V").first()).toBeVisible();
});

test("DETAIL-002: Entry detail page shows edit and delete buttons", async ({ page }) => {
  await page.goto("/entry/e-detail-test");

  // Edit link exists
  const editLink = page.locator('[data-testid="edit-entry"]');
  await expect(editLink).toBeVisible();

  // Delete button exists
  const deleteBtn = page.locator('[data-testid="delete-entry"]');
  await expect(deleteBtn).toBeVisible();

  // Click edit link → redirects to edit page
  await editLink.click();
  await expect(page).toHaveURL(/\/entry\/e-detail-test\/edit/);
});

test("DETAIL-003: Entry detail page has Feed link that navigates back", async ({ page }) => {
  await page.goto("/entry/e-detail-test");

  // Find the "Feed" back link
  const feedLink = page.getByRole("link", { name: /Feed/i });
  await expect(feedLink).toBeVisible();

  await feedLink.click();
  await expect(page).toHaveURL(/\/feed/);
});

test("DETAIL-004: Non-existent entry returns 404 page", async ({ page }) => {
  const response = await page.goto("/entry/non-existent-uuid-12345");

  // Expect 404 status or not-found content
  // Next.js notFound() renders the not-found page
  await expect(page.getByText(/not found|404/i)).toBeVisible({ timeout: 5_000 });
});

test("DETAIL-005: Entry with no optional fields displays without errors", async ({ page }) => {
  await page.goto("/entry/e-minimal");

  // Coffee name visible
  await expect(page.getByText("Minimal Entry")).toBeVisible();

  // No rating badge
  await expect(page.getByText(/\/10/)).not.toBeVisible();

  // No roast/brew pills (no text like "Roast" in a tag context)
  // Page should not crash
  await expect(page).not.toHaveURL("/error");
});
