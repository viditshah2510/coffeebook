import { test, expect } from "./fixtures";
import {
  seedProfiles,
  seedEntries,
  cleanupAll,
  ENTRIES,
} from "./helpers/db";

test.beforeEach(async () => {
  await cleanupAll();
  await seedProfiles();
  await seedEntries([ENTRIES.deleteTest]);
});

test.afterEach(async () => {
  await cleanupAll();
  await seedProfiles();
});

test("DELETE-001: Delete entry with confirmation dialog", async ({ page }) => {
  await page.goto("/entry/e-delete-test");
  await expect(page.getByText("Delete Me Coffee")).toBeVisible();

  // Accept the confirm dialog
  page.on("dialog", (dialog) => dialog.accept());

  await page.locator('[data-testid="delete-entry"]').click();

  // Should redirect to feed
  await page.waitForURL(/\/feed/, { timeout: 15_000 });

  // Entry should not appear in feed
  await expect(page.getByText("Delete Me Coffee")).not.toBeVisible();

  // Toast "Entry deleted" should have appeared (may have faded)
  // We just verify the redirect happened
});

test("DELETE-002: Cancel delete keeps entry", async ({ page }) => {
  await page.goto("/entry/e-delete-test");
  await expect(page.getByText("Delete Me Coffee")).toBeVisible();

  // Dismiss the confirm dialog
  page.on("dialog", (dialog) => dialog.dismiss());

  await page.locator('[data-testid="delete-entry"]').click();

  // Should stay on entry page
  await expect(page).toHaveURL(/\/entry\/e-delete-test/);
  await expect(page.getByText("Delete Me Coffee")).toBeVisible();
});

test("DELETE-003: Deleted entry is no longer accessible by direct URL", async ({ page }) => {
  // First create a temporary entry
  await page.goto("/entry/new");
  await page.getByPlaceholder(/Bili hu/i).fill("Temp Delete Entry");
  await page.getByRole("button", { name: "Save Entry" }).click();
  await page.waitForURL(/\/entry\/[a-z0-9-]+$/, { timeout: 15_000 });

  const entryUrl = page.url();

  // Delete it
  page.on("dialog", (dialog) => dialog.accept());
  await page.locator('[data-testid="delete-entry"]').click();
  await page.waitForURL(/\/feed/, { timeout: 15_000 });

  // Try to access the deleted entry directly
  const response = await page.goto(entryUrl);
  // Next.js notFound() renders a 404 page — check either HTTP status or page content
  await page.waitForLoadState("networkidle");
  // The page should show 404 content — Next.js not-found renders its own page
  // We verify the original entry content is NOT visible
  await expect(page.getByText("Temp Delete Entry")).not.toBeVisible({ timeout: 5_000 });
  // And verify it's not the normal detail page
  await expect(page.locator('[data-testid="delete-entry"]')).not.toBeVisible();
});

test("DELETE-004: Delete button exists and is clickable on entry page", async ({ page }) => {
  await page.goto("/entry/e-delete-test");

  const deleteBtn = page.locator('[data-testid="delete-entry"]');
  await expect(deleteBtn).toBeVisible();
  await expect(deleteBtn).toBeEnabled();

  // Set up a dismissing dialog handler so we don't actually delete
  page.on("dialog", (dialog) => dialog.dismiss());
  await deleteBtn.click();

  // Still on page (dialog was dismissed)
  await expect(page).toHaveURL(/\/entry\/e-delete-test/);
});
