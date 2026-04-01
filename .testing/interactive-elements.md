# Interactive Elements
**Explored**: 2026-03-29 | **App**: Coffeebook

---

## Forms

### New Entry Form (`/entry/new`)

**Summary**: Long-scroll form with 5 sections. Only `coffeeName` is required. Submitted via Next.js Server Action (POST to page URL).

#### Section 1: Photo
| Element | Type | Behavior |
|---------|------|---------|
| "Add Photo" button | `<button type="button">` | Triggers hidden `<input type="file" accept="image/*" capture="environment" multiple>` |

#### Section 2: Coffee
| Field | Element | Name | Placeholder | Required |
|-------|---------|------|-------------|---------|
| NAME | `input` text | `coffeeName` | "e.g., Bili hu, Naivo, Half Light" | Yes |
| ROASTERY | shadcn Select combobox | — | "Select roastery" | No |
| + (add roastery) | icon button | — | — | — |
| ESTATE | shadcn Select combobox | — | "Select estate" | No |
| + (add estate) | icon button | — | — | — |

#### Section 3: Roast Level (mutually exclusive toggle buttons)
`Light` | `Medium` | `Medium Dark` | `Dark`

#### Section 4: Brew Type (mutually exclusive toggle buttons)
`Espresso` | `Americano` | `Pour Over` | `French Press` | `AeroPress` | `Cold Brew` | `Moka Pot` | `Filter`

#### Section 5: Brewing
| Field | Element | Name | Placeholder | Unit |
|-------|---------|------|-------------|------|
| BEAN WEIGHT | `input[type=number]` | `coffeeWeight` | "16" | g |
| SHOT WEIGHT | `input[type=number]` | `shotWeight` | "36" | g |
| TIME | `input[type=number]` | `brewTime` | "25" | s |
| GRIND SIZE | `input` text | `grindSize` | "4-5" | — |
| GRINDER | `input` text | `grinderType` | "e.g., Niche Zero, Baratza Encore" | — |

#### Section 6: Tasting
| Field | Element | Name | Placeholder |
|-------|---------|------|-------------|
| FLAVOR NOTES | `input` text | `flavorNotes` | "e.g., peanut butter, chocolate, citrus" |
| TASTE NOTES | `textarea` | `tasteNotes` | "How did this brew taste?" |
| RATING | `input[type=range]` min=0 max=10 | — | — |
| Clear (rating) | `<button type="button">Clear</button>` | — | Resets slider to 0 |
| NOTES | `textarea` | `notes` | "Your thoughts on this coffee..." |

**Submit**: `<button type="submit">Save Entry</button>`

**On success**: Toast "Entry saved!" + displays entry card inline, URL stays `/entry/new` briefly then shows detail.

---

### Edit Entry Form (`/entry/[id]/edit`)

Identical to New Entry Form with:
- Heading: "Edit Entry"
- Fields pre-populated with existing values
- Rating shows "X.X/10" current value display
- Submit button: `<button type="submit">Update Entry</button>`

---

### Add Roastery Dialog (`/roasteries`)

Triggered by `<button>Add Roastery</button>`.

| Field | Element | Placeholder | Required |
|-------|---------|-------------|---------|
| NAME | `input` text | "e.g., Subko, Blue Tokai, Third Wave" | Yes |

**Buttons**: `Add` (disabled until name filled) | `Close`

---

### Add Estate Dialog (`/estates`)

Triggered by `<button>Add Estate</button>`.

| Field | Element | Placeholder | Required |
|-------|---------|-------------|---------|
| NAME | `input` text | "e.g., Moolay Estate, Kerehaklu" | Yes |
| LOCATION | `input` text | "e.g., Coorg, Karnataka" | No |
| COUNTRY | `input` text | "e.g., India" | No |
| ALTITUDE (MASL) | `input[type=number]` | "e.g., 1200" | No |

**Buttons**: `Add` (disabled until name filled) | `Close`

---

## Buttons Summary

### Header Bar (all pages post-auth)
| Button | Element | Aria Label | Behavior |
|--------|---------|-----------|---------|
| Hamburger menu | `<button>` + lucide-menu icon | NONE | Shows inline nav dropdown (Roasteries, Estates links) |
| Logout | `<button>` + lucide-log-out icon | NONE | Clears localStorage + cookie, redirects to `/` |

### Feed Page (`/feed`)
| Button | Type | Behavior |
|--------|------|---------|
| All (profile) | pill button | Removes `profile` URL param, shows all profiles |
| Karan | pill button | Sets `?profile=karan` |
| Vidit | pill button | Sets `?profile=vidit` |
| Amar | pill button | Sets `?profile=amar` |
| All Roasts | pill button | Removes `roast` URL param |
| Light | pill button | Sets `?roast=light` |
| Medium | pill button | Sets `?roast=medium` |
| Medium Dark | pill button | Sets `?roast=medium-dark` |
| Dark | pill button | Sets `?roast=dark` |
| FAB [+] | `<a href="/entry/new">` | Navigate to new entry form |

### Entry Detail Page (`/entry/[id]`)
| Button | Element | Aria Label | Behavior |
|--------|---------|-----------|---------|
| Back (← Feed) | `<a href="/feed">` | — | Navigate to /feed |
| Edit (pencil icon) | `<a href="/entry/[id]/edit">` | NONE | Navigate to edit form |
| Delete (trash icon) | `<button>` | NONE | Delete entry (server action), redirect to /feed |

### Roasteries Page (`/roasteries`)
| Button | Behavior |
|--------|---------|
| Add Roastery | Opens "Add Roastery" modal dialog |
| Edit (per row) | Opens pre-filled edit dialog |
| Delete (per row) | Deletes roastery (server action) |

### Estates Page (`/estates`)
| Button | Behavior |
|--------|---------|
| Add Estate | Opens "Add Estate" modal dialog |
| Edit (per row) | Opens pre-filled edit dialog |
| Delete (per row) | Deletes estate (server action) |

---

## Validation Behaviors

| Form | Field | Validation | Error Message |
|------|-------|-----------|---------------|
| New/Edit Entry | coffeeName | Required | HTML5 native validation (browser tooltip) |
| Add Roastery | name | Required — Add button disabled until filled | Button disabled state |
| Add Estate | name | Required — Add button disabled until filled | Button disabled state |
| Password Gate | PIN | Client-side check against hardcoded "scale@123" | "Wrong password" text appears below form |

---

## Notable Findings

1. **No Roastery/Estate pickers were tested with actual data** — the local DB had no roasteries or estates, so the combobox dropdowns showed empty states.
2. **OCR feature** — The "Add Photo" button on the entry form likely triggers OCR via `/api/ocr`. Could not test (requires an actual image file upload in headless browser).
3. **Rating slider** — The Clear button exists on both new and edit forms. The rating display shows current value as "X.X/10" in the edit form.
4. **Search filter** — The URL accepts `?search=` but no search input was visible in the UI FilterBar. May be hidden or not yet implemented.
5. **Roastery/Estate inline add** — On the entry form, there are `+` icon buttons next to the ROASTERY and ESTATE dropdowns. These likely open a quick-add dialog inline.
