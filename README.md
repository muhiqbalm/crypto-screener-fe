# BMTM MoonTrade — frontend

Next.js 16 (App Router, Turbopack) dashboard for the BMTM crypto screener,
trading, and Strategy Lab.

## Scripts

```bash
npm run dev       # local dev server on :3000
npm run build     # production build
npm run lint      # eslint
npm run test:run  # vitest (single run)
```

## Design system

See [DESIGN.md](DESIGN.md) for tokens, layout primitives, shared components,
number formatting and how to add a page to the navigation.

## Environment

Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_USE_MOCK_DATA=true` to
serve data from `lib/mocks/` instead of the backend.

## Deploy

Production runs under PM2 (`bmtm-web`) on the VPS via `deploy.sh`
(`git pull`, `npm ci`, `npm run build`, `pm2 restart`). The `Dockerfile` /
`docker-compose.yml` are an alternative standalone build.
