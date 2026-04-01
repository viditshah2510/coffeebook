# Coffeebook -- Complete Codebase Architecture Analysis

## 1. Architecture Overview

### Framework & Stack
- **Framework**: Next.js 16.2.1 (App Router, standalone output mode)
- **Language**: TypeScript 5.x
- **Runtime**: Bun (via package scripts)
- **Database**: SQLite via libsql/Turso client (`data/coffeebook.db`)
- **ORM**: Drizzle ORM 0.45.2 (with Drizzle Kit 0.31.10 for migrations)
- **OCR**: Claude Vision API via `@anthropic-ai/sdk` (model: claude-sonnet-4-20250514)
- **UI**: React 19.2.4, Tailwind CSS 4, shadcn/ui components, Sonner toasts
- **Forms**: React Hook Form 7.72 + Zod 4.3.6 validation
- **Fonts**: Alegreya Sans (headings) + IBM Plex Sans (body)
- **Icons**: Lucide React
- **Date Handling**: date-fns 4.1.0
- **Deployment**: Docker (standalone), Caddy reverse proxy, self-hosted on WSL2

### Directory Structure
```
src/
  app/                          -- Next.js App Router pages
    page.tsx                    -- Home (password gate + profile selector)
    layout.tsx                  -- Root layout (fonts, Toaster)
    globals.css                 -- Global styles
    feed/page.tsx               -- Feed page (server component)
    entry/
      new/page.tsx              -- New entry form (server component)
      [id]/
        page.tsx                -- Entry detail (server component)
        edit/page.tsx           -- Edit entry form (server component)
    roasteries/page.tsx         -- Roasteries management (server component)
    estates/page.tsx            -- Estates management (server component)
    api/
      ocr/route.ts              -- POST /api/ocr (Claude Vision OCR)
      uploads/[filename]/route.ts -- GET /api/uploads/:filename (image serving)
  components/
    password-gate.tsx           -- Client: password authentication
    profile-selector.tsx        -- Client: profile selection
    header-bar.tsx              -- Client: sticky header + navigation menu
    entry-form.tsx              -- Client: create/edit entry form (main complex component)
    entry-card.tsx              -- Server: entry card for feed
    filter-bar.tsx              -- Client: feed filters (profile/roast/roastery/estate)
    photo-upload.tsx            -- Client: photo upload with resize
    delete-entry-button.tsx     -- Client: entry deletion with confirmation
    roastery-list.tsx           -- Client: roastery CRUD list
    estate-list.tsx             -- Client: estate CRUD list
    ui/                         -- shadcn/ui primitives (12 components)
  hooks/
    use-profile.ts              -- Profile state (localStorage + cookie sync)
  lib/
    constants.ts                -- PROFILES, ROAST_LEVELS, BREW_TYPES
    db/
      index.ts                  -- Drizzle DB client init
      schema.ts                 -- All table definitions + types
      seed.ts                   -- Seed 3 profiles
  server/
    actions/
      entry-actions.ts          -- createEntry, updateEntry, deleteEntry
      roastery-actions.ts       -- createRoastery, updateRoastery, deleteRoastery
      estate-actions.ts         -- createEstate, updateEstate, deleteEstate
      photo-actions.ts          -- uploadPhoto, deletePhoto
    queries/
      entry-queries.ts          -- getEntries (with filters), getEntryById
      roastery-queries.ts       -- getRoasteries, getRoasteryById
      estate-queries.ts         -- getEstates, getEstateById
data/
  coffeebook.db                 -- SQLite database
  uploads/                      -- Photo storage (local disk)
drizzle/                        -- Migration SQL files
```

---

## 2. Database Schema (5 tables)

### Table: `profiles`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | text | PRIMARY KEY | Hardcoded: "karan", "vidit", "amar" |
| name | text | NOT NULL | Display name |
| initials | text | NOT NULL | 1-char initial |
| color | text | NOT NULL | Hex color for avatar |
| created_at | text | NOT NULL, DEFAULT datetime('now') | ISO timestamp string |

### Table: `roasteries`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | text | PRIMARY KEY, default: crypto.randomUUID() | UUID |
| name | text | NOT NULL | Roastery name |
| created_at | text | NOT NULL, DEFAULT datetime('now') | |

