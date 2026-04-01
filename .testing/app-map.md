# Application Route Map
**Explored**: 2026-03-29 | **Instance**: http://localhost:3456 | **Profile**: Vidit

## Routes Discovered

| # | URL | Page Title | Description | Auth Required |
|---|-----|-----------|-------------|---------------|
| 1 | `/` | Coffeebook | Landing: password gate (sessionStorage) → profile selector (3 users) | No |
| 2 | `/feed` | Coffeebook | Main feed with entry cards, profile + roast filter pills, FAB | Yes (cookie) |
| 3 | `/entry/new` | Coffeebook | Full coffee entry creation form | Yes |
| 4 | `/entry/[id]` | Coffeebook | Entry detail: all fields displayed, edit/delete actions | Yes |
| 5 | `/entry/[id]/edit` | Coffeebook | Entry edit form (identical structure to new, pre-populated) | Yes |
| 6 | `/roasteries` | Coffeebook | Roastery list with add/edit/delete dialog | Yes |
| 7 | `/estates` | Coffeebook | Estate list with add/edit/delete dialog | Yes |

## Navigation Structure

```
Header (sticky):
  [Coffeebook logo] → /feed
  [☰ Hamburger (no aria)] → inline dropdown:
      Roasteries → /roasteries
      Estates    → /estates
  [V Vidit] (read-only avatar display)
  [⬦ Logout (no aria)] → clears profile, → /

Feed Filter Bar (2 rows):
  Row 1 (Profile): All | Karan | Vidit | Amar
  Row 2 (Roast):   All Roasts | Light | Medium | Medium Dark | Dark

FAB (fixed bottom-right, only when entries exist):
  [+] → /entry/new

Entry card → /entry/[id]
Back links → /feed (on all sub-pages)
```

## Auth Flow

1. Visit `/` → see password input
2. Enter "scale@123" → `sessionStorage.setItem('coffeebook-auth', 'true')`
3. Profile selector appears; click a profile
4. `localStorage.setItem('coffeebook-profile', 'vidit')` + cookie set
5. Navigate to `/feed`
6. Cookie `coffeebook-profile` used by Next.js server components to personalize views
7. Logout: clears localStorage + cookie → redirect to `/`
