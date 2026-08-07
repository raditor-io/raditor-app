# raditor-app

The Raditor platform: an agentic CMS. Editor agents watch your GitHub sources
for product signals, turn them into evidence-backed content suggestions, and
publish search- and AI-answer-ready static content into your websites via
pull requests.

- **Free software**: AGPL-3.0, self-hostable
- **Stack**: Next.js on Vercel, Supabase (Postgres + Auth + Queues), Venice.ai
- **App package**: [`app/`](app/) (`@raditor/app`), dev server on port 4000

## Development

```bash
pnpm install
cp app/.env.example app/.env.local   # fill in values
pnpm dev:app                          # http://localhost:4000
pnpm test:app && pnpm typecheck:app
```

Migrations live in `supabase/migrations/` and are applied with the monorepo
`sb` wrapper (`sb platform-dev db push`).

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