### Table: `estates`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | text | PRIMARY KEY, default: crypto.randomUUID() | UUID |
| name | text | NOT NULL | Estate name |
| location | text | nullable | e.g. "Coorg, Karnataka" |
| country | text | nullable | e.g. "India" |
| masl | integer | nullable | Meters above sea level |
| created_at | text | NOT NULL, DEFAULT datetime('now') | |

### Table: `coffee_entries`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | text | PRIMARY KEY, default: crypto.randomUUID() | UUID |
| profile_id | text | NOT NULL, FK -> profiles.id | No cascade delete |
| roastery_id | text | nullable, FK -> roasteries.id | No cascade delete |
| estate_id | text | nullable, FK -> estates.id | No cascade delete |
| coffee_name | text | NOT NULL | Required field |
| origin | text | nullable | Free text |
| location | text | nullable | Free text |
| roast_level | text | nullable | Values: light, medium, medium-dark, dark |
| brew_type | text | nullable | Values: espresso, americano, pour-over, french-press, aeropress, cold-brew, moka-pot, filter |
| flavor_notes | text | nullable | Comma-separated |
| coffee_weight | real | nullable | Grams (bean weight) |
| shot_weight | real | nullable | Grams (output) |
| brew_time | integer | nullable | Seconds |
| grind_size | text | nullable | Free text |
| grinder_type | text | nullable | Free text |
| rating | real | nullable | 0-10, step 0.1 |
| taste_notes | text | nullable | Long text |
| notes | text | nullable | Long text |
| created_at | text | NOT NULL, DEFAULT datetime('now') | |
| updated_at | text | NOT NULL, DEFAULT datetime('now') | |

### Table: `entry_photos`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | text | PRIMARY KEY, default: crypto.randomUUID() | UUID |
| entry_id | text | NOT NULL, FK -> coffee_entries.id, **ON DELETE CASCADE** | Cascading delete |
| blob_url | text | NOT NULL | Path like `/api/uploads/filename.webp` |
| is_label | integer (boolean) | NOT NULL, DEFAULT false | Currently unused in code |
| sort_order | integer | NOT NULL, DEFAULT 0 | Photo ordering |
| created_at | text | NOT NULL, DEFAULT datetime('now') | |

### Key Relationships
```
profiles (1) --< coffee_entries (many)        [profile_id FK, no cascade]
roasteries (1) --< coffee_entries (many)      [roastery_id FK, nullable, no cascade]
estates (1) --< coffee_entries (many)          [estate_id FK, nullable, no cascade]
coffee_entries (1) --< entry_photos (many)    [entry_id FK, CASCADE DELETE]
```

### Exported Types
- `Profile`, `CoffeeEntry`, `EntryPhoto`, `NewCoffeeEntry`
- `Roastery`, `NewRoastery`, `Estate`, `NewEstate`

---

## 3. API Routes (2 endpoints)

### POST /api/ocr
- **File**: `src/app/api/ocr/route.ts`
- **Auth**: None (no middleware protection)
- **Request**: `{ imageUrl: string }` (JSON body)
- **Logic**:
  1. Accepts either local upload path (`/api/uploads/...`) or external URL
  2. For local: reads file from disk, detects media type via magic bytes (JPEG/PNG/GIF/WebP)
  3. For external: fetches image, uses content-type header
  4. Sends to Claude claude-sonnet-4-20250514 with structured prompt
  5. Parses JSON from response text via regex `\{[\s\S]*\}`
- **Response**: `{ coffee_name, origin, roast_level, flavor_notes, coffee_weight }` (all nullable)
- **Errors**:
  - 400: No imageUrl provided
  - 500: OCR parsing failed or Anthropic API error
- **Dependencies**: `ANTHROPIC_API_KEY` env var

### GET /api/uploads/[filename]
- **File**: `src/app/api/uploads/[filename]/route.ts`
- **Auth**: None
- **Security**: Uses `path.basename()` to prevent path traversal
- **Logic**: Reads file from `data/uploads/`, detects content type via magic bytes
- **Response**: Binary image with `Cache-Control: public, max-age=31536000, immutable`
- **Errors**: 404 if file not found

---

## 4. Server Actions (Mutation Layer)

### Entry Actions (`src/server/actions/entry-actions.ts`)

