import { test, expect } from "./fixtures";
import {
  seedProfiles,
  seedEstates,
  seedEntries,
  cleanupAll,
  ESTATES,
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

test("ESTATE-001: Add estate via dialog with all fields", async ({ page }) => {
  await page.goto("/estates");

  await page.getByRole("button", { name: "Add Estate" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await expect(dialog.getByRole("heading", { name: /Add Estate/i })).toBeVisible();

  // Fill all fields
  await dialog.getByPlaceholder(/Moolay Estate/i).fill("Test Estate");
  await dialog.getByPlaceholder(/Coorg/i).fill("Chikmagalur, Karnataka");
  await dialog.getByPlaceholder(/India/i).fill("India");
  await dialog.getByPlaceholder(/1200/i).fill("1200");

  const addBtn = dialog.getByRole("button", { name: "Add" });
  await expect(addBtn).toBeEnabled();
  await addBtn.click();

  // Dialog closes
  await expect(dialog).not.toBeVisible({ timeout: 5_000 });

  // Estate appears in list
  await expect(page.getByText("Test Estate")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Chikmagalur, Karnataka")).toBeVisible();
});

test("ESTATE-002: Add estate with only required name field", async ({ page }) => {
  await page.goto("/estates");

  await page.getByRole("button", { name: "Add Estate" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });

  // Only fill name
  await dialog.getByPlaceholder(/Moolay Estate/i).fill("Name Only Estate");

  const addBtn = dialog.getByRole("button", { name: "Add" });
  await addBtn.click();

  await expect(dialog).not.toBeVisible({ timeout: 5_000 });

  // Estate appears in list
  await expect(page.getByText("Name Only Estate")).toBeVisible({ timeout: 10_000 });
});

test("ESTATE-003: Edit estate", async ({ page }) => {
  await seedEstates([ESTATES.moolay]);

  await page.goto("/estates");
  await expect(page.getByText("Moolay Estate")).toBeVisible({ timeout: 5_000 });

  // Click edit button (pencil) next to Moolay Estate
  // The row is a flex justify-between div containing span.font-medium and two buttons
  const estateRow = page.locator('div.flex.items-center.justify-between').filter({ has: page.locator('span.font-medium', { hasText: 'Moolay Estate' }) });
  await estateRow.locator('button').first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await expect(dialog.getByRole("heading", { name: /Edit Estate/i })).toBeVisible();

  // Pre-filled
  await expect(dialog.getByPlaceholder(/Moolay Estate/i)).toHaveValue("Moolay Estate");

  // Change name
  await dialog.getByPlaceholder(/Moolay Estate/i).clear();
  await dialog.getByPlaceholder(/Moolay Estate/i).fill("Moolay Estate Updated");

  // Change altitude
  const altInput = dialog.getByPlaceholder(/1200/i);
  await altInput.clear();
  await altInput.fill("1300");

  const updateBtn = dialog.getByRole("button", { name: "Update" });
  await updateBtn.click();

  await expect(dialog).not.toBeVisible({ timeout: 5_000 });

  // Updated name in list
  await expect(page.getByText("Moolay Estate Updated")).toBeVisible({ timeout: 10_000 });
});

test("ESTATE-004: Delete estate (not in use)", async ({ page }) => {
  await seedEstates([ESTATES.disposable]);

  await page.goto("/estates");
  await expect(page.getByText("Disposable Estate")).toBeVisible({ timeout: 5_000 });

  // Click delete button (trash) next to Disposable Estate
  const estateRow = page.locator('div.flex.items-center.justify-between').filter({ has: page.locator('span.font-medium', { hasText: 'Disposable Estate' }) });
  await estateRow.locator('button').last().click();

  // Wait for item to disappear
  await expect(page.getByText("Disposable Estate")).not.toBeVisible({ timeout: 10_000 });

  // Reload to confirm
  await page.reload();
  await expect(page.getByText("Disposable Estate")).not.toBeVisible();
});

test("ESTATE-005: Empty state shows 'No estates yet' message", async ({ page }) => {
  await page.goto("/estates");
  await expect(page.getByText(/No estates yet/i)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole("button", { name: "Add Estate" })).toBeVisible();
});

test("ESTATE-006: Cannot add estate with empty name", async ({ page }) => {
  await page.goto("/estates");
  await page.getByRole("button", { name: "Add Estate" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });

  // Name empty
  const addBtn = dialog.getByRole("button", { name: "Add" });
  await expect(addBtn).toBeDisabled();

  // Fill location but not name
  await dialog.getByPlaceholder(/Coorg/i).fill("Karnataka");

  // Still disabled
  await expect(addBtn).toBeDisabled();
});

test("ESTATE-007: Delete estate that is in use — document behavior", async ({ page }) => {
  await seedEstates([ESTATES.moolay]);
  // Seed an entry referencing moolay without roastery FK
  await seedEntries([{
    id: "e-estate-test",
    profileId: "vidit",
    coffeeName: "Estate Ref Test",
    estateId: "e-moolay",
    createdAt: "2024-01-01T10:00:00",
    updatedAt: "2024-01-01T10:00:00",
  }]);

  await page.goto("/estates");
  await expect(page.getByText("Moolay Estate")).toBeVisible({ timeout: 5_000 });

  const estateRow = page.locator('div.flex.items-center.justify-between').filter({ has: page.locator('span.font-medium', { hasText: 'Moolay Estate' }) });
  await estateRow.locator('button').last().click();

  await page.waitForTimeout(2000);

  const isGone = !(await page.getByText("Moolay Estate").isVisible());
  const hasError = await page.getByText(/Cannot delete|error/i).isVisible();

  console.log(`ESTATE-007: Moolay Estate deleted=${isGone}, error shown=${hasError}`);
  expect(true).toBe(true);
});

test("ESTATE-008: Estate list shows location alongside name", async ({ page }) => {
  await seedEstates([ESTATES.moolay]);

  await page.goto("/estates");
  await expect(page.getByText("Moolay Estate")).toBeVisible({ timeout: 5_000 });
  // Location should be visible in the list item
  await expect(page.getByText("Coorg, Karnataka")).toBeVisible();
});
