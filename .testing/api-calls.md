# Observed API Calls
**Captured**: 2026-03-29 | **Instance**: http://localhost:3456

## Application-Level Endpoints

| # | Method | URL Pattern | Status | Page Context | Notes |
|---|--------|------------|--------|-------------|-------|
| 1 | GET | `/` | 200 | Landing | Initial page load |
| 2 | GET | `/feed` | 200 | Feed | Main feed |
| 3 | GET | `/feed?profile=vidit` | 200 | Feed | Profile filter |
| 4 | GET | `/feed?profile=karan` | 200 | Feed | Profile filter (empty result) |
| 5 | GET | `/feed?roast=medium` | 200 | Feed | Roast filter |
| 6 | GET | `/entry/new` | 200 | New entry form | — |
| 7 | POST | `/entry/new` | 200 | New entry form | Server Action — creates entry |
| 8 | GET | `/entry/[id]` | 200 | Entry detail | — |
| 9 | GET | `/entry/[id]/edit` | 200 | Edit form | — |
| 10 | GET | `/roasteries` | 200 | Roasteries | — |
| 11 | GET | `/estates` | 200 | Estates | — |
| 12 | POST | `/api/ocr` | 400 | — | OCR endpoint; expects multipart/form-data with image |
| 13 | GET | `/api/uploads` | 404 | — | Photo upload path not found |

## Next.js RSC (React Server Component) Streaming Calls
All `GET /[page]?_rsc=[hash]` calls returned 200. These are internal Next.js App Router streaming requests — not user-facing API calls. Observed for: `/feed`, `/entry/new`, `/entry/[id]`, `/entry/[id]/edit`, `/roasteries`, `/estates`.

## No External API Calls
No calls to external services observed (Anthropic API not triggered during normal browsing — only on OCR/photo upload).

## Production (https://coffeebook.thescale.in) Status
| Route | Status |
|-------|--------|
| GET / | 200 |
| GET /feed | **500** |
| GET /entry/new | **500** |
| GET /roasteries | **500** |
| GET /estates | **500** |
| POST /cdn-cgi/rum? | 204 (Cloudflare RUM) |

**Production is broken.** All routes except `/` return 500. The Docker container `coffeebook` is not running (`docker ps` confirms). The next-server process at PID 1055 appears to be running under a different container context that is inaccessible.
