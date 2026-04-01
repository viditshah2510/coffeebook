# Oracle Research — Coffeebook Testing Patterns

**Date**: 2026-03-29
**App**: Next.js 16.2.1 App Router, React 19, TypeScript, Bun runtime
**Database**: SQLite via libsql + Drizzle ORM
**UI Library**: Base UI (`@base-ui/react`) wrapped with shadcn/ui convention
**Auth**: sessionStorage password gate + localStorage/cookie profile selector

---

## 1. Recommended playwright.config.ts

Based on the official Next.js Playwright guide (v16.2.1) and the vercel/next.js with-playwright example:

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { migrate } from "drizzle-orm/libsql/migrator";

// Run DB migrations before tests start (safe — idempotent)
// Only works when the test DB file path is set via env
const TEST_DB = process.env.TEST_DATABASE_URL ?? "file:./data/test.db";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Required: single SQLite file, no parallel writes
  fullyParallel: false,
  outputDir: "test-results/",

  use: {
    baseURL: "http://localhost:3456",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Restore auth state for every test (see auth setup project below)
    storageState: "playwright/.auth/user.json",
  },

  projects: [
    // 1. Auth setup — runs once, saves storageState
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { storageState: undefined }, // No auth yet at setup time
    },
    // 2. Main tests — depend on setup
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    // 3. Mobile viewport — coffee app is mobile-first
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    // Use bun to match the project's runtime
    command: "TEST_DATABASE_URL=file:./data/test.db bun run start",
    url: "http://localhost:3456",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      TEST_DATABASE_URL: "file:./data/test.db",
    },
  },
});
```

**Key decisions**:
- `workers: 1` — SQLite cannot handle concurrent writes from multiple test workers sharing one file.
- `retries: 2` on CI only — avoids masking real bugs locally.
- `retain-on-failure` trace — keeps Playwright trace archives only for failing tests, not every run.
- Mobile project added — the app uses `max-w-lg`, mobile-first layout, and `min-h-dvh`. Test on Pixel 7.
- `bun run start` not `bun run dev` — test against production build to catch build-only bugs (e.g., Server Actions behave differently in dev vs prod).

---

## 2. Auth Handling Strategy

### The Challenge

Coffeebook has two auth layers:

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| Password gate | `sessionStorage.setItem('coffeebook-auth', 'true')` | Tab-only |
| Profile selection | `localStorage.setItem('coffeebook-profile', 'vidit')` + cookie `coffeebook-profile=vidit` | Persistent |

Playwright's `storageState()` captures localStorage and cookies but **not** sessionStorage (it is tab-specific and not persisted). This requires a manual workaround.

### auth.setup.ts — One-Time Setup

```typescript
// e2e/auth.setup.ts
import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const authFile = "playwright/.auth/user.json";

setup("authenticate as Vidit", async ({ page }) => {
  await page.goto("/");

  // Step 1: Enter password
  await page.getByPlaceholder("Enter password").fill("scale@123");
  await page.getByRole("button", { name: "Enter" }).click();

  // Step 2: Profile selector appears — select Vidit
  await expect(page.getByRole("button", { name: /Vidit/i })).toBeVisible();
  await page.getByRole("button", { name: /Vidit/i }).click();

  // Step 3: Confirm redirect to /feed
  await page.waitForURL("/feed");

  // Step 4: Save storageState (localStorage + cookies, NOT sessionStorage)
  await page.context().storageState({ path: authFile });

  // Step 5: Also save sessionStorage manually
  const sessionData = await page.evaluate(() =>
    JSON.stringify(Object.fromEntries(
      Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k)])
    ))
  );
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(
    "playwright/.auth/session.json",
    sessionData,
    "utf-8"
  );
});
```

### fixtures.ts — Restore Session Storage Per Test

Because sessionStorage is tab-scoped and not in storageState, inject it via `addInitScript` before each navigation:

```typescript
// e2e/fixtures.ts
import { test as base, BrowserContext } from "@playwright/test";
import fs from "fs";
import * as schema from "../src/lib/db/schema";
import { db } from "../src/lib/db";
import { reset, seed } from "drizzle-seed";

