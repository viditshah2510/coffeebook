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
  await seedEntries([ENTRIES.detailTest]);
});

test.afterEach(async () => {
  await cleanupAll();
  await seedProfiles();
});

test("EDIT-001: Edit form pre-populates with existing values", async ({ page }) => {
  await page.goto("/entry/e-detail-test/edit");

  await expect(page.getByRole("heading", { name: /Edit Entry/i })).toBeVisible({ timeout: 5_000 });

  // Name input should be pre-filled
  const nameInput = page.getByPlaceholder(/Bili hu/i);
  await expect(nameInput).toHaveValue("Detail Test Blend");

  // Roastery dropdown shows Subko
  // Base UI Select shows the option label OR the value id — check both cases
  const roasteryTrigger = page.locator('[data-slot="select-trigger"]').first();
  const roasteryTriggerText = await roasteryTrigger.textContent();
  // The trigger shows either "Subko▼" (label) or "r-subko▼" (id) depending on Base UI version
  expect(roasteryTriggerText).toMatch(/Subko|r-subko/);

  // Estate shows selected (similar behavior)
  const estateTrigger = page.locator('[data-slot="select-trigger"]').nth(1);
  const estateTriggerText = await estateTrigger.textContent();
  expect(estateTriggerText).toMatch(/Moolay|e-moolay/);

  // Rating
  await expect(page.getByText("8.5/10")).toBeVisible();

  // Brewing params — labels have no 'for' attribute, use name selectors
  await expect(page.locator('input[name="coffeeWeight"]')).toHaveValue("18");
  await expect(page.locator('input[name="shotWeight"]')).toHaveValue("36");
  await expect(page.locator('input[name="brewTime"]')).toHaveValue("28");

  // Flavor notes
  await expect(page.locator('input[name="flavorNotes"]')).toHaveValue("chocolate, caramel");

  // Submit button should say "Update Entry"
  await expect(page.getByRole("button", { name: "Update Entry" })).toBeVisible();
});

test("EDIT-002: Update entry changes data and redirects to feed", async ({ page }) => {
  await page.goto("/entry/e-detail-test/edit");
  await expect(page.getByRole("button", { name: "Update Entry" })).toBeVisible({ timeout: 5_000 });

  // Change name
  const nameInput = page.getByPlaceholder(/Bili hu/i);
  await nameInput.clear();
  await nameInput.fill("Updated Blend");

  // Change roast level to Light
  await page.getByRole("button", { name: "Light" }).click();

  // Change rating to 9.0
  const slider = page.getByRole("slider");
  await slider.fill("9");

  // Submit
  await page.getByRole("button", { name: "Update Entry" }).click();

  // Should redirect to /feed after update
  await page.waitForURL(/\/feed/, { timeout: 15_000 });

  // Find the updated entry in the feed
  await expect(page.getByText("Updated Blend")).toBeVisible({ timeout: 5_000 });

  // Click it to see detail
  await page.getByText("Updated Blend").click();

  // Verify changes
  await expect(page.getByRole("heading", { name: "Updated Blend" })).toBeVisible();
  await expect(page.getByText("9.0/10")).toBeVisible();
  // Verify unchanged fields still exist
  await expect(page.getByText("36g")).toBeVisible();
});

test("EDIT-003: Edit non-existent entry returns 404", async ({ page }) => {
  await page.goto("/entry/fake-id-xyz/edit");
  await expect(page.getByText(/not found|404/i)).toBeVisible({ timeout: 5_000 });
});

test("EDIT-004: Edit preserves roastery and estate selections", async ({ page }) => {
  await page.goto("/entry/e-detail-test/edit");
  await expect(page.getByRole("button", { name: "Update Entry" })).toBeVisible({ timeout: 5_000 });

  // Change only the coffee name
  const nameInput = page.getByPlaceholder(/Bili hu/i);
  await nameInput.clear();
  await nameInput.fill("Roastery Preserved Test");

  await page.getByRole("button", { name: "Update Entry" }).click();
  await page.waitForURL(/\/feed/, { timeout: 15_000 });

  // Find the entry and check detail
  await page.getByText("Roastery Preserved Test").click();
  // On the detail page, roastery appears as a paragraph text
  await expect(page.locator("p").filter({ hasText: "Subko" }).first()).toBeVisible();
  await expect(page.locator("p").filter({ hasText: /Moolay Estate/ }).first()).toBeVisible();
});

test("EDIT-005: Edit can clear optional fields", async ({ page }) => {
  await page.goto("/entry/e-detail-test/edit");
  await expect(page.getByRole("button", { name: "Update Entry" })).toBeVisible({ timeout: 5_000 });

  // Clear flavor notes
  const flavorInput = page.locator('input[name="flavorNotes"]');
  await flavorInput.clear();

  // Clear taste notes
  const tasteNotesInput = page.getByPlaceholder(/How did this brew taste/i);
  await tasteNotesInput.clear();

  // Clear rating
  await page.getByRole("button", { name: "Clear" }).click();

  await page.getByRole("button", { name: "Update Entry" }).click();
  await page.waitForURL(/\/feed/, { timeout: 15_000 });

  // Navigate to the updated entry
  await page.getByText("Detail Test Blend").click();

  // No rating badge
  await expect(page.getByText(/\/10/)).not.toBeVisible();
  // No flavor notes
  await expect(page.getByText("chocolate")).not.toBeVisible();
  // No taste notes section content
  await expect(page.getByText("Rich and sweet")).not.toBeVisible();
});

test("EDIT-006: Edit can change roast level", async ({ page }) => {
  await page.goto("/entry/e-detail-test/edit");
  await expect(page.getByRole("button", { name: "Update Entry" })).toBeVisible({ timeout: 5_000 });

  // Click Dark roast (exact match to avoid matching "Medium Dark")
  await page.getByRole("button", { name: "Dark", exact: true }).click();

  await page.getByRole("button", { name: "Update Entry" }).click();
  await page.waitForURL(/\/feed/, { timeout: 15_000 });

  await page.getByText("Detail Test Blend").click();

  // Verify Dark roast pill is visible on detail page
  // On detail page, roast level shows as "Dark Roast" in a colored span tag
  await expect(page.getByText("Dark Roast")).toBeVisible();
});

test("EDIT-007: Edit can change brew type", async ({ page }) => {
  await page.goto("/entry/e-detail-test/edit");
  await expect(page.getByRole("button", { name: "Update Entry" })).toBeVisible({ timeout: 5_000 });

  // Change to Pour Over
  await page.getByRole("button", { name: "Pour Over" }).click();

  await page.getByRole("button", { name: "Update Entry" }).click();
  await page.waitForURL(/\/feed/, { timeout: 15_000 });

  await page.getByText("Detail Test Blend").click();

  // Verify Pour Over brew type pill
  await expect(page.getByText("Pour Over")).toBeVisible();
});
