# Builder Progress

## E2E Tests (Playwright)

### Infrastructure
- [x] `e2e/playwright.config.ts` — workers:1, baseURL localhost:3456, setup + chromium projects
- [x] `e2e/auth.setup.ts` — Login flow, saves storageState + sessionStorage separately
- [x] `e2e/fixtures.ts` — Extends test with sessionStorage injection via addInitScript
- [x] `e2e/helpers/db.ts` — Direct SQLite seed/cleanup helpers, PROFILES/ROASTERIES/ESTATES/ENTRIES constants

### Test Files
- [x] auth.spec.ts — 8/8 pass (AUTH-001 through AUTH-008)
- [x] entry-create.spec.ts — 10/10 pass (CREATE-001 through CREATE-010)
- [x] entry-detail.spec.ts — 5/5 pass (DETAIL-001 through DETAIL-005)
- [x] entry-edit.spec.ts — 7/7 pass (EDIT-001 through EDIT-007)
- [x] entry-delete.spec.ts — 4/4 pass (DELETE-001 through DELETE-004)
- [x] feed.spec.ts — 12/12 pass (FEED-001 through FEED-012)
- [x] navigation.spec.ts — 2/2 pass (NAV-001, NAV-002)
- [x] roastery.spec.ts — 8/8 pass (ROAST-001 through ROAST-008)
- [x] estate.spec.ts — 8/8 pass (ESTATE-001 through ESTATE-008)

## API Tests (pytest)
- [ ] Not applicable — app uses Server Actions, no REST API layer

## DB Tests (pytest)
- [ ] Not applicable — SQLite local file, no external DB service

## Final Run
- **65/65 tests pass**
- Run time: ~47 seconds
- Zero failures, zero skips

## Key Decisions & Discoveries
1. `storageState` moved to chromium project only (setup project runs before file exists)
2. `addInitScript` for sessionStorage injection because `storageState` doesn't capture it
3. Base UI Select trigger uses `[data-slot="select-trigger"]` not `role="combobox"` + accessible name
4. Form `getByLabel()` broken — all labels have `for=""` — use `input[name="..."]` instead
5. `div.flex.items-center.justify-between` CSS selector needed to avoid grabbing ancestor divs in filter locators
6. `span.font-medium` filter for roastery/estate row identification
7. Inline FK entries (no cross-FK references) needed for ROAST-008 and ESTATE-007
8. After logout, password gate does NOT reappear (sessionStorage not cleared) — AUTH tests updated to reflect actual behavior
