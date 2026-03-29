import { test, expect } from "./fixtures";
import {
  seedProfiles,
  seedRoasteries,
  seedEstates,
  cleanupAll,
  ROASTERIES,
  ESTATES,
} from "./helpers/db";

test.beforeEach(async () => {
  await cleanupAll();
  await seedProfiles();
  await seedRoasteries([ROASTERIES.subko]);
  await seedEstates([ESTATES.moolay]);
});

test.afterEach(async () => {
  await cleanupAll();
  await seedProfiles();
});

test("CREATE-001: Create entry with only required field (coffee name)", async ({ page }) => {
  await page.goto("/entry/new");
  await expect(page.getByPlaceholder(/Bili hu/i)).toBeVisible();

  await page.getByPlaceholder(/Bili hu/i).fill("Minimal Test Coffee");
  await page.getByRole("button", { name: "Save Entry" }).click();

  // Should redirect to entry detail
  await page.waitForURL(/\/entry\/[a-z0-9-]+$/, { timeout: 15_000 });

  await expect(page.getByText("Minimal Test Coffee")).toBeVisible();
});

test("CREATE-002: Create entry with all fields populated", async ({ page }) => {
  await page.goto("/entry/new");

  // Fill name
  await page.getByPlaceholder(/Bili hu/i).fill("Full Test Espresso");

  // Select roastery — Base UI Select, first [data-slot="select-trigger"] is roastery
  await page.locator('[data-slot="select-trigger"]').first().click();
  // Wait for options to be visible (listbox may already be in DOM but hidden)
  await expect(page.getByRole("option", { name: "Subko" })).toBeVisible({ timeout: 5_000 });
  await page.getByRole("option", { name: "Subko" }).click();

  // Select estate — second [data-slot="select-trigger"] is estate
  await page.locator('[data-slot="select-trigger"]').nth(1).click();
  await expect(page.getByRole("option", { name: /Moolay Estate/i })).toBeVisible({ timeout: 5_000 });
  await page.getByRole("option", { name: /Moolay Estate/i }).click();

  // Select roast level
  await page.getByRole("button", { name: "Medium Dark" }).click();

  // Select brew type
  await page.getByRole("button", { name: "Espresso" }).click();

  // Brewing params — use name attribute selectors since labels have no for attribute
  await page.locator('input[name="coffeeWeight"]').fill("18");
  await page.locator('input[name="shotWeight"]').fill("36");
  await page.locator('input[name="brewTime"]').fill("28");
  await page.locator('input[name="grindSize"]').fill("4.5");
  await page.locator('input[name="grinderType"]').fill("Niche Zero");

  // Flavor notes
  await page.locator('input[name="flavorNotes"]').fill("chocolate, caramel, hazelnut");

  // Taste notes
  await page.getByPlaceholder(/How did this brew taste/i).fill("Rich body with sweet finish");

  // Rating slider
  const slider = page.getByRole("slider");
  await slider.fill("8.5");

  // Notes
  await page.getByPlaceholder(/Your thoughts/i).fill("Best extraction at 28 seconds");

  // Submit
  await page.getByRole("button", { name: "Save Entry" }).click();
  await page.waitForURL(/\/entry\/[a-z0-9-]+$/, { timeout: 15_000 });

  // Verify all fields on detail page
  await expect(page.getByText("Full Test Espresso")).toBeVisible();
  await expect(page.getByText("Subko")).toBeVisible();
  await expect(page.getByText("Moolay Estate")).toBeVisible();
  await expect(page.getByText(/8\.5\/10/)).toBeVisible();
  await expect(page.getByText(/18g/)).toBeVisible();
  await expect(page.getByText(/36g/)).toBeVisible();
  await expect(page.getByText(/28s/)).toBeVisible();
  await expect(page.getByText("4.5")).toBeVisible();
  await expect(page.getByText("chocolate")).toBeVisible();
  await expect(page.getByText("Rich body with sweet finish")).toBeVisible();
  await expect(page.getByText("Best extraction at 28 seconds")).toBeVisible();
});

test("CREATE-003: Created entry appears in feed", async ({ page }) => {
  await page.goto("/entry/new");
  await page.getByPlaceholder(/Bili hu/i).fill("Feed Test Coffee");
  await page.getByRole("button", { name: "Save Entry" }).click();
  await page.waitForURL(/\/entry\/[a-z0-9-]+$/, { timeout: 15_000 });

  // Navigate to feed
  await page.goto("/feed");
  await expect(page.getByText("Feed Test Coffee")).toBeVisible({ timeout: 10_000 });
});

test("CREATE-004: Coffee name is required — form does not submit without it", async ({ page }) => {
  await page.goto("/entry/new");

  // Do NOT fill coffee name
  await page.getByRole("button", { name: "Light" }).click(); // Select something to confirm other state

  // Try to submit
  await page.getByRole("button", { name: "Save Entry" }).click();

  // Should still be on /entry/new (HTML required prevents submit)
  await expect(page).toHaveURL(/\/entry\/new/);
});

test("CREATE-005: Roast level toggle — select and deselect", async ({ page }) => {
  await page.goto("/entry/new");

  // Click Light
  await page.getByRole("button", { name: "Light" }).click();
  // Click Medium (deselects Light, selects Medium)
  await page.getByRole("button", { name: "Medium" }).first().click();
  // Click Medium again to deselect
  await page.getByRole("button", { name: "Medium" }).first().click();

  // Fill name and submit
  await page.getByPlaceholder(/Bili hu/i).fill("Toggle Test");
  await page.getByRole("button", { name: "Save Entry" }).click();
  await page.waitForURL(/\/entry\/[a-z0-9-]+$/, { timeout: 15_000 });

  // No roast level pill on detail page — roast level tags end in " Roast" on the detail page
  // The detail page shows the roast as a colored pill with text like "Medium Dark Roast"
  // None of the roast level values should appear as a pill
  await expect(page.getByText(/Light Roast|Medium Roast|Medium Dark Roast|Dark Roast/)).not.toBeVisible();
});

