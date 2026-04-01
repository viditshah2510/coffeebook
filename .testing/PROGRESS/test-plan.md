# Test Plan -- Coffeebook

**Date**: 2026-03-29
**App**: Coffeebook -- Coffee tasting notes webapp
**Stack**: Next.js 16.2.1 (App Router), SQLite/libsql, Drizzle ORM, React 19, Base UI (shadcn/ui), Bun
**Authors**: QA Storm Team (Scout, Oracle, Architect)

---

## Executive Summary

Coffeebook is a small, self-hosted coffee tasting notes app for 3 users (Karan, Vidit, Amar). It has 7 routes, 2 API endpoints, 9 server actions, and 5 database tables. The app has zero existing automated tests.

This plan defines **68 test cases** organized across 10 feature areas, prioritized by risk. All tests are E2E (Playwright) because the app uses Next.js Server Actions exclusively -- there are no REST API endpoints to test independently (mutations go through form submissions, reads go through server-rendered pages). The two API routes (`/api/ocr`, `/api/uploads/[filename]`) are tested via E2E interactions.

### Test Counts by Priority
| Priority | Count | Description |
|----------|-------|-------------|
| P0 (Critical) | 22 | Auth, core CRUD, data integrity -- must pass |
| P1 (Important) | 30 | Validation, filters, master data, error handling |
| P2 (Nice-to-have) | 16 | Edge cases, UX polish, navigation details |
| **Total** | **68** | |

### Test Counts by Feature Area
| Feature Area | Count | Spec File |
|--------------|-------|-----------|
| Auth & Profile | 8 | `auth.spec.ts` |
| Entry Creation | 10 | `entry-create.spec.ts` |
| Entry Detail | 5 | `entry-detail.spec.ts` |
| Entry Edit | 7 | `entry-edit.spec.ts` |
| Entry Delete | 4 | `entry-delete.spec.ts` |
| Feed & Filters | 12 | `feed.spec.ts` |
| Roastery CRUD | 8 | `roastery.spec.ts` |
| Estate CRUD | 8 | `estate.spec.ts` |
| OCR & Photo Upload | 4 | `ocr.spec.ts` |
| Navigation | 2 | `navigation.spec.ts` |

---

## Coverage Gaps Found

### 1. Routes in Code Not Discovered by Scout
- **`/api/uploads/[filename]`** -- File serving route exists at `src/app/api/uploads/[filename]/route.ts` but Scout got a 404 on `POST /api/uploads`. This is because the route only handles GET, and the path requires a filename parameter. Covered indirectly through photo display on entry detail pages.

### 2. Server Actions With No Direct API Surface
All 9 server actions (3 entry, 3 roastery, 3 estate) are invoked through Next.js Server Action mechanism (`POST` to page URL with `Next-Action` header). They cannot be tested as standalone API calls -- they must be tested E2E through the UI.

### 3. Orphaned Code
- **`deletePhoto` server action** (`src/server/actions/photo-actions.ts`) is defined but never called anywhere in the codebase. No test needed, but worth flagging for cleanup.
- **`search` filter** exists in `getEntries()` query (LIKE on coffeeName, origin, flavorNotes, notes) but there is no search input in the FilterBar UI. The filter is unreachable by users.

### 4. Data Integrity Risks (No Server-Side Auth)
- Server actions accept any `profileId` -- there is no validation that the caller is the profile owner. Any logged-in user can create entries as another user or edit/delete other users' entries.
- No ownership check on edit/delete -- any profile can modify any entry.
- Roastery/estate deletion has no "in-use" check and no confirmation dialog.
- `createEntry` does not use a transaction -- entry insert and photo inserts are separate queries.
- Photo files on disk are never cleaned up when entries are deleted or photos are removed during edit.

### 5. Known Bugs Worth Verifying
- A rating of exactly `0.0` is hidden in the UI (condition: `entry.rating != null && entry.rating > 0`).
- `POST /api/uploads` returns 404 -- photos are uploaded via `uploadPhoto` server action, not an API route.

---

## Test Infrastructure

### playwright.config.ts (Recommended)
```
workers: 1         (SQLite single-file constraint)
fullyParallel: false
retries: 0 local, 2 CI
baseURL: http://localhost:3456
webServer: bun run start
projects: [setup, chromium, mobile (Pixel 7)]
```

### Auth Strategy
1. `auth.setup.ts` performs real login (password + profile selection), saves `storageState` (localStorage + cookies)
2. `fixtures.ts` extends base test to inject `sessionStorage` via `addInitScript` (Playwright does not persist sessionStorage in storageState)
3. All spec files import `{ test, expect }` from `fixtures.ts`

### Database Strategy
- Separate test DB: `TURSO_DATABASE_URL=file:./data/test.db`
- Seed profiles (always) + test-specific data per test via fixtures
- Teardown after each test: delete entries, photos, roasteries, estates (keep profiles)

### Selector Priority
1. `getByRole()` -- buttons, links, headings, inputs, dialogs, sliders
2. `getByLabel()` -- form inputs with visible labels
3. `getByPlaceholder()` -- inputs where label is styled (not `<label for>`)
4. `getByText()` -- pill buttons, content assertions
5. `data-testid` -- only for 4 icon-only buttons without accessible names (hamburger menu, logout, edit entry, delete entry)

### Required `data-testid` Additions
These 4 elements lack accessible names and need `data-testid` added to the source code:
| Element | Component | Recommended `data-testid` |
|---------|-----------|--------------------------|
| Hamburger menu button | `header-bar.tsx` | `nav-menu` |
| Logout button | `header-bar.tsx` | `logout-button` |
| Edit entry link | `entry/[id]/page.tsx` | `edit-entry` |
| Delete entry button | `delete-entry-button.tsx` | `delete-entry` |

---

## File Structure

