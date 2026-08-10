# GitHub App setup

Raditor connects to GitHub through a GitHub App (Vercel-style connect flow:
install the app, pick repos, Raditor stores the installation and mints
installation tokens server-side). Two registrations exist: **Raditor** (prod)
and **Raditor Dev** (webhook via a tunnel to localhost).

## Configuration (both apps)

| Setting | Value |
|---|---|
| Permissions | Contents: read and write, Pull requests: read and write, Issues: read only, Metadata: read only |
| Subscribed events | `push`, `release`, `pull_request`, `issues` (installation events are always delivered) |
| Webhook URL | `https://<app-domain>/api/github/webhook` (dev: smee.io channel forwarding to localhost) |
| Setup URL | `https://<app-domain>/api/github/setup`, with "Redirect on update" enabled |
| Public | prod: yes (anyone can install), dev: no |

## Creating via manifest (recommended)

GitHub's [app manifest flow](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest)
preconfigures everything in one click:

1. Open the launcher HTML (a form posting the manifest to
   `https://github.com/organizations/raditor-io/settings/apps/new`) and submit.
2. GitHub asks to confirm the app name, then redirects to the manifest's
   `redirect_url` with a one-time `?code=` (valid 1 hour).
3. Exchange the code (no auth needed):
   `curl -X POST https://api.github.com/app-manifests/<code>/conversions`
   The response contains `id`, `slug`, `pem` (private key), `webhook_secret`,
   and client credentials in one payload.

## Environment variables

From the conversion response, per environment:

```
GITHUB_APP_ID=            # "id"
GITHUB_APP_SLUG=          # "slug" (install URL: github.com/apps/<slug>)
GITHUB_APP_PRIVATE_KEY=   # "pem" (keep newlines; quote or base64 per host)
GITHUB_APP_WEBHOOK_SECRET=# "webhook_secret"
```

## Dev webhook forwarding

The dev app's webhook points at a smee.io channel. Forward it to the local
dev server while working:

```bash
npx smee -u https://smee.io/<channel> -t http://localhost:4000/api/github/webhook
```

Webhook deliveries can be inspected and redelivered on the smee channel page
and under the app's Advanced tab on GitHub.