#### Zod Schema: `entrySchema`
```typescript
{
  profileId: string().min(1),
  coffeeName: string().min(1, "Coffee name is required"),
  roasteryId: string().optional().default(""),
  estateId: string().optional().default(""),
  origin: string().optional().default(""),
  location: string().optional().default(""),
  roastLevel: string().optional().default(""),
  brewType: string().optional().default(""),
  flavorNotes: string().optional().default(""),
  coffeeWeight: coerce.number().positive().optional().nullable(),
  shotWeight: coerce.number().positive().optional().nullable(),
  brewTime: coerce.number().int().positive().optional().nullable(),
  grindSize: string().optional().default(""),
  grinderType: string().optional().default(""),
  rating: coerce.number().min(0).max(10).optional().nullable(),
  tasteNotes: string().optional().default(""),
  notes: string().optional().default(""),
  photoUrls: array(string()).optional().default([]),
}
```

#### `createEntry(formData: FormData)`
- Extracts photo URLs from keys matching `photo_*`
- Parses with `entrySchema`
- Generates UUID for entry
- Inserts `coffeeEntries` row
- Inserts `entryPhotos` rows (sequentially, one by one)
- Revalidates `/feed`
- Returns `{ id }`
- **Note**: Does NOT validate that profileId exists in DB
- **Note**: Does NOT validate roasteryId/estateId reference valid records
- **Note**: Does NOT wrap in transaction (entry + photos are separate inserts)

#### `updateEntry(id: string, formData: FormData)`
- Same schema parsing as create
- Updates `coffeeEntries` row, sets `updatedAt` to now
- **Deletes ALL existing photos** for entry, then re-inserts from form
- Revalidates `/feed` and `/entry/${id}`
- Returns `{ id }`
- **Note**: No ownership check (any profileId can edit any entry)
- **Note**: Old photo files on disk are NOT deleted when photos are removed

#### `deleteEntry(id: string)`
- Deletes entry by ID (photos cascade-delete via FK)
- Revalidates `/feed`
- **Note**: No ownership check
- **Note**: Photo files on disk are NOT cleaned up

### Roastery Actions (`src/server/actions/roastery-actions.ts`)

#### Zod Schema: `roasterySchema`
```typescript
{ name: string().min(1, "Name is required") }
```

#### `createRoastery(formData)` -> `{ id, name }`
#### `updateRoastery(id, formData)` -> void
#### `deleteRoastery(id)` -> void
- **Note**: No check if roastery is in use by entries (will fail on FK constraint in some DBs, but SQLite FKs may not be enforced by default)
- **Note**: No duplicate name check

### Estate Actions (`src/server/actions/estate-actions.ts`)

#### Zod Schema: `estateSchema`
```typescript
{
  name: string().min(1, "Name is required"),
  location: string().optional().default(""),
  country: string().optional().default(""),
  masl: coerce.number().int().positive().optional().nullable(),
}
```

#### `createEstate(formData)` -> `{ id, name }`
#### `updateEstate(id, formData)` -> void
#### `deleteEstate(id)` -> void
- **Note**: Same issues as roastery (no in-use check, no duplicate check)

### Photo Actions (`src/server/actions/photo-actions.ts`)

#### `uploadPhoto(formData: FormData)`
- Reads file from formData
- Creates `data/uploads/` directory if needed
- Generates filename: `{timestamp}-{random6chars}.webp`
- Writes raw bytes to disk (no actual format conversion -- filename says .webp but content may be JPEG/PNG)
- Returns `{ url: "/api/uploads/{filename}" }`
- **Note**: No file size limit check
- **Note**: No MIME type validation (accepts any file)
- **Note**: No authentication

#### `deletePhoto(url: string)`
- Extracts filename from URL, deletes from disk
- Silently ignores errors
- **Note**: Never actually called anywhere in the codebase (orphan function)

---

## 5. Server Queries (Read Layer)

### Entry Queries (`src/server/queries/entry-queries.ts`)

#### `getEntries(filters?)`
- **Joins**: INNER JOIN profiles, LEFT JOIN roasteries, LEFT JOIN estates
- **Ordering**: DESC by created_at
- **Filters** (all AND-combined):
  - `profileId` -> exact match on coffeeEntries.profileId
  - `roastLevel` -> exact match on coffeeEntries.roastLevel
  - `roasteryId` -> exact match on coffeeEntries.roasteryId
  - `estateId` -> exact match on coffeeEntries.estateId
  - `search` -> LIKE match on coffeeName OR origin OR flavorNotes OR notes