```
e2e/
  auth.setup.ts              -- Auth state setup (runs first, saves storageState)
  fixtures.ts                -- Extended test fixture with sessionStorage injection + DB seed/teardown
  helpers/
    db.ts                    -- Direct DB helpers (seed roasteries, estates, entries)
    selectors.ts             -- Reusable selector constants
  auth.spec.ts               -- AUTH-001 through AUTH-008
  entry-create.spec.ts       -- CREATE-001 through CREATE-010
  entry-detail.spec.ts       -- DETAIL-001 through DETAIL-005
  entry-edit.spec.ts         -- EDIT-001 through EDIT-007
  entry-delete.spec.ts       -- DELETE-001 through DELETE-004
  feed.spec.ts               -- FEED-001 through FEED-012
  roastery.spec.ts           -- ROAST-001 through ROAST-008
  estate.spec.ts             -- ESTATE-001 through ESTATE-008
  ocr.spec.ts                -- OCR-001 through OCR-004
  navigation.spec.ts         -- NAV-001 through NAV-002
playwright/
  .auth/                     -- Saved auth state (gitignored)
    user.json
    session.json
```

---

## Test Cases

---

### 1. Auth & Profile (`auth.spec.ts`)

---

#### AUTH-001: Password gate blocks access with wrong password
**Priority**: P0
**Type**: E2E
**Prerequisites**: Fresh browser context (no auth state)
**Steps**:
1. Navigate to `/` (no storageState -- use `{ storageState: undefined }`)
2. Verify password input is visible (`getByPlaceholder("Enter password")`)
3. Fill password with "wrongpassword"
4. Click "Enter" button
5. Verify "Wrong password" error text appears
6. Verify profile selector is NOT visible

**Expected**: Error message shown. User remains on password gate. No profile buttons visible.

---

#### AUTH-002: Password gate accepts correct password and shows profile selector
**Priority**: P0
**Type**: E2E
**Prerequisites**: Fresh browser context (no auth state)
**Steps**:
1. Navigate to `/` (no storageState)
2. Fill password with "scale@123"
3. Click "Enter" button
4. Verify 3 profile buttons appear: "Karan", "Vidit", "Amar"
5. Verify password input is no longer visible

**Expected**: Password gate dismissed. Three profile buttons visible with names and initials.

---

#### AUTH-003: Profile selection sets storage and redirects to feed
**Priority**: P0
**Type**: E2E
**Prerequisites**: Password gate already passed (sessionStorage set)
**Steps**:
1. Navigate to `/` with sessionStorage `coffeebook-auth=true` (but no profile)
2. Click the "Vidit" profile button
3. Wait for redirect to `/feed`
4. Verify `localStorage` has `coffeebook-profile=vidit` (via `page.evaluate`)
5. Verify cookie `coffeebook-profile=vidit` exists
6. Verify header shows "Vidit" and "V" avatar

**Expected**: Profile stored in localStorage and cookie. Redirect to feed. Header shows selected profile.

---

#### AUTH-004: Profile persists across page refreshes
**Priority**: P0
**Type**: E2E
**Prerequisites**: Authenticated as Vidit
**Steps**:
1. Navigate to `/feed`
2. Verify header shows "Vidit"
3. Reload the page (`page.reload()`)
4. Wait for page load
5. Verify header still shows "Vidit"
6. Verify user is NOT redirected to password gate

**Expected**: Profile persists via localStorage. Session persists via sessionStorage (within same tab).

---

#### AUTH-005: Logout clears state and redirects to home
**Priority**: P0
**Type**: E2E
**Prerequisites**: Authenticated as Vidit
**Steps**:
1. Navigate to `/feed`
2. Verify header shows "Vidit"
3. Click the logout button (`[data-testid="logout-button"]`)
4. Verify redirect to `/`
5. Verify password gate is shown (password input visible)
6. Verify `localStorage` no longer has `coffeebook-profile` (via `page.evaluate`)

**Expected**: All auth state cleared. User returns to password gate on home page.

---

#### AUTH-006: Protected routes redirect to home when not authenticated
**Priority**: P1
**Type**: E2E
**Prerequisites**: Fresh browser context (no auth state)
**Steps**:
1. Navigate directly to `/feed` (no storageState)
2. Verify the page shows the password gate (since `/` is the home page and other pages require profile to be useful, but note: the app has no server-side auth, so the page may render but the header/content will be empty or show profile selector)

**Expected**: User sees password gate or is prompted to authenticate. The app should not crash.

**Note**: Since there is no server-side auth middleware, the page may render server-side content but the client-side components (HeaderBar, FilterBar) depend on profile from localStorage. This test verifies the client-side auth guard behavior.

---

#### AUTH-007: Selecting different profiles switches context
**Priority**: P1
**Type**: E2E
**Prerequisites**: Authenticated as Vidit
**Steps**:
1. Navigate to `/feed` as Vidit
2. Verify header shows "Vidit"
3. Click logout
4. Go through password gate again
5. Select "Karan" profile
6. Verify header shows "Karan" with "K" initial
7. Verify profile filter shows "Karan" highlighted (if entries exist for Karan)

**Expected**: Profile switch works correctly. Header updates to new profile.

---

#### AUTH-008: Password field clears after failed attempt
**Priority**: P2
**Type**: E2E
**Prerequisites**: Fresh browser context
**Steps**:
1. Navigate to `/`
2. Fill password with "wrong"
3. Click "Enter"
4. Verify error message appears
5. Verify password input is cleared or still contains the wrong value (document current behavior)

**Expected**: Error message visible. User can retry.

---

### 2. Entry Creation (`entry-create.spec.ts`)

**Seed Data**: Profiles seeded. Roastery "Subko" (id: `r-subko`). Estate "Moolay Estate" (id: `e-moolay`, location: "Coorg, Karnataka", country: "India", masl: 1200).

---

#### CREATE-001: Create entry with only required field (coffee name)
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Fill "Name" input with "Minimal Test Coffee" (`getByPlaceholder(/Bili hu, Naivo/i)`)
3. Click "Save Entry" button
4. Wait for redirect to `/entry/[uuid]`
5. Verify "Minimal Test Coffee" appears on the detail page
6. Verify no crash on optional fields being empty

**Expected**: Entry created with only coffee name. Redirect to entry detail page. All optional fields are blank/absent in the detail view.

