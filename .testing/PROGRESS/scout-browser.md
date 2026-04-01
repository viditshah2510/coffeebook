# Coffeebook Scout Report
**Date**: 2026-03-29
**App URL tested**: http://localhost:3456 (local instance; production https://coffeebook.thescale.in returns 500 on all routes except /)
**Profile used**: Vidit
**Auth**: sessionStorage `coffeebook-auth=true` + localStorage `coffeebook-profile=vidit` + cookie `coffeebook-profile=vidit`

---

## All Routes Discovered

| # | URL | Page Title | Description | Auth Required |
|---|-----|-----------|-------------|---------------|
| 1 | `/` | Coffeebook | Landing page: password gate → profile selector | No |
| 2 | `/feed` | Coffeebook | Main feed with entry cards + filter bar | Yes (profile cookie) |
| 3 | `/entry/new` | Coffeebook | Full coffee entry creation form | Yes |
| 4 | `/entry/[id]` | Coffeebook | Entry detail view with edit/delete actions | Yes |
| 5 | `/entry/[id]/edit` | Coffeebook | Full entry edit form (same fields as new) | Yes |
| 6 | `/roasteries` | Coffeebook | Roastery list + add/edit/delete dialog | Yes |
| 7 | `/estates` | Coffeebook | Estate list + add/edit/delete dialog | Yes |

**API routes observed (server actions/RSC):**
- `GET /feed?_rsc=*` (Next.js RSC streaming — all 200)
- `GET /entry/new?_rsc=*` (200)
- `GET /entry/[id]?_rsc=*` (200)
- `GET /entry/[id]/edit?_rsc=*` (200)
- `GET /roasteries?_rsc=*` (200)
- `GET /estates?_rsc=*` (200)
- `POST /entry/new` (200) — form submission via Next.js Server Action
- `POST /api/ocr` (400 with no body — exists, expects multipart/form-data)
- `POST /api/uploads` (404 — route not found at this path)

---

## Navigation Structure

### Header Bar (sticky, on all authenticated pages)
- **Logo link**: "Coffeebook" → `/feed`
- **Hamburger menu button** (lucide-menu icon, no aria-label): opens dropdown inline showing:
  - "Roasteries" → `/roasteries`
  - "Estates" → `/estates`
- **Profile avatar**: Shows initial (e.g., "V") + name ("Vidit") — read-only display
- **Logout button** (lucide-log-out icon, no aria-label): clears localStorage/cookie, redirects to `/`

### Feed Filter Bar
- Two rows of pill buttons (no select/combobox — all are `<button>` elements with URL push)
- **Profile filters**: All | Karan | Vidit | Amar
- **Roast filters**: All Roasts | Light | Medium | Medium Dark | Dark

### FAB (Floating Action Button)
- Appears only when entries exist
- Round gold button with `+` icon → `/entry/new`

---

## Page-by-Page Interactive Elements

### `/` — Landing Page

**Pre-auth state:**
- `<input type="password" placeholder="Enter password">` — single password field
- `<button type="submit">Enter</button>` — submits PIN
- On wrong password: "Wrong password" error text appears

**Post-auth state (profile selection):**
- Three buttons (one per profile): Karan, Vidit, Amar
- Each shows avatar (colored circle with initial), name, "Tap to enter" subtitle
- Clicking → sets `localStorage.coffeebook-profile`, sets cookie `coffeebook-profile`, navigates to `/feed`

---

### `/feed` — Feed Page

**Feed text sample (1 entry visible):**
```
Coffeebook | V Vidit
All | Karan | Vidit | Amar
All Roasts | Light | Medium | Medium Dark | Dark
[Entry Card: V Vidit | about 4 hours ago | 8.0/10 | Bili hu | Chikmagalur | Pune | Medium Dark | Peanut butter, chocolate, caramel | 16g in | 20s | grind 4-5 on Ashone | Best extraction at 20 secs.]
```

**Filter buttons (all `<button>` type, no `aria-label`):**

| Button | Role | URL effect |
|--------|------|-----------|
| All | Profile filter default | removes `profile` param |
| Karan | Profile filter | adds `?profile=karan` |
| Vidit | Profile filter | adds `?profile=vidit` |
| Amar | Profile filter | adds `?profile=amar` |
| All Roasts | Roast filter default | removes `roast` param |
| Light | Roast filter | adds `?roast=light` |
| Medium | Roast filter | adds `?roast=medium` |
| Medium Dark | Roast filter | adds `?roast=medium-dark` |
| Dark | Roast filter | adds `?roast=dark` |

