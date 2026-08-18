# Masterways CRM

Customer Relationship Management system for Masterways Group of Companies (MRE, MSL, MIA, MHL), built against the CRM Committee blueprint.

**Stack:** Next.js 16 (App Router, TypeScript) &middot; PostgreSQL &middot; Prisma 6 &middot; Tailwind v4 &middot; Radix UI

## Status

**Phase 1 & 2 complete:** project architecture, database schema (all blueprint entities), authentication, role-based access control, dashboard, navigation, user management, departments/business units, roles & permissions, audit log.

Phases 3–9 (stakeholders, leads/pipeline, tickets/SLA, property management, tasks, communications, reports, AI/integrations) are not yet built — see `prisma/schema.prisma`, which already models every entity so those phases don't require migrations rework.

## Getting started

```bash
npm install
cp .env.example .env   # then set DATABASE_URL to a local Postgres database
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

## Demo accounts

Every seeded user shares the password `Masterways@2026`. The login screen has a "Demo accounts" panel listing all 17 role logins (e.g. `victor.mutiso@masterways.co.ke` — ICT Administrator, the only role with full admin access; `grace.wanjiru@masterways.co.ke` — Board of Directors, read-only). See `src/lib/demo-accounts.ts` for the full roster.

## Key scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Create/apply a Prisma migration |
| `npm run db:seed` | Re-seed roles, permissions, org structure and demo users |
| `npm run db:studio` | Open Prisma Studio |

## Architecture notes

- **RBAC is enforced server-side**, not just in the UI: every Server Component, Server Action and Route Handler calls `requirePermission()` / `requirePermissionOrRedirect()` (`src/lib/rbac/guard.ts`) before touching data. The sidebar hides links the user can't use, but that's a UX convenience — the permission check happens again in the data layer regardless.
- **Roles & permissions are database-backed and editable** at `/admin/roles/[roleId]` — the seed script wires up the blueprint's default grants (`src/lib/rbac/permissions.ts`), but admins can adjust them at runtime.
- **External integrations** (Ezen, SACCO Core Banking, SMS/Email/WhatsApp gateways, AI) have placeholder `IntegrationConfig` rows seeded with `status: MOCK` — the schema and admin surface are ready; real API clients get wired in during later phases without a data model change.
- **Audit log** (`src/lib/audit/log.ts`) records every mutating action; visible at `/admin/audit-log` to roles with `audit_logs.view`.