---

#### CREATE-002: Create entry with all fields populated
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Fill "Name": "Full Test Espresso"
3. Select roastery "Subko" from dropdown (click trigger, wait for listbox, click option)
4. Select estate "Moolay Estate" from dropdown
5. Click "Medium Dark" roast level button
6. Click "Espresso" brew type button
7. Fill "Bean Weight": "18"
8. Fill "Shot Weight": "36"
9. Fill "Time": "28"
10. Fill "Grind Size": "4.5"
11. Fill "Grinder": "Niche Zero"
12. Fill "Flavor Notes": "chocolate, caramel, hazelnut"
13. Fill "Taste Notes": "Rich body with sweet finish"
14. Set rating slider to 8.5 (`getByRole("slider").fill("8.5")`)
15. Fill "Notes": "Best extraction at 28 seconds"
16. Click "Save Entry"
17. Wait for redirect to `/entry/[uuid]`
18. Verify all fields appear on detail page: coffee name, roastery, estate, roast level, brew type, bean weight, shot weight, brew time, grind size, flavor notes, taste notes, rating (8.5/10), notes

**Expected**: Entry created with all fields populated. All data persisted and displayed correctly on detail page.
**Test Data**: coffeeName="Full Test Espresso", roast=medium-dark, brew=espresso, beanWeight=18, shotWeight=36, brewTime=28, grindSize="4.5", grinder="Niche Zero", flavorNotes="chocolate, caramel, hazelnut", tasteNotes="Rich body with sweet finish", rating=8.5, notes="Best extraction at 28 seconds"

---

#### CREATE-003: Create entry appears in feed
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Fill "Name": "Feed Test Coffee"
3. Click "Save Entry"
4. Wait for redirect to entry detail
5. Navigate to `/feed`
6. Verify "Feed Test Coffee" appears in the feed

**Expected**: Newly created entry is visible in the feed page (revalidatePath("/feed") works).

---

#### CREATE-004: Coffee name is required -- form does not submit without it
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Do NOT fill the coffee name
3. Select "Light" roast (to confirm other fields are set)
4. Click "Save Entry"
5. Verify the form does NOT submit (HTML `required` attribute on input prevents submission)
6. Verify user stays on `/entry/new`

**Expected**: Browser-native validation prevents form submission. No server action is called.

---

#### CREATE-005: Roast level toggle behavior -- select and deselect
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Click "Light" roast button
3. Verify "Light" button has active styling (ring class)
4. Click "Medium" roast button
5. Verify "Medium" is active, "Light" is not (mutually exclusive)
6. Click "Medium" again
7. Verify "Medium" is deselected (toggle off)
8. Fill name "Toggle Test" and submit
9. Verify entry has no roast level on detail page

**Expected**: Roast level buttons toggle on/off. Only one active at a time. Clicking active roast deselects it.

---

#### CREATE-006: Brew type toggle behavior -- select and deselect
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Click "Pour Over" brew type button
3. Verify "Pour Over" has active styling
4. Click "AeroPress" brew type button
5. Verify "AeroPress" is active, "Pour Over" is not
6. Click "AeroPress" again to deselect

**Expected**: Brew type buttons toggle on/off. Only one active at a time.

---

#### CREATE-007: Rating slider sets value and displays it
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Verify no rating display initially (or "0.0/10" is hidden per code)
3. Set slider to 7.5
4. Verify "7.5/10" text appears near the slider
5. Click "Clear" button
6. Verify rating display disappears (rating reset to 0)

**Expected**: Slider value is displayed alongside the slider. Clear button resets to 0.

---

#### CREATE-008: Add roastery inline from entry form
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Click the "+" button next to the Roastery dropdown (`button[title="Add new roastery"]`)
3. Verify "Add Roastery" dialog appears (`getByRole("dialog")`)
4. Verify "Add" button is disabled (name empty)
5. Fill roastery name: "Blue Tokai"
6. Verify "Add" button is enabled
7. Click "Add"
8. Verify dialog closes
9. Verify "Roastery added" toast appears
10. Verify roastery dropdown now shows "Blue Tokai" selected
11. Fill coffee name "Inline Roastery Test" and submit
12. Verify entry detail shows "Blue Tokai" as roastery
13. Navigate to `/roasteries`
14. Verify "Blue Tokai" appears in the roastery list

**Expected**: Inline roastery creation works. New roastery auto-selected in dropdown. Persists to DB.

---

#### CREATE-009: Add estate inline from entry form
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Click the "+" button next to the Estate dropdown (`button[title="Add new estate"]`)
3. Verify "Add Estate" dialog appears
4. Fill estate name: "Kerehaklu"
5. Fill location: "Chikmagalur, Karnataka"
6. Fill country: "India"
7. Fill altitude: "1100"
8. Click "Add"
9. Verify dialog closes and estate is auto-selected
10. Fill coffee name "Inline Estate Test" and submit
11. Verify entry detail shows "Kerehaklu"

**Expected**: Inline estate creation with all fields works. Estate auto-selected and persisted.

---

#### CREATE-010: Numeric fields accept only valid numbers
**Priority**: P2
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Fill "Name": "Numeric Test"
3. Fill "Bean Weight" with "abc" -- verify input rejects (type=number)
4. Fill "Bean Weight" with "-5" -- note: Zod schema requires `.positive()`, but HTML input type=number allows negative. Verify behavior.
5. Fill "Bean Weight" with "18.5"
6. Fill "Shot Weight" with "36"
7. Fill "Time" with "25"
8. Submit the form
9. Verify entry is created with correct numeric values

**Expected**: Number inputs accept valid numbers. Behavior for negative numbers documents current state (HTML may allow, Zod may reject).

---

### 3. Entry Detail (`entry-detail.spec.ts`)

