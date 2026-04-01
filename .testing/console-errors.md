# Console Errors & Warnings
**Captured**: 2026-03-29

## Local Instance (http://localhost:3456)

**Total console messages: 0**
**Errors: 0**
**Warnings: 0**

The local app runs cleanly with no console errors or warnings.

---

## Production (https://coffeebook.thescale.in)

| # | Level | Message | Page |
|---|-------|---------|------|
| 1 | ERROR | Failed to load resource: the server responded with a status of 500 () | /feed |
| 2 | ERROR | Failed to load resource: the server responded with a status of 500 () | /feed |
| 3 | ERROR | Failed to load resource: the server responded with a status of 500 () | /feed |
| 4 | ERROR | Failed to load resource: the server responded with a status of 500 () | /feed (retried) |
| 5 | ERROR | Failed to load resource: the server responded with a status of 500 () | /feed?profile=vidit |
| 6 | ERROR | Failed to load resource: the server responded with a status of 500 () | /feed?profile=vidit |
| 7 | ERROR | Failed to load resource: the server responded with a status of 500 () | /entry/new |
| 8 | ERROR | Failed to load resource: the server responded with a status of 500 () | /roasteries |
| 9 | ERROR | Failed to load resource: the server responded with a status of 500 () | /estates |

**Root cause**: Production Next.js server returns HTTP 500 with React error digest codes (1961166528, 4006105753, 4003379039, 2715304678). The `coffeebook` Docker container is not running. The database connection (`file:./data/coffeebook.db` or Turso) is failing server-side.