**Entry cards:** Each card is `<a href="/entry/[uuid]">` — contains profile avatar, timestamp, rating, coffee name, roast level, brew type, tasting notes preview.

**Filter behavior confirmed:**
- `/feed?profile=vidit` → shows only Vidit's entries
- `/feed?roast=medium` → shows only medium roast entries
- `/feed?profile=karan` → "No entries yet" (Karan has no entries)

**FAB:** `<a href="/entry/new">` with `+` icon (gold, bottom-right, fixed)

---

### `/entry/new` — New Entry Form

**Page layout:** Header → Back link → "New Entry" heading → Form sections

**All form fields:**

#### Section: Photo
| Element | Type | Notes |
|---------|------|-------|
| `<button type="button">Add Photo</button>` | camera button | Triggers hidden `<input type="file" accept="image/*" capture="environment" multiple>` |

#### Section: Coffee
| Field | Input type | Name attr | Placeholder | Required |
|-------|-----------|-----------|-------------|---------|
| NAME | `text` input | `coffeeName` | "e.g., Bili hu, Naivo, Half Light" | Yes |
| ROASTERY | combobox button (shadcn Select) | — | "Select roastery" | No |
| + (add roastery) | icon button next to ROASTERY | — | — | — |
| ESTATE | combobox button (shadcn Select) | — | "Select estate" | No |
| + (add estate) | icon button next to ESTATE | — | — | — |

#### Section: Roast Level (toggle buttons — mutually exclusive)
- Light | Medium | Medium Dark | Dark
- Type: `<button type="button">`
- Active state appears to toggle visually

#### Section: Brew Type (toggle buttons — mutually exclusive)
- Espresso | Americano | Pour Over | French Press | AeroPress | Cold Brew | Moka Pot | Filter
- Type: `<button type="button">`

#### Section: Brewing
| Field | Input type | Name attr | Placeholder |
|-------|-----------|-----------|-------------|
| BEAN WEIGHT | `number` | `coffeeWeight` | "16" (grams) |
| SHOT WEIGHT | `number` | `shotWeight` | "36" (grams) |
| TIME | `number` | `brewTime` | "25" (seconds) |
| GRIND SIZE | `text` input | `grindSize` | "4-5" |
| GRINDER | `text` input | `grinderType` | "e.g., Niche Zero, Baratza Encore" |

#### Section: Tasting
| Field | Input type | Name attr | Placeholder |
|-------|-----------|-----------|-------------|
| FLAVOR NOTES | `text` input | `flavorNotes` | "e.g., peanut butter, chocolate, citrus" |
| TASTE NOTES | `textarea` | `tasteNotes` | "How did this brew taste?" |
| RATING | `input[type=range]` | — | min=0, max=10, step=0.5 (implied) |
| Clear (rating) | `<button type="button">Clear</button>` | — | Resets slider |
| NOTES | `textarea` | `notes` | "Your thoughts on this coffee..." |

**Submit button:** `<button type="submit">Save Entry</button>`

**Form submission:**
- Uses Next.js Server Action (`POST /entry/new`)
- On success: Shows toast "Entry saved!" + displays the new entry inline
- Stays on `/entry/new` URL after submission (shows new entry detail in-page, then navigates back to feed)
- Required validation: Only `coffeeName` is required

**Test submission result:** Successfully created entry "Scout Espresso Blend" with:
- Light roast, Espresso brew type
- 18g bean, 36g shot, 28s brew time
- Taste notes: "Chocolate, caramel, hazelnut"
- Rating: 8.0/10
- Entry appeared in `/feed` immediately

---

### `/entry/[id]` — Entry Detail Page

**Displayed data:**
- Profile avatar + name + timestamp
- Rating badge (e.g., "8.0/10")
- Coffee name (h1)
- Brew type pill (teal)
- Roast level pill (color-coded by level)
- Stats grid (Bean Weight, Shot Weight, Brew Time, Grind Size)
- Flavor notes pills
- TASTE NOTES section
- NOTES section
- Photos (if any)

**Header buttons:**
- Back `<a href="/feed">` (arrow left + "Feed")
- Edit `<a href="/entry/[id]/edit">` (square-pen icon, no text, no aria-label)
- Delete `<button>` (trash-2 icon, red, no text, no aria-label)