- **Photos**: Fetches ALL photos for matched entries via OR of entryIds
- **Returns**: Array of entry objects with `profile`, `roastery`, `estate`, `photos` nested
- **Performance note**: If entryIds is empty, skips photo query. If many entries, the OR clause could be slow.

#### `getEntryById(id: string)`
- Same join pattern as getEntries
- Returns single entry with photos (ordered by sortOrder)
- Returns null if not found

### Roastery Queries (`src/server/queries/roastery-queries.ts`)
#### `getRoasteries()` -> all roasteries, ordered ASC by name
#### `getRoasteryById(id)` -> single roastery or null

### Estate Queries (`src/server/queries/estate-queries.ts`)
#### `getEstates()` -> all estates, ordered ASC by name
#### `getEstateById(id)` -> single estate or null

---

## 6. Page Components Map

| Route | File | Type | Data Fetching | Key Components |
|-------|------|------|--------------|----------------|
| `/` | `app/page.tsx` | Server | None | PasswordGate -> ProfileSelector |
| `/feed` | `app/feed/page.tsx` | Server (force-dynamic) | getEntries, getRoasteries, getEstates | HeaderBar, FilterBar, EntryCard, FAB link |
| `/entry/new` | `app/entry/new/page.tsx` | Server (force-dynamic) | getRoasteries, getEstates | HeaderBar, EntryForm |
| `/entry/[id]` | `app/entry/[id]/page.tsx` | Server (force-dynamic) | getEntryById | HeaderBar, DeleteEntryButton, photo gallery, detail display |
| `/entry/[id]/edit` | `app/entry/[id]/edit/page.tsx` | Server (force-dynamic) | getEntryById, getRoasteries, getEstates | HeaderBar, EntryForm (with entry prop) |
| `/roasteries` | `app/roasteries/page.tsx` | Server (force-dynamic) | getRoasteries | HeaderBar, RoasteryList |
| `/estates` | `app/estates/page.tsx` | Server (force-dynamic) | getEstates | HeaderBar, EstateList |

All pages use `force-dynamic` rendering. No static pages except the home page.

---

## 7. Client Components Detail

### PasswordGate (`password-gate.tsx`)
- **Auth mechanism**: Client-side only, hardcoded password `scale@123`
- **Storage**: `sessionStorage.getItem("coffeebook-auth")` -- survives page refreshes within session
- **Flow**: Check sessionStorage -> if not authenticated, show password form -> on match, set sessionStorage + show ProfileSelector
- **Security note**: Password is in client-side JS bundle (visible in source). No server-side auth at all.

### ProfileSelector (`profile-selector.tsx`)
- Renders 3 hardcoded profile buttons (Karan, Vidit, Amar)
- On click: sets profile in localStorage + cookie, redirects to /feed
- No password per-profile

### HeaderBar (`header-bar.tsx`)
- Sticky header with "Coffeebook" link to /feed
- Shows current profile avatar + name (from useProfile hook)
- Hamburger menu with links to /roasteries and /estates
- Logout button: clears profile, redirects to /

### useProfile Hook (`hooks/use-profile.ts`)
- Uses `useSyncExternalStore` for cross-component reactivity
- **Storage**: `localStorage` key `coffeebook-profile` (persists across sessions)
- **Cookie sync**: Sets `coffeebook-profile` cookie for potential server-side use (currently unused)
- Profile must be one of: "karan", "vidit", "amar"

### EntryForm (`entry-form.tsx`)
- Largest client component (~685 lines)
- Used for both create and edit (entry prop determines mode)
- **State management**:
  - Controlled form values for all text fields
  - Separate state for: photos[], activeRoast, activeBrew, rating, roasteryId, estateId
  - Roasteries and estates are locally mutable (new ones added in-form)
- **Photo upload flow**: PhotoUpload -> uploadPhoto server action -> adds URL to state -> triggers OCR
- **OCR flow**: After photo upload, calls POST /api/ocr -> auto-fills form fields
- **Inline entity creation**: "Add Roastery" and "Add Estate" dialogs within form
- **Submit flow**: Constructs FormData from state, calls createEntry or updateEntry
- **Redirect**: On create, goes to `/entry/{id}`. On update, goes to `/feed`.

