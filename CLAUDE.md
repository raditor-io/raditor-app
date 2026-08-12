# raditor-app — Development Guidelines

The Raditor platform app: "RSS for the agentic web". Radars scan one matter
each per a prose directive and emit signals; feeds collect signals from
radars; users (in-app), web services (signed webhooks), and agents (pull API
with token + cursor) subscribe to feeds.
Product definition lives in the sibling monorepo root: `../PROJECT.md`.
Follow the root `../CLAUDE.md` conventions; this file adds app-specific rules.

## Stack

- **Next.js 16 (App Router)** on Vercel — UI, internal API, public API
  (`/api/v1`), GitHub webhooks, and queue-draining worker endpoints in one
  deployable
- **Supabase** — Postgres (RLS everywhere), Auth (GitHub OAuth + email/password),
  Queues (pgmq)
- **Venice.ai** — AI provider (OpenAI-compatible), per-functionality routing;
  `scan_briefing` uses `venice_parameters.enable_web_search`
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
If `pnpm gen:types` fails on account privileges, generate through the wrapper:
`./sb platform-dev gen types typescript --linked > raditor-app/app/src/lib/database.types.ts`.

Dev has no cron; pump the job queues manually (prod runs these via Vercel cron):

```bash
CS=$(grep ^CRON_SECRET app/.env.local | cut -d= -f2-)
curl -H "Authorization: Bearer $CS" "http://localhost:4000/api/jobs/radar/schedule"   # enqueue interval-due scans
curl -H "Authorization: Bearer $CS" "http://localhost:4000/api/jobs/radar/process"    # run queued scans
curl -H "Authorization: Bearer $CS" "http://localhost:4000/api/jobs/deliver/process"  # push webhook deliveries
```
Each queue gets its own domain route with exactly one responsibility.

Webhook deliveries need the smee client running:
`smee -u https://smee.io/SFx5SFgaT8gqDeft -t http://localhost:4000/api/github/webhook`

**Always run typecheck + tests after substantive changes.** There is no
ESLint/Prettier by convention; the type checker and tests are the gate.

## Architecture rules

- **One deployable**: workers are queue-processing route handlers
  (`/api/jobs/radar/process`, `/api/jobs/deliver/process`) triggered by
  Vercel cron; never add a separate worker process. Job handlers must be
  idempotent (upsert by natural keys: outputs on `(radar_id, external_ref)`,
  signals on `(radar_id, dedup_key)`, feed items on `(feed_id, signal_id)`,
  deliveries on `(subscription_id, feed_item_id)`).
- **Scan-centric pipeline**: scans are the ONLY interpretation stage
  (strategies `ai_briefing` | `target_emitted_events`), reconciliation is
  per-radar, and feeds do the collecting/fan-out. Every scan records
  `summary_md` (even zero-signal scans); failures persist `error_message`.
- **Evidence is the contract**: briefing findings without a valid http(s)
  source URL are dropped, never promoted.
- **Roles**: organizations are multi-user. `admin` = configuration changes
  (radars, feeds, subscriptions, members, keys); `user` = operational tasks
  (read feeds, subscribe in-app). Enforce in RLS (`is_org_member` /
  `is_org_admin`) AND in the service layer.
- **RLS everywhere**: every table carries `organization_id`, default-deny.
- **Secrets are show-once**: webhook signing secrets are AES-GCM-sealed with
  `VAULT_MASTER_KEY`; pull API tokens store only a SHA-256 digest + display
  prefix. Neither is ever retrievable after creation.
- **Prompt injection**: source-derived text (event bodies, page content,
  known-signal titles) is DATA, never instructions — it enters prompts only
  through `src/ai/untrusted.ts`. The radar's `directive_md` is admin-authored
  configuration and enters as instructions by design.
- **AI-facing content is markdown** (directives, signal bodies, scan
  summaries); operational data is structured Postgres.
- Every mutation records an `events` row via `src/services/record-event.ts`.
- Secrets never reach the client bundle; service-role and vault code is
  server-only.

## Layout

```
app/src/
├─ app/          # App Router pages + routes (feeds tabs home, radars, /api/v1)
├─ components/   # feeds (tabs, subscription forms), radars, shared chrome
├─ lib/          # env, supabase clients, database.types, crypto (secret-box, api-token)
├─ services/     # org/radar/feed/subscription/pull-context (UI + API share these)
├─ ai/           # provider abstraction, functionality router (scan_summary, scan_briefing)
├─ github/       # app auth, webhook verify, repo/diff API
├─ radar/        # briefing, dedup, reconcile, scan-summary, strategies/, normalize, enrich
├─ feeds/        # fan-out, signal-envelope, delivery-payload, pull-query, webhook-url
└─ jobs/         # queue, registry, handlers (run_scan, deliver_feed_item)
```