**Seed Data**: One entry with all fields populated:
```
id: "e-detail-test"
profileId: "vidit"
coffeeName: "Detail Test Blend"
roasteryId: "r-subko" (Subko)
estateId: "e-moolay" (Moolay Estate)
roastLevel: "medium-dark"
brewType: "espresso"
coffeeWeight: 18
shotWeight: 36
brewTime: 28
grindSize: "4.5"
grinderType: "Niche Zero"
flavorNotes: "chocolate, caramel"
rating: 8.5
tasteNotes: "Rich and sweet"
notes: "Pull at 9 bar"
```

---

#### DETAIL-001: Entry detail page displays all fields correctly
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/entry/e-detail-test`
2. Verify coffee name "Detail Test Blend" is visible as heading
3. Verify rating "8.5/10" badge is visible
4. Verify roast level pill shows "Medium Dark"
5. Verify brew type pill shows "Espresso"
6. Verify stats grid shows: Bean Weight 18g, Shot Weight 36g, Brew Time 28s, Grind Size 4.5
7. Verify flavor notes pills show "chocolate" and "caramel"
8. Verify "Rich and sweet" appears in taste notes section
9. Verify "Pull at 9 bar" appears in notes section
10. Verify profile avatar shows "V" (Vidit)

**Expected**: All entry fields render correctly on detail page.

---

#### DETAIL-002: Entry detail page shows edit and delete buttons
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/entry/e-detail-test`
2. Verify edit link exists (`[data-testid="edit-entry"]` or `a[href="/entry/e-detail-test/edit"]`)
3. Verify delete button exists (`[data-testid="delete-entry"]`)
4. Click edit link
5. Verify redirect to `/entry/e-detail-test/edit`

**Expected**: Edit and delete action buttons are visible and functional on entry detail page.

---

#### DETAIL-003: Entry detail page shows "Back to Feed" link
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/e-detail-test`
2. Verify a link with text "Feed" (or containing "Feed") exists pointing to `/feed`
3. Click the link
4. Verify redirect to `/feed`

**Expected**: Back navigation link works.

---

#### DETAIL-004: Non-existent entry returns 404
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/non-existent-uuid-12345`
2. Verify the page shows a 404 or "not found" state (Next.js `notFound()` call)

**Expected**: 404 page rendered. No crash.

---

#### DETAIL-005: Entry with no optional fields displays without errors
**Priority**: P2
**Type**: E2E
**Seed Data**: Entry with only `id`, `profileId`, `coffeeName` set. All other fields null/empty.
**Steps**:
1. Navigate to `/entry/e-minimal`
2. Verify coffee name is shown
3. Verify page does not crash
4. Verify no rating badge shown (rating is null)
5. Verify no roast/brew pills shown
6. Verify stats grid is absent or shows "---" for empty values

**Expected**: Minimal entry renders without errors. Empty optional fields are gracefully handled.

---

### 4. Entry Edit (`entry-edit.spec.ts`)

**Seed Data**: Same as DETAIL test entry (`e-detail-test`).

---

#### EDIT-001: Edit form pre-populates with existing values
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/entry/e-detail-test/edit`
2. Verify "Edit Entry" heading is visible
3. Verify "Name" input has value "Detail Test Blend"
4. Verify roastery dropdown shows "Subko"
5. Verify estate dropdown shows "Moolay Estate"
6. Verify "Medium Dark" roast button has active styling
7. Verify "Espresso" brew type button has active styling
8. Verify "Bean Weight" has value "18"
9. Verify "Shot Weight" has value "36"
10. Verify "Time" has value "28"
11. Verify "Grind Size" has value "4.5"
12. Verify "Grinder" has value "Niche Zero"
13. Verify "Flavor Notes" has value "chocolate, caramel"
14. Verify rating shows "8.5/10"
15. Verify "Taste Notes" has value "Rich and sweet"
16. Verify "Notes" has value "Pull at 9 bar"
17. Verify submit button says "Update Entry" (not "Save Entry")

**Expected**: All fields pre-populated with existing entry values.

---

#### EDIT-002: Update entry changes data and redirects to feed
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/entry/e-detail-test/edit`
2. Clear and refill "Name" with "Updated Blend"
3. Click "Light" roast (changing from Medium Dark)
4. Set rating to 9.0
5. Click "Update Entry"
6. Wait for redirect to `/feed`
7. Verify "Updated Blend" appears in feed
8. Click on "Updated Blend" entry card
9. Verify detail page shows: "Updated Blend", "Light" roast, rating "9.0/10"
10. Verify other unchanged fields are still correct (Shot Weight 36, etc.)

**Expected**: Entry updated successfully. Changed fields reflect new values. Unchanged fields are preserved.

---

#### EDIT-003: Edit non-existent entry returns 404
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/fake-id-xyz/edit`
2. Verify 404 or "not found" page

**Expected**: 404 page. No crash.

---

#### EDIT-004: Edit preserves roastery and estate selections
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/e-detail-test/edit`
2. Verify roastery shows "Subko"
3. Verify estate shows "Moolay Estate"
4. Change only the coffee name to "Roastery Preserved Test"
5. Click "Update Entry"
6. Navigate to the updated entry detail
7. Verify roastery still shows "Subko"
8. Verify estate still shows "Moolay Estate"

**Expected**: Unchanged dropdown selections are preserved on update.

---

#### EDIT-005: Edit can clear optional fields
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/e-detail-test/edit`
2. Clear "Flavor Notes" (set to empty)
3. Clear "Taste Notes"
4. Click the rating "Clear" button to reset rating
5. Click "Update Entry"
6. Navigate to updated entry detail
7. Verify flavor notes section is empty/hidden
8. Verify taste notes section is empty/hidden
9. Verify no rating badge is shown

**Expected**: Optional fields can be cleared during edit.

---

#### EDIT-006: Edit can change roast level to a different value
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/e-detail-test/edit`
2. Verify "Medium Dark" is active
3. Click "Dark"
4. Verify "Dark" is now active, "Medium Dark" is not
5. Click "Update Entry"
6. Navigate to updated entry detail
7. Verify "Dark" roast pill is shown

**Expected**: Roast level can be changed during edit.

---