// Load saved session storage
function getSessionData(): Record<string, string> {
  try {
    return JSON.parse(
      fs.readFileSync("playwright/.auth/session.json", "utf-8")
    );
  } catch {
    return {};
  }
}

export const test = base.extend<{
  authedPage: ReturnType<BrowserContext["newPage"]>;
}>({
  // Override context to inject sessionStorage before every page load
  context: async ({ context }, use) => {
    const sessionData = getSessionData();
    if (Object.keys(sessionData).length > 0) {
      await context.addInitScript((storage) => {
        for (const [key, value] of Object.entries(storage)) {
          window.sessionStorage.setItem(key, value as string);
        }
      }, sessionData);
    }
    await use(context);
  },
});

export { expect } from "@playwright/test";
```

### .gitignore

```
playwright/.auth/
```

---

## 3. Test Database Strategy

### Pattern: Separate Test DB File

Set `TURSO_DATABASE_URL=file:./data/test.db` for the test server. The app's `src/lib/db/index.ts` already reads from `process.env.TURSO_DATABASE_URL`, so no code change is needed.

### Seed and Reset Per Test with drizzle-seed

The Mainmatter drizzle-seed + Playwright fixtures pattern applies directly:

```typescript
// e2e/fixtures.ts (extended)
import { test as base } from "@playwright/test";
import { db as testDb } from "../src/lib/db";
import * as schema from "../src/lib/db/schema";
import { reset, seed } from "drizzle-seed";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

// Create a direct DB connection to the test database
const testClient = createClient({ url: "file:./data/test.db" });
const db = drizzle(testClient, { schema });

export const test = base.extend<{
  seedData: Partial<Record<keyof typeof schema, unknown[]>>;
}>({
  seedData: [undefined, { option: true }],

  // Auto-fixture: seed before test, reset after
  page: [
    async ({ seedData, page }, use) => {
      // Seed profiles (always needed — profiles are fixed)
      await db.insert(schema.profiles).values([
        { id: "karan", name: "Karan", initials: "K", color: "#d4a12a" },
        { id: "vidit", name: "Vidit", initials: "V", color: "#0e4444" },
        { id: "amar", name: "Amar", initials: "A", color: "#76553c" },
      ]).onConflictDoNothing();

      // Insert any test-specific seed data
      if (seedData) {
        for (const [table, rows] of Object.entries(seedData)) {
          if (rows && rows.length > 0) {
            await (db as any).insert(schema[table as keyof typeof schema]).values(rows);
          }
        }
      }

      await use(page);

      // Teardown: reset all tables except profiles
      await db.delete(schema.coffeeEntries);
      await db.delete(schema.entryPhotos);
      await db.delete(schema.roasteries);
      await db.delete(schema.estates);
    },
    { auto: true },
  ],
});
```

**Usage with specific data**:
```typescript
test.use({
  seedData: {
    roasteries: [{ id: "r1", name: "Subko", createdAt: new Date().toISOString() }],
    coffeeEntries: [{
      id: "e1",
      profileId: "vidit",
      coffeeName: "Bili Hu",
      roastLevel: "medium",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }],
  },
});

