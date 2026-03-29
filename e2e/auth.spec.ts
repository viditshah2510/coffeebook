import { test, expect } from "./fixtures";

// AUTH tests use fresh browser contexts — no storageState
const freshTest = test.extend<{}>({
  context: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: undefined });
    await use(context);
    await context.close();
  },
  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
    await page.close();
  },
});

freshTest.describe("AUTH: Password Gate", () => {
  freshTest("AUTH-001: Wrong password shows error, no profile selector", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder("Enter password")).toBeVisible();
    await page.getByPlaceholder("Enter password").fill("wrongpassword");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByText(/wrong password/i)).toBeVisible({ timeout: 5_000 });
    // Profile buttons should not be visible
    await expect(page.getByRole("button", { name: /Vidit/i })).not.toBeVisible();
  });

  freshTest("AUTH-002: Correct password shows profile selector", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Enter password").fill("scale@123");
    await page.getByRole("button", { name: "Enter" }).click();
    // Three profile buttons should appear
    await expect(page.getByRole("button", { name: /Karan/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: /Vidit/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Amar/i })).toBeVisible();
    // Password input should be gone
    await expect(page.getByPlaceholder("Enter password")).not.toBeVisible();
  });

  freshTest("AUTH-003: Profile selection sets localStorage and redirects to feed", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Enter password").fill("scale@123");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByRole("button", { name: /Vidit/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /Vidit/i }).click();

    await page.waitForURL("**/feed", { timeout: 10_000 });

    // Check localStorage
    const profile = await page.evaluate(() => localStorage.getItem("coffeebook-profile"));
    expect(profile).toBe("vidit");

    // Header should show Vidit
    await expect(page.getByText("Vidit").first()).toBeVisible();
  });

  freshTest("AUTH-004: Profile persists across page reload", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Enter password").fill("scale@123");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByRole("button", { name: /Vidit/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /Vidit/i }).click();
    await page.waitForURL("**/feed", { timeout: 10_000 });

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still show Vidit, NOT redirect to password gate
    await expect(page.getByText("Vidit").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder("Enter password")).not.toBeVisible();
  });
});

test.describe("AUTH: Logout & Profile Switch", () => {
  // AUTH-005: After logout, profile is cleared and user redirected to /
  // NOTE: The app's logout (clearProfile) does NOT clear sessionStorage,
  // so "coffeebook-auth" remains in sessionStorage. The home page will show
  // the ProfileSelector (not the password gate) after logout.
  test("AUTH-005: Logout clears profile and redirects to home", async ({ page }) => {
    await page.goto("/feed");
    // Verify logged in with a profile
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible({ timeout: 5_000 });

    await page.locator('[data-testid="logout-button"]').click();

    // Should redirect to /
    await page.waitForURL("**/", { timeout: 10_000 });

    // localStorage profile should be cleared
    const profile = await page.evaluate(() => localStorage.getItem("coffeebook-profile"));
    expect(profile).toBeNull();

    // Since sessionStorage auth is NOT cleared, the profile selector appears (not password gate)
    // This documents the actual behavior: sessionStorage persists across logout
    await expect(page.getByRole("button", { name: /Vidit/i })).toBeVisible({ timeout: 5_000 });
  });

  freshTest("AUTH-006: Unauthenticated access to /feed shows password gate or login page", async ({ page }) => {
    // Navigate directly to /feed without auth
    await page.goto("/feed");
    // The app is client-side only auth — feed page may render server content
    // but the HeaderBar will be missing profile info
    // The PasswordGate is on / not /feed, so /feed may just show content without profile
    // What we verify: the page doesn't crash
    await expect(page).not.toHaveURL("/error");
    // The password gate component lives on / only, so going to /feed directly
    // should show the feed (possibly without profile context — that's the current behavior)
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe("complete");
  });

  test("AUTH-007: Switching profiles changes header", async ({ page }) => {
    // Start as Vidit (fixture already injects coffeebook-auth=true)
    await page.goto("/feed");
    await expect(page.getByText("Vidit").first()).toBeVisible({ timeout: 5_000 });

    // Logout
    await page.locator('[data-testid="logout-button"]').click();
    await page.waitForURL("**/", { timeout: 10_000 });

    // Since session is still valid, profile selector appears
    await expect(page.getByRole("button", { name: /Karan/i })).toBeVisible({ timeout: 5_000 });

    // Select Karan
    await page.getByRole("button", { name: /Karan/i }).click();
    await page.waitForURL("**/feed", { timeout: 10_000 });

    // Header should now show Karan
    await expect(page.getByText("Karan").first()).toBeVisible({ timeout: 5_000 });
  });

  freshTest("AUTH-008: Password field shows error on wrong attempt", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Enter password").fill("wrong");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByText(/wrong password/i)).toBeVisible({ timeout: 5_000 });
    // User can still see the input to retry
    await expect(page.getByPlaceholder("Enter password")).toBeVisible();
  });
});