#### EDIT-007: Edit can change brew type
**Priority**: P2
**Type**: E2E
**Steps**:
1. Navigate to `/entry/e-detail-test/edit`
2. Verify "Espresso" is active
3. Click "Pour Over"
4. Click "Update Entry"
5. Navigate to updated entry
6. Verify "Pour Over" brew type pill

**Expected**: Brew type changeable during edit.

---

### 5. Entry Delete (`entry-delete.spec.ts`)

**Seed Data**: Entry `e-delete-test` (coffeeName: "Delete Me Coffee", profileId: "vidit").

---

#### DELETE-001: Delete entry with confirmation dialog
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/entry/e-delete-test`
2. Verify "Delete Me Coffee" is visible
3. Set up dialog handler to accept: `page.on("dialog", d => d.accept())`
4. Click the delete button (`[data-testid="delete-entry"]`)
5. Verify `window.confirm` dialog fires (the handler accepts it)
6. Wait for redirect to `/feed`
7. Verify "Delete Me Coffee" does NOT appear in feed
8. Verify toast "Entry deleted" appears

**Expected**: Confirmation dialog shown. On accept, entry deleted. Redirect to feed. Entry no longer in feed.

---

#### DELETE-002: Cancel delete keeps entry
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/entry/e-delete-test`
2. Set up dialog handler to dismiss: `page.on("dialog", d => d.dismiss())`
3. Click the delete button
4. Verify user stays on `/entry/e-delete-test`
5. Verify "Delete Me Coffee" is still visible

**Expected**: Canceling the confirmation dialog does not delete the entry. User stays on detail page.

---

#### DELETE-003: Deleted entry is no longer accessible by direct URL
**Priority**: P1
**Type**: E2E
**Steps**:
1. Create entry via form, note its ID from the redirect URL
2. Navigate to entry detail, confirm it exists
3. Delete the entry (accept dialog)
4. Wait for redirect to feed
5. Navigate directly to the deleted entry's URL
6. Verify 404 or "not found" page

**Expected**: Deleted entry returns 404 on direct access.

---

#### DELETE-004: Delete button is disabled during pending state
**Priority**: P2
**Type**: E2E
**Steps**:
1. Navigate to `/entry/e-delete-test`
2. Set up dialog handler to accept
3. Click delete button
4. Quickly check if the button becomes disabled (has `disabled` attribute or `opacity-50` class)

**Expected**: Button disabled while the server action is processing (useTransition pending state).

---

### 6. Feed & Filters (`feed.spec.ts`)

**Seed Data**:
```
Roasteries: Subko (r-subko), Blue Tokai (r-bt)
Estates: Moolay (e-moolay), Kerehaklu (e-krh)
Entries:
  - e1: profileId=vidit, coffeeName="Vidit Light", roastLevel=light, roasteryId=r-subko, estateId=e-moolay
  - e2: profileId=vidit, coffeeName="Vidit Dark", roastLevel=dark, roasteryId=r-bt, estateId=e-krh
  - e3: profileId=karan, coffeeName="Karan Medium", roastLevel=medium, roasteryId=r-subko
  - e4: profileId=amar, coffeeName="Amar Espresso", roastLevel=medium-dark, brewType=espresso
```

---

#### FEED-001: Feed page displays all entries
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/feed`
2. Verify all 4 entries are visible: "Vidit Light", "Vidit Dark", "Karan Medium", "Amar Espresso"
3. Verify entries are ordered newest first (by created_at DESC)

**Expected**: All entries displayed in reverse chronological order.

---

#### FEED-002: Entry cards are clickable links to detail page
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/feed`
2. Click on the "Vidit Light" entry card
3. Verify redirect to `/entry/e1`
4. Verify "Vidit Light" detail page loads

**Expected**: Entry card links work correctly.

---

#### FEED-003: Profile filter -- show only one profile's entries
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/feed`
2. Click "Karan" profile filter button
3. Verify URL changes to `/feed?profile=karan`
4. Verify only "Karan Medium" is visible
5. Verify "Vidit Light", "Vidit Dark", "Amar Espresso" are NOT visible

**Expected**: Profile filter correctly isolates one profile's entries.

---

#### FEED-004: Profile filter -- "All" shows all entries
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/feed?profile=karan`
2. Verify only Karan's entries are shown
3. Click "All" profile button
4. Verify URL changes to `/feed` (no profile param)
5. Verify all 4 entries are visible again

**Expected**: "All" profile filter clears the profile param and shows all entries.

---

#### FEED-005: Profile filter -- toggle off clears filter
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/feed`
2. Click "Vidit" filter button
3. Verify URL has `?profile=vidit`
4. Click "Vidit" again (toggle off)
5. Verify URL no longer has `profile` param
6. Verify all entries visible

**Expected**: Clicking an active profile filter toggles it off.

---

#### FEED-006: Roast filter -- show only matching roast level
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/feed`
2. Click "Light" roast filter button
3. Verify URL has `?roast=light`
4. Verify only "Vidit Light" is shown
5. Verify other entries are hidden

**Expected**: Roast filter correctly filters by roast level.

---

#### FEED-007: Roast filter -- "All Roasts" clears filter
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/feed?roast=dark`
2. Click "All Roasts" button
3. Verify `roast` param removed from URL
4. Verify all entries visible

**Expected**: "All Roasts" clears the roast filter.

---

#### FEED-008: Combined filters -- profile + roast
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/feed`
2. Click "Vidit" profile filter
3. Verify 2 entries shown (Vidit Light, Vidit Dark)
4. Click "Light" roast filter
5. Verify URL has `?profile=vidit&roast=light`
6. Verify only "Vidit Light" is shown

**Expected**: Multiple filters combine with AND logic.

---

#### FEED-009: Roastery filter -- show only entries from one roastery
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/feed`
2. Verify roastery filter row is visible (roasteries exist in seed)
3. Click "Subko" roastery filter button
4. Verify URL has `?roastery=r-subko`
5. Verify only entries with Subko roastery are shown ("Vidit Light", "Karan Medium")

**Expected**: Roastery filter works correctly.

---

#### FEED-010: Estate filter -- show only entries from one estate
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/feed`
2. Verify estate filter row is visible (estates exist in seed)
3. Click "Moolay" estate filter button (the button shows the estate name)
4. Verify URL has `?estate=e-moolay`
5. Verify only entries with Moolay estate are shown