### FilterBar (`filter-bar.tsx`)
- URL-based filtering via search params
- 4 filter rows: Profile, Roast Level, Roastery, Estate
- Toggle behavior: clicking active filter clears it
- Updates URL via `router.push("/feed?...params")`
- Roastery/Estate rows hidden if no entities exist

### EntryCard (`entry-card.tsx`)
- Server component (no "use client")
- Renders card for feed: profile avatar, photo (first only), coffee name, roastery, estate/origin, tags (brew/roast/flavor), brew params, notes preview
- Entire card is a Link to `/entry/{id}`

### PhotoUpload (`photo-upload.tsx`)
- Client-side image resize to max 1200px width, WebP format, 0.82 quality
- Calls `uploadPhoto` server action
- Triggers `onPhotoAdded` callback (used for OCR)
- Accept: `image/*`, supports `capture="environment"` (mobile camera)
- Supports multiple file selection

### DeleteEntryButton (`delete-entry-button.tsx`)
- Uses `window.confirm()` for confirmation
- Calls `deleteEntry` server action
- Redirects to `/feed` after deletion

### RoasteryList (`roastery-list.tsx`)
- Full CRUD via dialog: Add, Edit (rename), Delete
- No delete confirmation dialog (unlike entries)
- Uses `router.refresh()` after mutations

### EstateList (`estate-list.tsx`)
- Full CRUD via dialog with 4 fields: name, location, country, masl
- Same UX pattern as RoasteryList
- No delete confirmation

---

## 8. Critical User Flows

### Flow 1: Login -> Select Profile -> View Feed (P0)
```
/ (HomePage)
  -> PasswordGate checks sessionStorage("coffeebook-auth")
  -> If not set: show password input
  -> User enters "scale@123"
  -> sessionStorage set to "true"
  -> ProfileSelector rendered
  -> User clicks profile (e.g., "Karan")
  -> localStorage("coffeebook-profile") = "karan"
  -> Cookie("coffeebook-profile") = "karan"
  -> router.push("/feed")
  -> /feed server component:
    -> getEntries() + getRoasteries() + getEstates() (parallel Promise.all)
    -> Render HeaderBar, FilterBar, EntryCard list
```

### Flow 2: Create New Entry (P0)
```
/entry/new
  -> Server: getRoasteries() + getEstates()
  -> Render EntryForm (no entry prop = create mode)
  -> User optionally uploads photo
    -> PhotoUpload: resize to WebP -> uploadPhoto server action -> file saved to data/uploads/
    -> Auto-triggers OCR: POST /api/ocr -> Claude Vision -> auto-fill form fields
  -> User fills form (coffeeName required, all else optional)
  -> User optionally adds new roastery/estate inline via dialog
  -> Submit: handleSubmit()
    -> Checks profileId from useProfile (localStorage)
    -> Builds FormData with all fields + photo URLs as photo_0, photo_1, etc.
    -> Calls createEntry(formData) server action
    -> Server: Zod parse -> insert coffeeEntries -> insert entryPhotos
    -> revalidatePath("/feed")
    -> Client: router.push("/entry/{newId}")
```

### Flow 3: Edit Entry (P0)
```
/entry/[id]/edit
  -> Server: getEntryById(id) + getRoasteries() + getEstates()
  -> If not found: notFound() (404)
  -> Render EntryForm with entry prop (edit mode)
  -> Form pre-populated with existing values
  -> Submit: calls updateEntry(id, formData)
    -> Server: Zod parse -> update coffeeEntries -> delete ALL photos -> re-insert photos
    -> revalidatePath("/feed") + revalidatePath("/entry/${id}")
    -> Client: router.push("/feed")
```

### Flow 4: Delete Entry (P0)
```
/entry/[id] (detail page)
  -> DeleteEntryButton rendered
  -> User clicks trash icon
  -> window.confirm("Delete this entry?")
  -> If confirmed: deleteEntry(id) server action
    -> db.delete(coffeeEntries).where(id)
    -> entry_photos cascade-deleted by FK
    -> revalidatePath("/feed")
  -> Client: router.push("/feed")
```

### Flow 5: Manage Roasteries (P1)
```
/roasteries
  -> Server: getRoasteries()
  -> RoasteryList rendered
  -> Add: button opens Dialog -> name input -> createRoastery -> router.refresh()
  -> Edit: pencil button opens Dialog with name -> updateRoastery -> router.refresh()
  -> Delete: trash button -> deleteRoastery -> router.refresh() (NO confirmation)
```