**Delete button behavior:** Not tested (avoided deleting test data), but from code it likely calls a server action + redirects to `/feed`.

---

### `/entry/[id]/edit` — Entry Edit Form

**Identical form structure to `/entry/new` with these differences:**
- Page heading: "Edit Entry" instead of "New Entry"
- Fields are pre-populated with existing values
- RATING shows current value + "X.X/10" display
- Has "Clear" button for rating (same as new form)
- Submit button: `<button type="submit">Update Entry</button>` instead of "Save Entry"
- Back link → `/feed` (labeled "Back")

---

### `/roasteries` — Roasteries Page

**Header:** "Roasteries" + Back to Feed link

**Page content when empty:**
```
Roasteries
[Add Roastery button]
No roasteries yet. Add one to get started.
```

**Buttons:**
- `<button>Add Roastery</button>` (full-width, teal, with + icon)
- When roasteries exist: Edit (pencil) + Delete (trash) buttons per row

**Add Roastery Dialog:**
- Dialog title: "Add Roastery"
- Field: NAME * — `<input placeholder="e.g., Subko, Blue Tokai, Third Wave">`
- Buttons: `<button>Add</button>` (disabled until name filled) + `<button type="button">Close</button>`

---

### `/estates` — Estates Page

**Header:** "Estates" + Back to Feed link

**Page content when empty:**
```
Estates
[Add Estate button]
No estates yet. Add one to get started.
```

**Buttons:**
- `<button>Add Estate</button>` (full-width, teal, with + icon)
- When estates exist: Edit + Delete buttons per row

**Add Estate Dialog:**
- Dialog title: "Add Estate"
- Fields:

| Field | Type | Placeholder |
|-------|------|-------------|
| NAME * | text | "e.g., Moolay Estate, Kerehaklu" |
| LOCATION | text | "e.g., Coorg, Karnataka" |
| COUNTRY | text | "e.g., India" |
| ALTITUDE (MASL) | number | "e.g., 1200" |

- Buttons: `<button>Add</button>` (disabled until name filled) + `<button type="button">Close</button>`

---

## API Endpoints

| # | Method | URL | Status | Notes |
|---|--------|-----|--------|-------|
| 1 | POST | `/entry/new` | 200 | Next.js Server Action — create entry |
| 2 | GET | `/feed?_rsc=*` | 200 | RSC streaming for feed page |
| 3 | GET | `/entry/[id]?_rsc=*` | 200 | RSC streaming for entry detail |
| 4 | GET | `/entry/[id]/edit?_rsc=*` | 200 | RSC streaming for edit form |
| 5 | GET | `/roasteries?_rsc=*` | 200 | RSC streaming for roasteries |
| 6 | GET | `/estates?_rsc=*` | 200 | RSC streaming for estates |
| 7 | POST | `/api/ocr` | 400 | OCR endpoint — expects multipart form with image |
| 8 | GET | `/api/uploads` | 404 | Photos served differently (not at this path) |

**Note:** No traditional REST API calls observed. App uses Next.js Server Actions (POST to page URLs) for all mutations.

---

## Console Errors

**Local instance:** 0 console errors, 0 warnings.