**Expected**: Estate filter works correctly.

---

#### FEED-011: Empty state -- no entries message
**Priority**: P1
**Type**: E2E
**Seed Data**: No entries (only profiles seeded)
**Steps**:
1. Navigate to `/feed`
2. Verify "No entries yet" or similar empty state message appears
3. Verify FAB (floating action button) may or may not be visible

**Expected**: Empty feed shows appropriate empty state message.

---

#### FEED-012: FAB navigates to new entry page
**Priority**: P2
**Type**: E2E
**Steps**:
1. Navigate to `/feed` (with seed entries)
2. Verify FAB button exists (`a[href="/entry/new"]`)
3. Click the FAB
4. Verify redirect to `/entry/new`

**Expected**: FAB links to entry creation page.

---

### 7. Roastery CRUD (`roastery.spec.ts`)

---

#### ROAST-001: Add roastery via dialog
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/roasteries`
2. Click "Add Roastery" button
3. Verify dialog appears with title "Add Roastery"
4. Verify "Add" button is disabled (empty name)
5. Fill name: "Third Wave"
6. Verify "Add" button becomes enabled
7. Click "Add"
8. Verify dialog closes
9. Verify "Third Wave" appears in the roastery list

**Expected**: Roastery created via dialog. List updates immediately.

---

#### ROAST-002: Edit roastery name
**Priority**: P0
**Type**: E2E
**Seed Data**: Roastery "Subko" exists
**Steps**:
1. Navigate to `/roasteries`
2. Verify "Subko" is in the list
3. Click the edit (pencil) button next to "Subko"
4. Verify edit dialog appears with name pre-filled as "Subko"
5. Clear and refill with "Subko Coffee"
6. Click save/update button in dialog
7. Verify dialog closes
8. Verify "Subko Coffee" appears in the list (not "Subko")

**Expected**: Roastery renamed successfully. List updates.

---

#### ROAST-003: Delete roastery (not in use)
**Priority**: P0
**Type**: E2E
**Seed Data**: Roastery "Disposable Roastery" (not referenced by any entry)
**Steps**:
1. Navigate to `/roasteries`
2. Verify "Disposable Roastery" is in the list
3. Click the delete (trash) button next to "Disposable Roastery"
4. Verify "Disposable Roastery" is removed from the list
5. Reload page to confirm persistence
6. Verify "Disposable Roastery" still gone

**Expected**: Roastery deleted immediately (no confirmation dialog per the code). List updates.

**Note**: The roastery delete has NO confirmation dialog (unlike entry delete which uses `window.confirm`). This is a UX gap worth documenting.

---

#### ROAST-004: Empty state shows "No roasteries yet" message
**Priority**: P1
**Type**: E2E
**Seed Data**: No roasteries
**Steps**:
1. Navigate to `/roasteries`
2. Verify "No roasteries yet. Add one to get started." text is visible
3. Verify "Add Roastery" button is visible

**Expected**: Empty state message shown when no roasteries exist.

---

#### ROAST-005: Cannot add roastery with empty name
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/roasteries`
2. Click "Add Roastery"
3. Leave name empty
4. Verify "Add" button is disabled
5. Type spaces only: "   "
6. Verify "Add" button remains disabled (`.trim()` check in handler)

**Expected**: Empty/whitespace-only name cannot be submitted.

---

#### ROAST-006: Add roastery dialog can be closed without saving
**Priority**: P2
**Type**: E2E
**Steps**:
1. Navigate to `/roasteries`
2. Click "Add Roastery"
3. Fill name "Temp Roastery"
4. Click "Close" button (not "Add")
5. Verify dialog closes
6. Verify "Temp Roastery" does NOT appear in the list

**Expected**: Closing dialog without clicking "Add" discards the input.

---

#### ROAST-007: Roastery list sorted alphabetically
**Priority**: P2
**Type**: E2E
**Seed Data**: Roasteries "Subko", "Blue Tokai", "Third Wave"
**Steps**:
1. Navigate to `/roasteries`
2. Verify order is: "Blue Tokai", "Subko", "Third Wave" (alphabetical ASC)

**Expected**: Roasteries listed in alphabetical order (query uses `ORDER BY name ASC`).

---

#### ROAST-008: Delete roastery that is in use by an entry
**Priority**: P1
**Type**: E2E
**Seed Data**: Roastery "Subko" (r-subko) with an entry referencing it
**Steps**:
1. Navigate to `/roasteries`
2. Click delete on "Subko"
3. Observe behavior: Does it succeed? Does it fail? Does the entry become orphaned?

**Expected**: Document actual behavior. Since SQLite FK enforcement may be off by default, deletion may succeed silently, leaving the entry with a dangling roastery_id reference. If FK enforcement is on, it should fail with a constraint error. This test documents the current behavior.

**Risk**: High. This is a data integrity concern. The entry's roastery display may break or show blank after the referenced roastery is deleted.

---

### 8. Estate CRUD (`estate.spec.ts`)

---