test("can edit existing entry", async ({ page }) => {
  await page.goto("/feed");
  await page.getByText("Bili Hu").click();
  // ...
});
```

**Why `workers: 1`**: SQLite file locking prevents concurrent writes. All tests must run sequentially against the single test database file.

---

## 4. Selector Strategy

### Priority Order (for this app)

| Priority | Method | When to use |
|----------|--------|-------------|
| 1 | `getByRole()` | Buttons, links, dialogs, headings, inputs |
| 2 | `getByLabel()` | Form inputs with visible label elements |
| 3 | `getByPlaceholder()` | Inputs where label is styled text (not `<label>`) |
| 4 | `getByText()` | Non-interactive text content, pill filter buttons |
| 5 | `getByTestId()` | Complex components with no accessible role |
| 6 | CSS `[data-slot]` | Last resort for Base UI internals |

### App-Specific Gotchas

#### shadcn/ui via Base UI (not Radix UI)

This app uses `@base-ui/react` — **not** the standard Radix-based shadcn. The ARIA output differs:

**Select component**:
- Trigger renders as a `<button>` with `aria-haspopup="listbox"` and `aria-expanded`
- Popup renders as `role="listbox"` inside a portal
- Items render as `role="option"`

```typescript
// Correct: Base UI Select interaction
await page.getByRole("button", { name: /Select roastery/i }).click();
// Wait for popup — it's portalled (appended to body)
await page.waitForSelector('[role="listbox"]');
await page.getByRole("option", { name: "Subko" }).click();
```

**Dialog component**:
- `DialogPrimitive.Popup` renders with `role="dialog"` and `aria-modal="true"`
- Title renders as `DialogPrimitive.Title` → heading role

```typescript
// Open dialog, interact, close
await page.getByRole("button", { name: "Add Roastery" }).click();
const dialog = page.getByRole("dialog");
await expect(dialog).toBeVisible();
await dialog.getByPlaceholder(/Subko, Blue Tokai/i).fill("Test Roastery");
await dialog.getByRole("button", { name: "Add" }).click();
await expect(dialog).not.toBeVisible();
```

**Slider component (Base UI)**:
- Renders `SliderPrimitive.Control` containing `SliderPrimitive.Thumb`
- The thumb renders as `role="slider"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Standard `fill()` works in Playwright >= 1.50 on range inputs

```typescript
// Set rating to 7.5 via slider thumb
const slider = page.getByRole("slider");
await slider.fill("7.5");
// If fill doesn't trigger React state, use evaluate:
await page.evaluate(() => {
  const input = document.querySelector('[role="slider"]') as HTMLInputElement;
  input.value = "7.5";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
});
```

**Toggle buttons (Roast Level / Brew Type)**:
- These are `<button type="button">` without explicit ARIA roles
- Target by text content:

```typescript
// Roast level selection
await page.getByRole("button", { name: "Medium" }).click();

// Brew type selection
await page.getByRole("button", { name: "Pour Over" }).click();
```

**Form inputs with label wrappers**:
- Labels use raw `<label>` elements but are styled `<label>` — `getByLabel()` works
- Alternatively use `getByPlaceholder()` since placeholders are descriptive

```typescript
// Preferred: label-based
await page.getByLabel(/Coffee Name/i).fill("Bili Hu");

// Alternative: placeholder-based
await page.getByPlaceholder(/Bili hu, Naivo/i).fill("Bili Hu");
```

**Header navigation**:
- Hamburger button has no aria-label — use `getByRole("button")` filtered by position or add `data-testid` to the header
- Logout button has no aria-label — same issue

```typescript
// Fragile fallback — prefer adding data-testid="hamburger-menu" to the component
await page.locator('[data-testid="hamburger-menu"]').click();
// Or use nth if position is predictable
await page.getByRole("banner").getByRole("button").first().click();
```

**Recommendation**: Add `data-testid` to the three icon-only buttons that lack aria-labels:
- Hamburger menu button → `data-testid="nav-menu"`
- Logout button → `data-testid="logout-button"`
- Edit entry link (pencil) → `data-testid="edit-entry"`
- Delete entry button (trash) → `data-testid="delete-entry"`

These are the only elements where `data-testid` is justified because they have no accessible name.

---

## 5. Recommended Test File Structure

```
e2e/
├── auth.setup.ts           # Auth state setup (runs before all tests)
├── fixtures.ts             # Extended test + DB seed fixtures
├── pages/                  # Page Object Models
│   ├── PasswordGatePage.ts
│   ├── FeedPage.ts
│   ├── EntryFormPage.ts
│   ├── EntryDetailPage.ts
│   ├── RoasteriesPage.ts
│   └── EstatesPage.ts
├── specs/                  # Test specs organized by feature
│   ├── auth.spec.ts        # Password gate + profile selection
│   ├── feed.spec.ts        # Feed display + filters
│   ├── entry-crud.spec.ts  # Create / Read / Edit / Delete entries
│   ├── roasteries.spec.ts  # Roastery CRUD
│   ├── estates.spec.ts     # Estate CRUD
│   └── ocr.spec.ts         # OCR photo upload (mocked)
└── helpers/
    ├── db.ts               # Direct DB helpers for seeding
    └── auth.ts             # Auth shortcuts
```