### Flow 6: Manage Estates (P1)
```
/estates
  -> Server: getEstates()
  -> EstateList rendered
  -> Add: button opens Dialog -> name/location/country/masl -> createEstate -> router.refresh()
  -> Edit: pencil button opens Dialog -> updateEstate -> router.refresh()
  -> Delete: trash button -> deleteEstate -> router.refresh() (NO confirmation)
```

### Flow 7: Filter Feed (P1)
```
/feed?profile=karan&roast=light&roastery=uuid&estate=uuid&search=term
  -> FilterBar reads searchParams
  -> Toggle buttons update URL params via router.push
  -> Server re-fetches getEntries with new filters
  -> All filters AND-combined
  -> Search is LIKE on coffeeName, origin, flavorNotes, notes
```

### Flow 8: OCR Label Scanning (P1)
```
EntryForm -> PhotoUpload -> handleOcr(imageUrl)
  -> POST /api/ocr with { imageUrl: "/api/uploads/filename.webp" }
  -> Server: reads file from disk -> base64 encode -> Claude Vision API
  -> Prompt: extract coffee_name, origin, roast_level, flavor_notes, coffee_weight
  -> Response parsed via JSON regex
  -> Client: auto-fills coffeeName, origin, flavorNotes, coffeeWeight, roastLevel
  -> Toast: "Label scanned! Review the auto-filled fields."
```

---

## 9. Data Flow Diagrams

### Authentication Flow
```
Client sessionStorage("coffeebook-auth") -- password check only
Client localStorage("coffeebook-profile") -- profile persistence
Client cookie("coffeebook-profile") -- synced but unused server-side
NO server-side auth or middleware
```

### Entry Create Data Flow
```
Client FormData
  -> Server Action createEntry()
    -> Zod validation
    -> db.insert(coffeeEntries)
    -> Loop: db.insert(entryPhotos) x N
    -> revalidatePath("/feed")
  -> Client: redirect to /entry/{id}
```

### Photo Upload Data Flow
```
Client: select file
  -> Browser: resize to max 1200px, convert to WebP
  -> Server Action uploadPhoto()
    -> Write to data/uploads/{timestamp}-{random}.webp
    -> Return { url }
  -> Client: add URL to photos array
  -> Client: trigger OCR (handleOcr)
    -> POST /api/ocr
      -> Read file from disk
      -> Claude Vision API
      -> Parse JSON response
    -> Auto-fill form fields
```

---

## 10. Edge Cases & Potential Failure Points

### Security
1. **No server-side authentication**: All API routes and server actions are unprotected. Anyone can call POST /api/ocr, uploadPhoto, createEntry, deleteEntry, etc.
2. **Hardcoded password in client bundle**: `scale@123` is visible in source code
3. **No CSRF protection**: Server actions rely on Next.js built-in CSRF but no custom tokens
4. **No rate limiting**: OCR endpoint uses paid Anthropic API with no throttling
5. **File upload unrestricted**: No size limit, no type validation, no virus scan

### Data Integrity
6. **No transactions**: createEntry inserts entry + photos in separate queries -- crash between them leaves orphaned entry without photos
7. **No ownership validation**: Any profile can edit/delete any other profile's entries
8. **No FK validation on mutations**: profileId, roasteryId, estateId not validated to exist before insert
9. **Orphaned photo files**: deleteEntry cascades DB records but leaves files on disk. updateEntry replaces photo records but old files remain.
10. **No duplicate prevention**: Same roastery/estate name can be created multiple times
11. **SQLite FK enforcement**: SQLite does not enforce FKs by default -- need PRAGMA foreign_keys=ON. Deleting a roastery with entries may silently succeed, leaving entries pointing to nonexistent roastery.

### UI/UX
12. **No loading states for filters**: Clicking filter triggers full page navigation
13. **No search debounce**: Search parameter appears in FilterBar UI but there is no search input visible in the FilterBar component (search filter exists in query but no UI for it)
14. **Photo state bug risk**: PhotoUpload's handleFiles uses closure over `photos` which could be stale during sequential uploads
15. **Roastery/Estate delete without confirmation**: Unlike entry deletion, these have no confirm dialog but can fail if entity is in use
16. **Rating of 0 treated as "no rating"**: `entry.rating != null && entry.rating > 0` means a rating of exactly 0 is hidden

