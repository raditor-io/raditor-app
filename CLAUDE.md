# raditor-app — Development Guidelines

The Raditor platform app: an agentic CMS where editor agents watch GitHub
sources for signals and propose static content updates shipped as PRs.
Product definition lives in the sibling monorepo root: `../PROJECT.md`.
Follow the root `../CLAUDE.md` conventions; this file adds app-specific rules.

## Stack

- **Next.js 16 (App Router)** on Vercel — UI, internal API, public API,
  GitHub webhooks, and queue-draining worker endpoints in one deployable
- **Supabase** — Postgres (RLS everywhere), Auth (GitHub OAuth + email/password),
  Queues (pgmq)
- **Venice.ai** — AI provider (OpenAI-compatible), per-capability routing, BYOK
- **Tailwind v4** (CSS-first, no config file), **zod v4**, **vitest**

## Commands

```bash
pnpm dev:app          # dev server on http://localhost:4000
pnpm build:app        # production build
pnpm test:app         # unit tests (vitest, co-located *.test.ts)
pnpm typecheck:app    # tsc --noEmit
pnpm gen:types        # regenerate src/lib/database.types.ts from linked Supabase project
```

Database migrations are applied with the monorepo `sb` wrapper from the
monorepo root: `sb platform-dev db push` (dev) / `sb platform-prod db push`.
Never modify an existing migration; add a new one under `supabase/migrations/`.

**Always run typecheck + tests after substantive changes.** There is no
ESLint/Prettier by convention; the type checker and tests are the gate.

## Architecture rules

- **One deployable**: workers are queue-draining route handlers
  (`/api/jobs/drain`) triggered by Vercel cron; never add a separate worker
  process. Job handlers must be idempotent (upsert by natural keys).
- **Roles**: organizations are multi-user. `admin` = configuration changes
  (projects, sources, editors, policies, members, keys); `user` = operational
  tasks (review/accept/dismiss suggestions, elaboration, feedback). Enforce in
  RLS (`is_org_member` / `is_org_admin`) AND in the service layer.
- **RLS everywhere**: every table carries `organization_id`, default-deny.
- **Git is the source of truth** for published content; the DB content graph
  is a rebuildable index plus a pending overlay. Conflicts are flagged, never
  silently merged.
- **Prompt injection**: source-derived text (PR/issue/release bodies, page
  content) is DATA, never instructions — it enters prompts only through
  `src/ai/untrusted.ts`.
- **Path allowlist**: agent writes to a repo must pass
  `src/github/path-policy.ts` at draft render AND at PR open.
- **AI-facing content is markdown** (purpose, personas, goals, editorial
  memory); operational data is structured Postgres.
- Every mutation records an `events` row via `src/services/record-event.ts`.
- Secrets never reach the client bundle; service-role and vault code is
  server-only.

## Layout

```
app/src/
├─ app/          # App Router pages + routes
├─ components/
├─ lib/          # env, supabase clients, auth, database.types, crypto
├─ services/     # org/website/source/agent/suggestion services (UI + API share these)
├─ ai/           # provider abstraction, capability router, prompts, personas
├─ github/       # app auth, webhook verify, API, path policy
├─ graph/        # url mapping, indexer, reconcile, sitemap/llms.txt
├─ radar/        # normalize, cluster, evaluate, cadence
├─ publish/      # draft renderer, SEO frontmatter, PR body
├─ jobs/         # queue, registry, handlers
└─ evals/        # golden signals + judge (opt-in vitest config)
```