### Page Object Pattern

```typescript
// e2e/pages/EntryFormPage.ts
import { Page, Locator } from "@playwright/test";

export class EntryFormPage {
  readonly page: Page;
  readonly coffeeNameInput: Locator;
  readonly submitButton: Locator;
  readonly ratingSlider: Locator;

  constructor(page: Page) {
    this.page = page;
    this.coffeeNameInput = page.getByLabel(/Name/i).first();
    this.submitButton = page.getByRole("button", { name: /Save Entry|Update Entry/i });
    this.ratingSlider = page.getByRole("slider");
  }

  async goto() {
    await this.page.goto("/entry/new");
  }

  async selectRoast(level: "Light" | "Medium" | "Medium Dark" | "Dark") {
    await this.page.getByRole("button", { name: level }).click();
  }

  async selectBrew(type: string) {
    await this.page.getByRole("button", { name: type }).click();
  }

  async selectRoastery(name: string) {
    await this.page.getByRole("button", { name: /Select roastery/i }).click();
    await this.page.waitForSelector('[role="listbox"]');
    await this.page.getByRole("option", { name }).click();
  }

  async setRating(value: number) {
    await this.ratingSlider.fill(value.toString());
  }

  async submit() {
    await this.submitButton.click();
  }
}
```

---

## 6. Key Test Patterns

### Pattern: Full Entry Creation

```typescript
// e2e/specs/entry-crud.spec.ts
import { test, expect } from "../fixtures";
import { EntryFormPage } from "../pages/EntryFormPage";

test("creates a coffee entry with required fields only", async ({ page }) => {
  const form = new EntryFormPage(page);
  await form.goto();

  await page.getByPlaceholder(/Bili hu, Naivo/i).fill("Test Coffee");
  await form.submit();

  // Server action redirects to /entry/[id] on success
  await expect(page).toHaveURL(/\/entry\//);
  await expect(page.getByText("Test Coffee")).toBeVisible();
});

test("creates a full coffee entry", async ({ page }) => {
  const form = new EntryFormPage(page);
  await form.goto();

  await page.getByPlaceholder(/Bili hu, Naivo/i).fill("Naivo");
  await form.selectRoast("Medium");
  await form.selectBrew("Pour Over");
  await page.getByLabel(/Bean Weight/i).fill("15");
  await page.getByLabel(/Shot Weight/i).fill("30");
  await page.getByLabel(/Time/i).fill("210");
  await page.getByLabel(/Flavor Notes/i).fill("chocolate, caramel");
  await form.setRating(8.5);

  await form.submit();

  await expect(page).toHaveURL(/\/entry\//);
  await expect(page.getByText("Naivo")).toBeVisible();
  await expect(page.getByText("8.5")).toBeVisible();
});
```

### Pattern: Filter Bar Testing

```typescript
test("filters entries by roast level", async ({ page }) => {
  // Seed 2 entries: one medium, one dark
  // (handled by test.use({ seedData: {...} }))
  await page.goto("/feed");

  await expect(page.getByTestId("entry-card")).toHaveCount(2);

  await page.getByRole("button", { name: "Medium" }).click();
  await expect(page).toHaveURL(/roast=medium/);
  await expect(page.getByTestId("entry-card")).toHaveCount(1);

  await page.getByRole("button", { name: "All Roasts" }).click();
  await expect(page.getByTestId("entry-card")).toHaveCount(2);
});
```

### Pattern: Dialog Testing

```typescript
test("adds a roastery via dialog", async ({ page }) => {
  await page.goto("/roasteries");

  await page.getByRole("button", { name: "Add Roastery" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Add Roastery" })).toBeVisible();

  // Add button disabled until name is filled
  await expect(dialog.getByRole("button", { name: "Add" })).toBeDisabled();

  await dialog.getByPlaceholder(/Subko, Blue Tokai/i).fill("Third Wave");
  await expect(dialog.getByRole("button", { name: "Add" })).toBeEnabled();

  await dialog.getByRole("button", { name: "Add" }).click();

  // Dialog closes and new roastery appears in list
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("Third Wave")).toBeVisible();
});
```