### OCR
17. **JSON parsing fragile**: Uses regex `\{[\s\S]*\}` to extract JSON from Claude response -- could match wrong object if response has multiple JSON blocks
18. **No retry logic**: Single Anthropic API call with no retry on failure
19. **Model availability**: Hardcoded to `claude-sonnet-4-20250514` -- will break if deprecated

### Performance
20. **No pagination**: getEntries returns ALL entries (could grow unbounded)
21. **N+1 photo query**: Photos are fetched in a second query with OR of all entry IDs
22. **No image optimization**: Images served raw from disk, no CDN, no responsive sizes
23. **All pages force-dynamic**: No caching benefits from Next.js

---

## 11. Environment Dependencies

### Required
- `ANTHROPIC_API_KEY` -- Anthropic API key for OCR (Claude Vision)

### Optional
- `TURSO_DATABASE_URL` -- Database URL (defaults to `file:./data/coffeebook.db`)
- `TURSO_AUTH_TOKEN` -- Turso auth token (for remote DB, not needed for local SQLite)

### External Services
- **Anthropic API**: Used for OCR label scanning (Claude claude-sonnet-4-20250514)
- No other external services (no email, no payment, no analytics)

### Infrastructure
- **Local file storage**: `data/uploads/` for photos (not cloud storage)
- **SQLite**: Local file DB (no external DB server needed)
- **Caddy**: Reverse proxy for HTTPS (production)
- **Docker**: Standalone container deployment

---

## 12. Existing Test Infrastructure

**None.** There are no test files, no test framework configured, no `.bru` files, no `backstop.json`, no k6 scripts, no MSW handlers. The project has zero automated tests.

---

## 13. Constants Reference

### PROFILES (hardcoded, 3 users)
| ID | Name | Initials | Color |
|----|------|----------|-------|
| karan | Karan | K | #d4a12a (gold) |
| vidit | Vidit | V | #0e4444 (teal) |
| amar | Amar | A | #76553c (brown) |

### ROAST_LEVELS (4 levels)
| Value | Label | Color |
|-------|-------|-------|
| light | Light | #c4956a |
| medium | Medium | #8b5e3c |
| medium-dark | Medium Dark | #5c3a1e |
| dark | Dark | #2c1810 |

### BREW_TYPES (8 types)
| Value | Label |
|-------|-------|
| espresso | Espresso |
| americano | Americano |
| pour-over | Pour Over |
| french-press | French Press |
| aeropress | AeroPress |
| cold-brew | Cold Brew |
| moka-pot | Moka Pot |
| filter | Filter |

---

## 14. Recommendations for Test Focus Areas

### Must-Test (P0)
1. **Entry CRUD lifecycle**: Create -> View -> Edit -> Delete. This is the core of the app.
2. **Password gate**: Verify password blocks access, correct password allows through, session persists.
3. **Profile selection & persistence**: Profile stored in localStorage, displayed in header, used for entry creation.
4. **Form validation**: coffeeName required, numeric fields accept valid input, invalid input rejected.
5. **Photo upload + OCR**: Upload flow, auto-fill behavior, error handling.

### Should-Test (P1)
6. **Feed filtering**: All 4 filter types (profile, roast, roastery, estate) work correctly, toggle on/off.
7. **Roastery/Estate CRUD**: Create, edit, delete, inline creation from entry form.
8. **Entry detail page**: All fields render correctly, photos display, edit/delete buttons work.
9. **Image serving**: `/api/uploads/[filename]` serves correct content type, handles 404.

### Good-to-Test (P2)
10. **Edge cases**: Empty feed state, entry with no optional fields, very long text fields.
11. **Navigation**: All links work, back buttons, header menu.
12. **Visual regression**: Coffee-themed UI renders correctly across viewports.
13. **Accessibility**: Form labels, color contrast, keyboard navigation.

### Known Issues Worth Verifying
14. Deleting a roastery that is in use by entries (what happens?)
15. Creating an entry with a non-existent profileId (server action behavior)
16. Photo files accumulating on disk after entry deletion
17. Rating of exactly 0.0 display behavior
18. Concurrent photo uploads (stale closure risk)