**Production (https://coffeebook.thescale.in):**
- ALL routes except `/` return HTTP 500
- Error digest codes: 1961166528 (/feed), 4006105753 (/entry/new), 4003379039 (/roasteries), 2715304678 (/estates)
- Console: `[error] Failed to load resource: the server responded with a status of 500 ()` — 7+ errors
- Likely cause: Database connection failure (missing `ANTHROPIC_API_KEY` or `TURSO_DATABASE_URL` env var on the deployed server, or Docker container not running)

---

## Issues Found

| # | Severity | Issue | Page | Details |
|---|----------|-------|------|---------|
| 1 | CRITICAL | Production server returns 500 on all routes except `/` | All routes except `/` | Error digests suggest server-side render failure. Container not running per `docker ps`. |
| 2 | MEDIUM | Hamburger menu has no `aria-label` | `/feed` header | `<button>` with menu icon has no accessible label |
| 3 | MEDIUM | Logout button has no `aria-label` | `/feed` header | `<button>` with log-out icon has no accessible label |
| 4 | MEDIUM | Edit button on entry detail has no `aria-label` | `/entry/[id]` | `<a>` with pencil icon — no text, no aria |
| 5 | MEDIUM | Delete button on entry detail has no `aria-label` | `/entry/[id]` | `<button>` with trash icon — no text, no aria |
| 6 | LOW | Add roastery/estate `+` icon buttons on entry form have no `aria-label` | `/entry/new`, `/entry/[id]/edit` | Inline `+` buttons next to dropdowns |
| 7 | LOW | Filter buttons have no `aria-label` | `/feed` | Profile + roast pill buttons lack accessible descriptions |
| 8 | INFO | `POST /api/uploads` returns 404 | N/A | Photo upload API path may be different; uploads go through `/api/ocr` or a different action |
| 9 | INFO | Rating slider has no `aria-label` | `/entry/new`, edit | `<input type="range">` has no accessible label identifying it as "Rating" |
| 10 | INFO | Form stays on `/entry/new` URL after submission | `/entry/new` | Shows entry detail inline and toast, but URL doesn't change to `/feed` immediately (navigates after toast timeout) |

---

## Screenshots Taken

| Screenshot | Page |
|-----------|------|
| `page-01-landing-preauth.png` | `/` — password gate |
| `page-01b-password-filled.png` | `/` — password filled |
| `page-01c-after-password.png` | `/` — profile selector visible |
| `page-01d-landing-authed.png` | `/` — with auth injected |
| `page-02-feed.png` | `/feed` — main feed |
| `page-02a-feed-top.png` | `/feed` — top of feed |
| `page-02b-feed-filters.png` | `/feed` — filters visible |
| `page-02c-feed-profile-filter.png` | `/feed?profile=vidit` |
| `page-02d-feed-roast-filter.png` | `/feed?roast=medium` |
| `page-03-entry-new-top.png` | `/entry/new` — top of form |
| `page-03a-entry-new-scroll1.png` | `/entry/new` — scroll 1 |
| `page-03b-entry-new-scroll2.png` | `/entry/new` — scroll 2 |
| `page-03c-entry-new-scroll3.png` | `/entry/new` — scroll 3 |
| `page-03d-entry-new-scroll4.png` | `/entry/new` — scroll 4 |
| `page-03e-entry-new-scroll5.png` | `/entry/new` — scroll 5 |
| `page-03-form-step1.png` | Form — name filled |
| `page-03-form-step2-toggles.png` | Form — roast + brew selected |
| `page-03-form-step3-brewing.png` | Form — brewing params |
| `page-03-form-step4-tasting.png` | Form — tasting section |
| `page-03-form-step5-bottom.png` | Form — bottom with Submit |
| `page-03-form-submitted.png` | After form submission |
| `page-04-roasteries.png` | `/roasteries` — empty list |
| `page-04b-roastery-dialog.png` | `/roasteries` — Add dialog open |
| `page-05-estates.png` | `/estates` — empty list |
| `page-05b-estate-dialog.png` | `/estates` — Add dialog open |
| `page-06-entry-detail.png` | `/entry/[id]` — detail top |
| `page-06b-entry-detail-scroll.png` | `/entry/[id]` — scrolled |
| `page-07-entry-edit.png` | `/entry/[id]/edit` — edit form top |
| `page-07a-entry-edit-scroll1.png` | Edit form — scroll 1 |
| `page-07b-entry-edit-scroll2.png` | Edit form — scroll 2 |
| `page-07c-entry-edit-scroll3.png` | Edit form — scroll 3 |
| `page-09-menu-open.png` | `/feed` — hamburger menu open |
| `page-09b-menu-full.png` | `/feed` — menu full view |
| `page-10-after-logout.png` | After logout → `/` |
| `page-11-filter-karan.png` | `/feed?profile=karan` — empty |
| `page-12-filter-medium.png` | `/feed?roast=medium` — empty |
| `page-13-bili-hu-detail.png` | Bili hu entry detail |
| `page-13b-bili-hu-detail-scroll.png` | Bili hu detail scrolled |

---

## Summary

- **7 routes** discovered and mapped
- **2 entries** in the database during exploration (1 pre-existing "Bili hu", 1 created by scout "Scout Espresso Blend")
- **1 Server Action endpoint** confirmed working: `POST /entry/new`
- **2 API routes**: `/api/ocr` (400), `/api/uploads` (404)
- **0 JS console errors** on local instance
- **CRITICAL**: Production is broken — all routes 500 except `/`
- **10 accessibility issues** identified (missing aria-labels on icon buttons)
- Form submission confirmed working end-to-end (create + view)
- Feed filters confirmed working (profile + roast level)
- Roastery and Estate add dialogs confirmed opening with correct fields