### Pattern: Server Action via Form Submit

Next.js Server Actions are tested through the form UI — no direct invocation needed. Playwright observes the result (redirect, toast, DOM change).

```typescript
test("deletes an entry and redirects to feed", async ({ page }) => {
  // seedData provides an entry with known id
  await page.goto("/entry/e1");

  await page.getByTestId("delete-entry").click();

  // Server action runs, revalidatePath('/feed'), redirects
  await expect(page).toHaveURL("/feed");
  await expect(page.getByText("Test Entry")).not.toBeVisible();
});
```

### Pattern: Toast Assertion

```typescript
// Sonner toasts render in a fixed position container
await expect(page.getByText("Entry saved!")).toBeVisible();
// Toasts auto-dismiss — use a timeout if needed
await expect(page.getByText("Entry saved!")).toBeVisible({ timeout: 5000 });
```

### Pattern: Auth Gate Bypass (for protected pages)

Thanks to the `context` fixture injecting sessionStorage + the `storageState` providing localStorage + cookie, tests that import from `fixtures.ts` start pre-authenticated. But you can also explicitly bypass in individual tests:

```typescript
// Bypass both auth layers programmatically
await page.context().addInitScript(() => {
  window.sessionStorage.setItem("coffeebook-auth", "true");
  window.localStorage.setItem("coffeebook-profile", "vidit");
});
await page.context().addCookies([{
  name: "coffeebook-profile",
  value: "vidit",
  domain: "localhost",
  path: "/",
}]);
await page.goto("/feed");
```

### Pattern: Mobile Viewport Testing

The app is mobile-first (`max-w-lg`, FAB at bottom-right, `min-h-dvh`). Run critical paths on the mobile project:

```typescript
// Tests automatically run in both chromium and mobile projects
// Use test.skip to exclude from one:
test("FAB navigates to new entry", async ({ page, isMobile }) => {
  await page.goto("/feed");
  // FAB only shows when entries exist
  const fab = page.locator("a[href='/entry/new']").last(); // fixed bottom-right
  await expect(fab).toBeVisible();
  await fab.click();
  await expect(page).toHaveURL("/entry/new");
});
```

---

## 7. API Route Testing

### /api/ocr (POST)

The OCR route calls the Anthropic API. In E2E tests, intercept and mock it:

```typescript
// Mock the OCR API response
await page.route("/api/ocr", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      coffee_name: "Naivo",
      origin: "Ethiopia",
      roast_level: "medium",
      flavor_notes: "chocolate, blueberry",
      coffee_weight: 15,
    }),
  });
});

// Trigger OCR by uploading a file
await page.goto("/entry/new");
const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles({
  name: "label.jpg",
  mimeType: "image/jpeg",
  buffer: Buffer.from("fake image data"),
});

// Verify OCR auto-fill
await expect(page.getByPlaceholder(/Bili hu, Naivo/i)).toHaveValue("Naivo");
```

### /api/uploads (file serving)

This is a static file route, not testable at the API level. Verify it indirectly via entry detail page showing photos.

---

## 8. Framework-Specific Gotchas

### 1. Server Actions Are Not Interceptable by Playwright Network

Next.js Server Actions POST to the page URL (e.g., `POST /entry/new`) with a special `Next-Action` header. Playwright can intercept these but doing so breaks the action. **Do not mock Server Actions** — test them end-to-end through the UI.

### 2. RSC Streaming Requests

Next.js makes `GET /feed?_rsc=<hash>` calls for App Router streaming. These are internal; ignore them in tests. Do not assert on URLs containing `_rsc`.

### 3. Base UI Select Popup Is Portalled

The `SelectContent` renders inside `SelectPrimitive.Portal` which appends to `document.body`, not inside the form DOM. Do NOT scope your option search inside a form locator:

```typescript
// WRONG — listbox is not inside the form
await page.locator("form").getByRole("option", { name: "Subko" }).click();

// CORRECT — search entire page
await page.getByRole("option", { name: "Subko" }).click();
```

### 4. Base UI Dialog Popup Is Portalled

Same as Select — `DialogContent` renders at body level. `page.getByRole("dialog")` works correctly because it searches the full DOM.

### 5. React 19 + Server Actions — Wait for Pending State

`useTransition` wraps Server Action calls. The submit button shows a spinner while pending. Wait for the transition to complete:

```typescript
await page.getByRole("button", { name: /Save Entry/i }).click();
// Wait for pending state to clear (spinner disappears)
await expect(page.getByRole("button", { name: /Saving.../i })).not.toBeVisible();
// Or wait for the redirect
await page.waitForURL(/\/entry\//);
```

### 6. sessionStorage Is Not in storageState

This is the most important gotcha for this app. The password gate checks `sessionStorage.getItem('coffeebook-auth')`. If this is not set, the gate shows even if localStorage/cookie are present. The `addInitScript` workaround in `fixtures.ts` handles this.

### 7. `force-dynamic` on Feed Page

`/feed` has `export const dynamic = "force-dynamic"`. This means no caching — every test gets fresh server-rendered data. This is good for test isolation.

### 8. Bun Runtime — Use Bun Commands

The project uses Bun, not Node. When writing shell commands for CI or scripts, use `bun run start` not `npm run start`. The webServer config in `playwright.config.ts` must use `bun`.

### 9. No Playwright — Install It First

The project has no Playwright dependency yet. Installation:

```bash
bun add -d @playwright/test
bunx playwright install chromium
```

### 10. DB Migration for Test DB

Before tests run, the test database file needs migrations applied. Add to `playwright.config.ts` global setup or run explicitly:

```bash
TURSO_DATABASE_URL=file:./data/test.db bun run db:migrate
```

---

## 9. Test Organization Recommendation

### Group by Feature, Not by Page

Since each feature maps 1:1 to a page in this app, feature-based grouping is equivalent. Organize as:

```
e2e/specs/
├── auth.spec.ts           # Password gate, profile selection, logout
├── feed.spec.ts           # Entry list, filter by profile, filter by roast
├── entry-crud.spec.ts     # Create, read, edit, delete entries
├── roasteries.spec.ts     # CRUD + dialog interactions
├── estates.spec.ts        # CRUD + dialog interactions
└── ocr.spec.ts            # File upload + API mock + field auto-fill
```

### Test Coverage Priorities

1. **Critical path** (auth + entry create): Cover first, most likely to catch regressions.
2. **Entry CRUD**: Core value of the app.
3. **Filter bar**: URL-param-driven — straightforward to test.
4. **Master data (Roasteries/Estates)**: Dialog patterns repeat.
5. **OCR**: Requires mocking; lower priority for initial suite.

---

## 10. Documentation References

- [Next.js Playwright Testing Guide](https://nextjs.org/docs/app/guides/testing/playwright)
- [Playwright Auth Documentation](https://playwright.dev/docs/auth)
- [Playwright Locators](https://playwright.dev/docs/locators)
- [Drizzle-seed + Playwright Fixtures (Mainmatter)](https://mainmatter.com/blog/2025/08/21/mock-database-in-svelte-tests/)
- [vercel/next.js with-playwright example config](https://github.com/vercel/next.js/blob/canary/examples/with-playwright/playwright.config.ts)
- [BrowserStack: Playwright storageState](https://www.browserstack.com/guide/playwright-storage-state)
- [Next.js Server Actions + Playwright Discussion](https://github.com/vercel/next.js/discussions/67136)
- [BrowserStack: Playwright Selector Best Practices](https://www.browserstack.com/guide/playwright-selectors-best-practices)
- [Playwright Session Storage (TO THE NEW Blog)](https://www.tothenew.com/blog/how-session-storage-work-in-playwright/)
- [Input Range Slider in Playwright (GitHub Issue #4231)](https://github.com/microsoft/playwright/issues/4231)
