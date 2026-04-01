# Test Results — Coffeebook E2E Suite

## Summary

| Suite | Total | Passed | Failed | Skipped |
|-------|-------|--------|--------|---------|
| E2E (Playwright) | 65 | 65 | 0 | 0 |
| API (pytest) | — | — | — | — |
| DB (pytest) | — | — | — | — |
| **Total** | **65** | **65** | **0** | **0** |

All 65 E2E tests pass. No API or DB test layer was created — the app uses Server Actions (not REST endpoints), and SQLite is local-only with no external DB to target.

## Test Files & Coverage

| File | Tests | Status | Features Covered |
|------|-------|--------|-----------------|
| `e2e/auth.spec.ts` | 8 | All pass | Password gate, profile selection, logout, profile switching |
| `e2e/entry-create.spec.ts` | 10 | All pass | New entry form, all field types, inline add, validation |
| `e2e/entry-detail.spec.ts` | 5 | All pass | Detail page fields, edit/delete buttons, 404 handling |
| `e2e/entry-edit.spec.ts` | 7 | All pass | Pre-population, field updates, roast/brew type change, clear |
| `e2e/entry-delete.spec.ts` | 4 | All pass | Confirmation dialog, cancel, 404 after delete |
| `e2e/feed.spec.ts` | 12 | All pass | Display, profile/roast/roastery/estate filters, empty state, FAB |
| `e2e/navigation.spec.ts` | 2 | All pass | Header links, logo navigation |
| `e2e/roastery.spec.ts` | 8 | All pass | CRUD, empty state, validation, sort order, FK behavior |
| `e2e/estate.spec.ts` | 8 | All pass | CRUD, empty state, validation, location display, FK behavior |

## App Bugs Discovered

### BUG-001: Logout does not clear sessionStorage password gate
- **Location**: `clearProfile()` function (called by logout)
- **Behavior**: After logout, `sessionStorage.coffeebook-auth` remains set. On next navigation (even to `/`), the password gate does not reappear — instead the profile selector shows immediately because the app finds `coffeebook-auth=true` in sessionStorage.
- **Impact**: Low (tab-scoped; closing and reopening the tab resets it). Users cannot be locked out between sessions.
- **Severity**: Minor UX issue

### BUG-002: Select trigger shows value ID, not display label
- **Location**: `SelectValue` in Base UI Select component (roastery/estate selects on edit form)
- **Behavior**: When editing an entry, the roastery/estate dropdowns show the raw record ID (e.g., `r-subko`) instead of the display name (`Subko`) in the trigger.
- **Impact**: Edit form is confusing — user sees IDs not labels in the dropdowns.
- **Severity**: Medium UX bug

### BUG-003: Form labels have empty `for` attribute
- **Location**: All form labels in entry create/edit forms
- **Behavior**: Label elements render `for=""` instead of a valid input ID. This breaks accessibility (`getByLabel()` doesn't work) and screen readers cannot associate labels with inputs.
- **Impact**: Accessibility — WCAG 2.1 violation (1.3.1 Info and Relationships)
- **Severity**: Medium (accessibility)

### BUG-004: FK constraints enforced — error toast on in-use delete
- **Location**: Roastery and Estate delete actions
- **Behavior**: When a roastery/estate has entries referencing it, the delete fails silently in the UI (no item removal) and shows a toast "Cannot delete — roastery may be in use" / "Cannot delete — estate may be in use". The error message contains "Cannot delete" (lowercase "e" in "error") — the toast does not show the word "error".
- **Impact**: Correct behavior, but UX could be improved with a more descriptive message.
- **Severity**: Minor UX

## Infrastructure Notes

- **Auth**: Dual-layer auth (sessionStorage `coffeebook-auth` + localStorage `coffeebook-profile` + cookie). `storageState` handles cookie + localStorage; `addInitScript` injects sessionStorage on every page navigation.
- **Test DB**: Separate `data/test.db` file. Server must be running with `TURSO_DATABASE_URL=file:./data/test.db`. Tests directly connect to the SQLite file via `@libsql/client` for seed/cleanup operations.
- **Selector strategy**: Base UI Select uses `[data-slot="select-trigger"]` + index-based selection; form inputs use `input[name="fieldName"]`; row buttons use `div.flex.items-center.justify-between` + `span.font-medium` filter.
- **Workers**: 1 (SQLite concurrency limit)
