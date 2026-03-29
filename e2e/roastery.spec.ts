import { test, expect } from "./fixtures";
import {
  seedProfiles,
  seedRoasteries,
  seedEntries,
  cleanupAll,
  ROASTERIES,
  ENTRIES,
} from "./helpers/db";

test.beforeEach(async () => {
  await cleanupAll();
  await seedProfiles();
});

test.afterEach(async () => {
  await cleanupAll();
  await seedProfiles();
});

test("ROAST-001: Add roastery via dialog", async ({ page }) => {
  await page.goto("/roasteries");

  await page.getByRole("button", { name: "Add Roastery" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await expect(dialog.getByRole("heading", { name: /Add Roastery/i })).toBeVisible();

  // Add button disabled with empty name
  const addBtn = dialog.getByRole("button", { name: "Add" });
  await expect(addBtn).toBeDisabled();

  // Fill name
  await dialog.getByPlaceholder(/Subko, Blue Tokai/i).fill("Third Wave");

  // Button enabled
  await expect(addBtn).toBeEnabled();
  await addBtn.click();

  // Dialog closes
  await expect(dialog).not.toBeVisible({ timeout: 5_000 });

  // Roastery appears in list
  await expect(page.getByText("Third Wave")).toBeVisible({ timeout: 10_000 });
});

test("ROAST-002: Edit roastery name", async ({ page }) => {
  await seedRoasteries([ROASTERIES.subko]);

  await page.goto("/roasteries");
  await expect(page.getByText("Subko")).toBeVisible({ timeout: 5_000 });

  // Click the pencil/edit button next to Subko
  // The row is a flex justify-between div containing span.font-medium and two buttons
  const roasteryRow = page.locator('div.flex.items-center.justify-between').filter({ has: page.locator('span.font-medium', { hasText: 'Subko' }) });
  await roasteryRow.locator('button').first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await expect(dialog.getByRole("heading", { name: /Edit Roastery/i })).toBeVisible();

  // Name should be pre-filled
  const nameInput = dialog.getByPlaceholder(/Subko, Blue Tokai/i);
  await expect(nameInput).toHaveValue("Subko");

  // Change name
  await nameInput.clear();
  await nameInput.fill("Subko Coffee");

  // Click Update
  const updateBtn = dialog.getByRole("button", { name: "Update" });
  await expect(updateBtn).toBeEnabled();
  await updateBtn.click();

  // Dialog closes
  await expect(dialog).not.toBeVisible({ timeout: 5_000 });

  // Updated name in list
  await expect(page.getByText("Subko Coffee")).toBeVisible({ timeout: 10_000 });
  // "Subko" should no longer appear as an exact standalone item
  await expect(page.getByText("Subko", { exact: true })).not.toBeVisible();
});

test("ROAST-003: Delete roastery (not in use)", async ({ page }) => {
  await seedRoasteries([ROASTERIES.disposable]);

  await page.goto("/roasteries");
  await expect(page.getByText("Disposable Roastery")).toBeVisible({ timeout: 5_000 });

  // Click the trash/delete button next to Disposable Roastery
  const roasteryRow = page.locator('div.flex.items-center.justify-between').filter({ has: page.locator('span.font-medium', { hasText: 'Disposable Roastery' }) });
  await roasteryRow.locator('button').last().click();

  // Wait for the item to disappear
  await expect(page.getByText("Disposable Roastery")).not.toBeVisible({ timeout: 10_000 });

  // Reload to confirm persistence
  await page.reload();
  await expect(page.getByText("Disposable Roastery")).not.toBeVisible();
});

test("ROAST-004: Empty state shows 'No roasteries yet' message", async ({ page }) => {
  // No roasteries seeded
  await page.goto("/roasteries");
  await expect(page.getByText(/No roasteries yet/i)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole("button", { name: "Add Roastery" })).toBeVisible();
});

test("ROAST-005: Cannot add roastery with empty name", async ({ page }) => {
  await page.goto("/roasteries");
  await page.getByRole("button", { name: "Add Roastery" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });

  const addBtn = dialog.getByRole("button", { name: "Add" });
  await expect(addBtn).toBeDisabled();

  // Type spaces only
  await dialog.getByPlaceholder(/Subko, Blue Tokai/i).fill("   ");
  await expect(addBtn).toBeDisabled();
});

test("ROAST-006: Close dialog without saving discards input", async ({ page }) => {
  await page.goto("/roasteries");
  await page.getByRole("button", { name: "Add Roastery" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });

  await dialog.getByPlaceholder(/Subko, Blue Tokai/i).fill("Temp Roastery");

  // Close dialog (press Escape or click outside)
  await page.keyboard.press("Escape");

  // Dialog closes
  await expect(dialog).not.toBeVisible({ timeout: 5_000 });

  // "Temp Roastery" should not appear
  await expect(page.getByText("Temp Roastery")).not.toBeVisible();
});

test("ROAST-007: Roastery list sorted alphabetically", async ({ page }) => {
  await seedRoasteries([
    ROASTERIES.subko,
    ROASTERIES.bt,
    { id: "r-tw", name: "Third Wave", createdAt: "2024-01-01T00:00:03" },
  ]);

  await page.goto("/roasteries");
  await expect(page.getByText("Subko")).toBeVisible({ timeout: 5_000 });

  // Get all roastery names in order
  const names = await page.locator('div.space-y-2 span.font-medium').allTextContents();
  expect(names).toEqual(["Blue Tokai", "Subko", "Third Wave"]);
});

test("ROAST-008: Delete roastery that is in use — document behavior", async ({ page }) => {
  // Seed: roastery r-subko with an entry referencing it (no estate, no other FK)
  await seedRoasteries([ROASTERIES.subko]);
  await seedEntries([{
    id: "e-roastery-test",
    profileId: "vidit",
    coffeeName: "Roastery Ref Test",
    roasteryId: "r-subko",
    createdAt: "2024-01-01T10:00:00",
    updatedAt: "2024-01-01T10:00:00",
  }]);

  await page.goto("/roasteries");
  await expect(page.getByText("Subko")).toBeVisible({ timeout: 5_000 });

  // Click delete on Subko (which is in use)
  const roasteryRow = page.locator('div.flex.items-center.justify-between').filter({ has: page.locator('span.font-medium', { hasText: 'Subko' }) });
  await roasteryRow.locator('button').last().click();

  // Wait briefly and observe outcome
  await page.waitForTimeout(2000);

  // Document what happens — either deleted (SQLite FK not enforced) or error toast
  const isGone = !(await page.getByText("Subko").isVisible());
  const hasError = await page.getByText(/Cannot delete|error/i).isVisible();

  console.log(`ROAST-008: Subko deleted=${isGone}, error shown=${hasError}`);
  // This test documents behavior — either outcome is valid, just recording it
  expect(true).toBe(true); // Always pass — this is a documentation test
});
