# MedSupply Exchange

A B2B multi-vendor marketplace where hospitals/buyers browse medical supplies, compare vendor offers (tiered pricing, MOQ, delivery), submit RFQs, and check out across multiple vendors — with vendor registration and admin approval workflows.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/marketplace run dev` — run the marketplace web frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the database with demo vendors/buyers/products/offers
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Auth: Replit Auth (OIDC) via `@workspace/replit-auth-web`, role assigned at onboarding (buyer/vendor/admin)
- Frontend: React + Vite, wouter router, TanStack Query, shadcn/ui, Plus Jakarta Sans / Space Mono, dark deep-pine/sage theme
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server` — Express API (all routes, auth wiring)
- `artifacts/marketplace` — React/Vite frontend (buyer, vendor, admin pages under `src/pages/`)
- `lib/db` — Drizzle schema (source of truth for DB shape)
- `lib/api-client-react` — generated React Query hooks + Zod schemas (barrel-exported from `src/index.ts` — always import from the package root, never a `/src/generated/...` subpath)
- `lib/replit-auth-web` — shared `useAuth` hook for the web frontend
- `scripts/src/seed.ts` — demo data seeder

## Architecture decisions

- Roles (buyer/vendor/admin) are assigned during a post-login onboarding step, not at Replit Auth login time.
- Vendor offers use tiered pricing (min/max qty → price) rather than a single price per product; buyers compare offers per product.
- Vendor registrations require admin approval before the vendor can list offers.

## Product

- Buyers: browse products, compare vendor offers side-by-side, multi-vendor cart & checkout, order history, submit/view RFQs.
- Vendors: manage product offers with tiered pricing, view/fulfill orders, respond to RFQs, vendor dashboard stats.
- Admins: approve/reject/suspend vendor & buyer companies, admin dashboard stats.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Any new frontend app entry point must explicitly wrap `<App />` in `QueryClientProvider` — it's not scaffolded by default, and a missing provider only fails at runtime (not typecheck), on any route using generated query hooks.
- New `lib/*` packages added to root `tsconfig.json` references must set `composite: true` / `declarationMap` / `emitDeclarationOnly`, or `tsc --build` fails with TS6306.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