#### ESTATE-001: Add estate via dialog with all fields
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/estates`
2. Click "Add Estate"
3. Verify dialog with title "Add Estate" and 4 fields: Name, Location, Country, Altitude
4. Fill name: "Test Estate"
5. Fill location: "Chikmagalur, Karnataka"
6. Fill country: "India"
7. Fill altitude: "1200"
8. Click "Add"
9. Verify dialog closes
10. Verify "Test Estate" appears in the list with location info

**Expected**: Estate created with all fields. Displayed in list.

---

#### ESTATE-002: Add estate with only required name field
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to `/estates`
2. Click "Add Estate"
3. Fill only name: "Name Only Estate"
4. Leave location, country, altitude empty
5. Click "Add"
6. Verify "Name Only Estate" appears in list

**Expected**: Estate created with only name. Optional fields are null.

---

#### ESTATE-003: Edit estate
**Priority**: P0
**Type**: E2E
**Seed Data**: Estate "Moolay Estate" with location "Coorg, Karnataka", country "India", masl 1200
**Steps**:
1. Navigate to `/estates`
2. Click edit button next to "Moolay Estate"
3. Verify dialog has pre-filled values (name, location, country, altitude)
4. Change name to "Moolay Estate Updated"
5. Change altitude to "1300"
6. Click save
7. Verify "Moolay Estate Updated" appears in list

**Expected**: Estate edit pre-populates all fields. Changes are saved.

---

#### ESTATE-004: Delete estate (not in use)
**Priority**: P0
**Type**: E2E
**Seed Data**: Estate "Disposable Estate" not referenced by any entry
**Steps**:
1. Navigate to `/estates`
2. Click delete button next to "Disposable Estate"
3. Verify removed from list
4. Reload to confirm persistence

**Expected**: Estate deleted immediately (no confirmation dialog).

---

#### ESTATE-005: Empty state shows "No estates yet" message
**Priority**: P1
**Type**: E2E
**Seed Data**: No estates
**Steps**:
1. Navigate to `/estates`
2. Verify "No estates yet. Add one to get started." text visible

**Expected**: Empty state message.

---

#### ESTATE-006: Cannot add estate with empty name
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/estates`
2. Click "Add Estate"
3. Leave name empty, fill other fields
4. Verify "Add" button disabled

**Expected**: Name is required. Button disabled until name provided.

---

#### ESTATE-007: Delete estate that is in use by an entry
**Priority**: P1
**Type**: E2E
**Seed Data**: Estate "Moolay" referenced by an entry
**Steps**:
1. Navigate to `/estates`
2. Delete "Moolay"
3. Observe behavior (same FK concern as roastery)

**Expected**: Document actual behavior. Same data integrity risk as ROAST-008.

---

#### ESTATE-008: Estate list shows location alongside name
**Priority**: P2
**Type**: E2E
**Seed Data**: Estate "Moolay Estate" with location "Coorg, Karnataka"
**Steps**:
1. Navigate to `/estates`
2. Verify "Moolay Estate" entry also displays "Coorg, Karnataka"

**Expected**: Location info visible in estate list.

---

### 9. OCR & Photo Upload (`ocr.spec.ts`)

**Note**: OCR calls the Anthropic API (costs money). All OCR tests must mock the `/api/ocr` route response.

---

#### OCR-001: Photo upload triggers OCR and auto-fills form
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Mock `/api/ocr` route to return:
   ```json
   { "coffee_name": "OCR Coffee", "origin": "Ethiopia", "roast_level": "light", "flavor_notes": "blueberry, jasmine", "coffee_weight": 15 }
   ```
3. Mock `uploadPhoto` server action to succeed (or use a real tiny image upload if feasible)
4. Upload a test image via the file input (`page.locator('input[type="file"]').setInputFiles(...)`)
5. Wait for "Reading label..." indicator to appear
6. Wait for "Label scanned!" toast
7. Verify "Name" input has value "OCR Coffee"
8. Verify "Flavor Notes" has "blueberry, jasmine"
9. Verify "Bean Weight" has "15"
10. Verify "Light" roast button is active

**Expected**: OCR response auto-fills matching form fields. Toast confirms scan.

---

#### OCR-002: OCR failure shows error toast
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Mock `/api/ocr` to return status 500
3. Upload a test image
4. Verify "Could not read the label. Try a clearer photo." error toast

**Expected**: OCR failure handled gracefully with user-friendly error message.

---

#### OCR-003: OCR does not overwrite manually filled fields
**Priority**: P2
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Fill "Name" with "My Manual Name"
3. Mock `/api/ocr` to return `{ "coffee_name": "OCR Name", ... }`
4. Upload a photo
5. Wait for OCR completion
6. Verify "Name" input now has "OCR Name" (it DOES overwrite -- document this behavior)

**Expected**: Document actual behavior. The code uses `data.coffee_name || prev.coffeeName` which means OCR values overwrite if non-empty. This is the current design.

---

#### OCR-004: Photo appears in the upload preview area
**Priority**: P2
**Type**: E2E
**Steps**:
1. Navigate to `/entry/new`
2. Upload a test image file
3. Verify a photo preview/thumbnail appears in the photo section

**Expected**: Uploaded photo shown in the form preview area.

---

### 10. Navigation (`navigation.spec.ts`)

---

#### NAV-001: Header menu links work
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to `/feed`
2. Click hamburger menu button (`[data-testid="nav-menu"]`)
3. Verify menu shows "Roasteries" and "Estates" links
4. Click "Roasteries"
5. Verify redirect to `/roasteries`
6. Navigate back to `/feed`
7. Open menu again
8. Click "Estates"
9. Verify redirect to `/estates`

**Expected**: Menu links navigate to correct pages.

---

#### NAV-002: Logo link navigates to feed
**Priority**: P2
**Type**: E2E
**Steps**:
1. Navigate to `/roasteries`
2. Click "Coffeebook" logo text in header
3. Verify redirect to `/feed`

**Expected**: Logo always links back to feed.

---

## Test Data & Fixtures

### Profiles (Always Seeded)
| ID | Name | Initials | Color |
|----|------|----------|-------|
| karan | Karan | K | #d4a12a |
| vidit | Vidit | V | #0e4444 |
| amar | Amar | A | #76553c |

### Roasteries (Seeded Per Test)
| ID | Name | Used By Tests |
|----|------|---------------|
| r-subko | Subko | CREATE, DETAIL, EDIT, FEED, ROAST |
| r-bt | Blue Tokai | FEED |
| r-disposable | Disposable Roastery | ROAST-003 |

### Estates (Seeded Per Test)
| ID | Name | Location | Country | MASL | Used By Tests |
|----|------|----------|---------|------|---------------|
| e-moolay | Moolay Estate | Coorg, Karnataka | India | 1200 | CREATE, DETAIL, EDIT, FEED, ESTATE |
| e-krh | Kerehaklu | Chikmagalur | India | 1100 | FEED |
| e-disposable | Disposable Estate | null | null | null | ESTATE-004 |

