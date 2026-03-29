# Coffeebook

Coffee tasting notes webapp for Karan, Vidit & Amar. Self-hosted on WSL2.

## Tech Stack

- **Framework**: Next.js 16 (App Router, standalone output)
- **Database**: SQLite via libsql (`data/coffeebook.db`)
- **ORM**: Drizzle
- **OCR**: Claude Vision API (Anthropic SDK)
- **Photos**: Local disk storage (`data/uploads/`)
- **UI**: Tailwind CSS + shadcn/ui (Subko coffee aesthetic)
- **Fonts**: Alegreya Sans (headings) + IBM Plex Sans (body)

## Commands

```bash
bun run dev          # Dev server
bun run build        # Production build
bun run start        # Production server on :3456
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Run migrations
bun run db:seed      # Seed 3 profiles
bun run db:studio    # Drizzle Studio GUI
```

## Deploy

Self-hosted via Caddy reverse proxy. See `deploy.sh` and `Caddyfile`.

## Env Vars

Only `ANTHROPIC_API_KEY` is required (for OCR). Database is local SQLite - no external service needed.