test("CREATE-006: Brew type toggle — select and deselect", async ({ page }) => {
  await page.goto("/entry/new");

  // Click Pour Over
  await page.getByRole("button", { name: "Pour Over" }).click();
  // Click AeroPress
  await page.getByRole("button", { name: "AeroPress" }).click();
  // Click AeroPress again to deselect
  await page.getByRole("button", { name: "AeroPress" }).click();

  // Fill name and submit
  await page.getByPlaceholder(/Bili hu/i).fill("Brew Toggle Test");
  await page.getByRole("button", { name: "Save Entry" }).click();
  await page.waitForURL(/\/entry\/[a-z0-9-]+$/, { timeout: 15_000 });

  // No brew type pill
  await expect(page.getByText("AeroPress")).not.toBeVisible();
  await expect(page.getByText("Pour Over")).not.toBeVisible();
});

test("CREATE-007: Rating slider sets value and can be cleared", async ({ page }) => {
  await page.goto("/entry/new");

  // Initially no rating display (or rating=0 is hidden)
  await expect(page.getByText(/\/10/)).not.toBeVisible();

  // Set slider
  const slider = page.getByRole("slider");
  await slider.fill("7.5");

  // Rating display should appear
  await expect(page.getByText("7.5/10")).toBeVisible({ timeout: 5_000 });

  // Click Clear
  await page.getByRole("button", { name: "Clear" }).click();

  // Rating display disappears
  await expect(page.getByText(/\/10/)).not.toBeVisible();
});

test("CREATE-008: Add roastery inline from entry form", async ({ page }) => {
  await page.goto("/entry/new");

  // Click the + button next to Roastery (title="Add new roastery")
  await page.locator('button[title="Add new roastery"]').click();

  // Dialog appears
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });

  // Add button should be disabled with empty name
  const addBtn = dialog.getByRole("button", { name: "Add" });
  await expect(addBtn).toBeDisabled();

  // Fill name
  await dialog.getByPlaceholder(/Subko, Blue Tokai/i).fill("Blue Tokai");

  // Add button enabled
  await expect(addBtn).toBeEnabled();
  await addBtn.click();

  // Dialog closes
  await expect(dialog).not.toBeVisible({ timeout: 5_000 });

  // Toast appears
  await expect(page.getByText("Roastery added")).toBeVisible({ timeout: 5_000 });

  // After adding, the roastery is auto-selected. Toast confirms.
  // The select trigger may show "Blue Tokai" or may need a moment to update.
  // Instead verify the toast appeared and submit to check DB persistence.
  await page.waitForTimeout(500); // allow state update

  // Submit entry
  await page.getByPlaceholder(/Bili hu/i).fill("Inline Roastery Test");
  await page.getByRole("button", { name: "Save Entry" }).click();
  await page.waitForURL(/\/entry\/[a-z0-9-]+$/, { timeout: 15_000 });

  // Detail page shows Blue Tokai
  await expect(page.getByText("Blue Tokai")).toBeVisible();

  // Check roasteries list
  await page.goto("/roasteries");
  await expect(page.getByText("Blue Tokai")).toBeVisible();
});

test("CREATE-009: Add estate inline from entry form", async ({ page }) => {
  await page.goto("/entry/new");

  // Click + next to Estate
  await page.locator('button[title="Add new estate"]').click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });

  // Fill estate details
  await dialog.getByPlaceholder(/Moolay Estate/i).fill("Kerehaklu");
  await dialog.getByPlaceholder(/Coorg/i).fill("Chikmagalur, Karnataka");
  await dialog.getByPlaceholder(/India/i).fill("India");
  // Fill altitude
  await dialog.getByPlaceholder(/1200/i).fill("1100");

  const addBtn = dialog.getByRole("button", { name: "Add" });
  await expect(addBtn).toBeEnabled();
  await addBtn.click();

  // Dialog closes and estate auto-selected
  await expect(dialog).not.toBeVisible({ timeout: 5_000 });

  // After adding, the estate is auto-selected. Allow state update.
  await page.waitForTimeout(500);

  // Submit
  await page.getByPlaceholder(/Bili hu/i).fill("Inline Estate Test");
  await page.getByRole("button", { name: "Save Entry" }).click();
  await page.waitForURL(/\/entry\/[a-z0-9-]+$/, { timeout: 15_000 });

  await expect(page.getByText("Kerehaklu")).toBeVisible();
});

test("CREATE-010: Numeric fields accept valid numbers", async ({ page }) => {
  await page.goto("/entry/new");

  await page.getByPlaceholder(/Bili hu/i).fill("Numeric Test");
  await page.locator('input[name="coffeeWeight"]').fill("18.5");
  await page.locator('input[name="shotWeight"]').fill("36");
  await page.locator('input[name="brewTime"]').fill("25");

  await page.getByRole("button", { name: "Save Entry" }).click();
  await page.waitForURL(/\/entry\/[a-z0-9-]+$/, { timeout: 15_000 });

  // Verify numeric values on detail page
  await expect(page.getByText(/18\.5g/)).toBeVisible();
  await expect(page.getByText(/36g/)).toBeVisible();
  await expect(page.getByText(/25s/)).toBeVisible();
});