### Entries (Seeded Per Test)
| ID | Profile | Coffee Name | Roast | Brew | Roastery | Estate | Rating |
|----|---------|-------------|-------|------|----------|--------|--------|
| e-detail-test | vidit | Detail Test Blend | medium-dark | espresso | r-subko | e-moolay | 8.5 |
| e-delete-test | vidit | Delete Me Coffee | light | null | null | null | null |
| e-feed-1 | vidit | Vidit Light | light | null | r-subko | e-moolay | 7.0 |
| e-feed-2 | vidit | Vidit Dark | dark | null | r-bt | e-krh | 6.5 |
| e-feed-3 | karan | Karan Medium | medium | null | r-subko | null | 8.0 |
| e-feed-4 | amar | Amar Espresso | medium-dark | espresso | null | null | 7.5 |
| e-minimal | vidit | Minimal Entry | null | null | null | null | null |

---

## Test Helper Functions

### Auth Helpers (`e2e/helpers/auth.ts`)

#### `authenticate(page, profile?)`
- Set `sessionStorage.coffeebook-auth = "true"`
- Set `localStorage.coffeebook-profile = profile` (default: "vidit")
- Set cookie `coffeebook-profile = profile`
- Navigate to `/feed`
- Return the authenticated page

### DB Helpers (`e2e/helpers/db.ts`)

#### `seedProfiles(db)`
- Insert 3 hardcoded profiles (onConflictDoNothing)

#### `seedRoasteries(db, roasteries[])`
- Insert array of roastery records

#### `seedEstates(db, estates[])`
- Insert array of estate records

#### `seedEntries(db, entries[])`
- Insert array of coffee_entries records

#### `cleanupAll(db)`
- Delete from: entry_photos, coffee_entries, roasteries, estates
- Keep profiles

### Selector Constants (`e2e/helpers/selectors.ts`)

```typescript
export const SELECTORS = {
  // Auth
  passwordInput: 'input[placeholder="Enter password"]',
  enterButton: 'button:has-text("Enter")',

  // Header
  navMenu: '[data-testid="nav-menu"]',
  logoutButton: '[data-testid="logout-button"]',

  // Entry form
  coffeeNameInput: 'input[placeholder*="Bili hu"]',
  saveButton: 'button:has-text("Save Entry")',
  updateButton: 'button:has-text("Update Entry")',

  // Entry detail
  editEntry: '[data-testid="edit-entry"]',
  deleteEntry: '[data-testid="delete-entry"]',

  // Feed
  entryCard: 'a[href^="/entry/"]',
  fab: 'a[href="/entry/new"]',
};
```

---

## Risk Areas & Recommended Focus

### High Risk (Test First)
1. **Entry CRUD lifecycle** -- core app value. Any regression here makes the app unusable.
2. **Auth state management** -- sessionStorage + localStorage + cookie triple-sync is fragile. If any layer fails, users get locked out or see wrong data.
3. **Form data integrity** -- the entry form has 15+ fields with controlled state. Stale closures, missing form data keys, or Zod validation failures will silently drop data.

### Medium Risk
4. **Filter correctness** -- 4 filter types with AND logic and URL-based state. Filter combinations could produce wrong queries.
5. **Inline entity creation** -- adding roastery/estate from the entry form involves dialog + server action + local state update + dropdown selection. Many moving parts.
6. **Delete with FK references** -- deleting roastery/estate in use by entries may corrupt data silently.

### Lower Risk (But Worth Covering)
7. **OCR auto-fill** -- depends on external API. Mock-only testing. Core form works without OCR.
8. **Photo upload** -- file handling, resize, disk write. Complex but not critical path.
9. **Navigation** -- simple link routing. Low regression risk.

---

## Implementation Notes

### Critical Playwright Configuration
- **`workers: 1`** -- mandatory. SQLite cannot handle concurrent writes.
- **`fullyParallel: false`** -- mandatory. Tests share a single database file.
- **`webServer: "bun run start"`** -- use production build, not dev server. Server Actions behave differently.
- **`storageState`** -- saves localStorage + cookies from auth.setup.ts.
- **`addInitScript`** -- required to inject sessionStorage (not captured by storageState).

### Source Code Changes Required Before Tests
1. Add `data-testid="nav-menu"` to hamburger menu button in `src/components/header-bar.tsx`
2. Add `data-testid="logout-button"` to logout button in `src/components/header-bar.tsx`
3. Add `data-testid="edit-entry"` to edit link in `src/app/entry/[id]/page.tsx`
4. Add `data-testid="delete-entry"` to delete button wrapper in `src/components/delete-entry-button.tsx`

### Framework Gotchas (from Oracle Research)
- Base UI Select popup is portalled to `document.body` -- do NOT scope option search inside `form` locator
- Base UI Dialog popup is portalled -- use `page.getByRole("dialog")` which searches full DOM
- Server Actions cannot be intercepted/mocked -- test them end-to-end through UI
- RSC streaming requests (`?_rsc=...`) are internal -- ignore in assertions
- `useTransition` wraps server action calls -- wait for pending state to clear before asserting results
- `force-dynamic` on all pages means fresh data every load -- good for test isolation

### Test Execution Order (Recommended)
1. `auth.setup.ts` (setup project -- runs first)
2. `auth.spec.ts` (verify auth works)
3. `roastery.spec.ts` (create master data)
4. `estate.spec.ts` (create master data)
5. `entry-create.spec.ts` (depends on master data)
6. `entry-detail.spec.ts` (depends on entries)
7. `entry-edit.spec.ts` (depends on entries)
8. `entry-delete.spec.ts` (destroys entries)
9. `feed.spec.ts` (requires multiple entries)
10. `ocr.spec.ts` (isolated with mocks)
11. `navigation.spec.ts` (lightweight)

Note: With proper per-test seeding/teardown in fixtures, execution order should not matter. The recommended order above is for debugging convenience during initial development.
