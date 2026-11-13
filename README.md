# IT Helpdesk

A self-hosted IT helpdesk: people sign in with your organisation's single
sign-on, open tickets, and follow them to a fix. Agents work a shared queue
with reply and fix targets; admins manage teams, categories and targets.

**Stack:** Next.js 16 (App Router, React 19, built with Turbopack) · Tailwind
CSS 4 · shadcn/ui components on Radix UI · Lucide icons · PostgreSQL 17 with
Drizzle ORM · OpenID Connect sign-in · Docker Compose.

## What's in it

| Area | What it does |
|---|---|
| Tickets | Subject, description, category, priority, file attachments (5 × 10 MB). Public replies and agent-only internal notes. Full history of status, priority, assignee, team and category changes. |
| Roles | **Requester** (own tickets only), **agent** (all tickets, knowledge base, reports), **admin** (plus Settings). |
| Queue | Views for all open, assigned to me, unassigned, my teams, overdue. Filter by status, priority, category, assignee; search; sort by due date. |
| Targets (SLA) | First-reply and fix targets per priority, counted in business hours. Tickets show time left, overdue, met or missed. |
| Email | Sent on new tickets, replies, assignment and status changes. Optional. |
| Reports | Created vs. resolved per day, by category, by agent, median reply and fix times, share fixed within target. 7/30/90 days. |
| Knowledge base | Markdown articles with drafts, categories and search. Agents write; everyone reads published articles. |

## Deploy on Debian 13 with Docker

1. **Install Docker Engine and the Compose plugin** — follow
   <https://docs.docker.com/engine/install/debian/>.

2. **Get the code and create your settings file.**

   ```sh
   git clone https://github.com/boelder-mws/mws-helpdesk.git
   cd mws-helpdesk
   cp .env.example .env
   ```

3. **Fill in `.env`.** The file explains each setting. The required ones:

   - `APP_URL` — the address people will use, e.g. `https://helpdesk.example.org`
   - `POSTGRES_PASSWORD` — generate with `openssl rand -hex 24`
   - `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` — from your identity provider (next section)
   - `ADMIN_EMAILS` — your own email, so your first sign-in makes you an admin

4. **Start it.**

   ```sh
   # With built-in HTTPS (Caddy gets a Let's Encrypt certificate for HELPDESK_DOMAIN):
   docker compose --profile tls up -d --build

   # Or without, if a reverse proxy handles HTTPS (see "Behind a reverse proxy" below):
   docker compose up -d --build
   ```

   The database schema is created and upgraded automatically each time the
   app starts. Check on it with `docker compose ps` and
   `docker compose logs -f app`.

5. **Sign in**, then open **Settings** to promote your agents, create teams,
   point categories at teams, and adjust targets and business hours.

### Register the helpdesk with your identity provider

Create a *web application* / *confidential client* with this redirect URI:

```
<APP_URL>/auth/callback
```

| Provider | `OIDC_ISSUER` | Notes |
|---|---|---|
| Microsoft Entra ID | `https://login.microsoftonline.com/<tenant-id>/v2.0` | App registrations → New registration → Web redirect URI. Create a client secret. |
| Google Workspace | `https://accounts.google.com` | OAuth client of type "Web application". Set `OIDC_ALLOWED_DOMAINS` to your domain, or make the consent screen "Internal". |
| Keycloak | `https://<host>/realms/<realm>` | Client with "Client authentication" on. |

Any standards-compliant OpenID Connect provider works (authorization code
flow with PKCE). To set roles from directory groups instead of by hand, see
`OIDC_GROUPS_CLAIM` in `.env.example`.

### Behind a reverse proxy

Leave out `--profile tls`. Set `APP_URL` to the public https address. If the
proxy runs on this server, forward to `127.0.0.1:3000`. If it runs on another
machine, set `APP_BIND` in `.env` to this server's internal IP address and
forward to `<that IP>:3000`.

Docker publishes ports around `ufw`, so a `ufw` rule alone will not keep other
machines off port 3000. Binding to the internal IP (not `0.0.0.0`) is the
simplest safeguard; restrict it further with the `DOCKER-USER` firewall chain
if you need to.

**Nginx Proxy Manager:** add a Proxy Host with the public domain name, scheme
`http`, forward host `<APP_BIND address>`, port `3000`. Turn on **Block Common
Exploits**. On the **SSL** tab request a certificate and turn on **Force SSL**
and **HTTP/2**. Websockets are not needed. If attachments fail with a
"413 Request Entity Too Large" error, add `client_max_body_size 60m;` on the
**Advanced** tab.

For other proxies, pass the original host through, e.g. nginx:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    client_max_body_size 30m;   # ticket attachments
}
```

## Day-to-day operations

```sh
# Update to a new version
git pull && docker compose --profile tls up -d --build

# Back up the database
docker compose exec -T db pg_dump -U helpdesk helpdesk | gzip > helpdesk-$(date +%F).sql.gz

# Back up attachments
docker run --rm -v mws-helpdesk_uploads:/data:ro -v "$PWD":/backup debian:13-slim \
  tar czf /backup/uploads-$(date +%F).tar.gz -C /data .

# Restore the database into an empty stack
gunzip -c helpdesk-2026-01-01.sql.gz | docker compose exec -T db psql -U helpdesk helpdesk
```

Data lives in two Docker volumes: `db-data` (PostgreSQL) and `uploads`
(attachments). `docker compose down` keeps them; `down -v` deletes them.
The volume name prefix (`mws-helpdesk_`) is the folder name of the checkout.

## How a few things behave

- **First admin.** Anyone in `ADMIN_EMAILS` becomes an admin at sign-in.
  Everyone else starts as a requester until an admin changes their role.
- **Opening a ticket for someone.** Agents can enter another person's email
  on the new-ticket form. If that person has never signed in, a placeholder
  account is created and linked the first time they do.
- **Targets.** Due times are set when a ticket is created (and recalculated
  if its priority changes). Changing targets or hours in Settings affects
  new tickets only. The clock does not pause while a ticket is waiting on
  the requester.
- **Reopening.** A requester's reply to a resolved or waiting ticket puts it
  back to Open. Closed tickets can't be replied to by the requester.
- **Email.** With `SMTP_HOST` empty, no email is sent and nothing else
  changes. New-ticket emails go to the members of the ticket's team, or to
  all agents and admins if it has no team.
- **Sign-out** ends the helpdesk session only, not the identity provider's.

## Versioning and releases

Versions follow [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.
While the major number is 0 the app is pre-1.0; the plan is to release 1.0.0
once it has been in daily use.

| Bump | When | What you do when upgrading |
|---|---|---|
| **MAJOR** | A change that needs action from you: a renamed or removed `.env` setting, a changed deployment layout, a database change that can't be undone | Read the changelog entry first, then follow its steps |
| **MINOR** | New features that work without any change on your side | Pull and rebuild |
| **PATCH** | Bug fixes and security updates only | Pull and rebuild |

Every release is a git tag (`v0.1.0`) and a section in `CHANGELOG.md`. The
version appears in the account menu in the app and in `/api/health`.

**Deploying a release.** Run released versions rather than whatever is on `main`:

```sh
git fetch --tags
git checkout v0.2.0
docker compose up -d --build
```

To follow the newest release later, `git fetch --tags` and check out the new
tag. (`git checkout main && git pull` gets unreleased work.)

**Upgrading safely.** Database changes are applied automatically at start-up
and only move forward. There is no downgrade, so back up first (see
*Day-to-day operations*) and, if an upgrade goes wrong, restore the backup and
check out the previous tag.

**Cutting a release** (maintainers). Add the changes under `## [Unreleased]`
in `CHANGELOG.md` as you work. To release:

```sh
git checkout main && git pull
# Move the Unreleased entries under a new "## [X.Y.Z] - date" heading, commit.
npm version minor        # or patch / major: updates package.json and the lockfile,
                         # commits "X.Y.Z" and creates the tag vX.Y.Z
git push origin main --follow-tags
```

Then, on GitHub, open **Releases → Draft a new release**, choose the tag, and
paste the changelog section as the notes.

## Development

```sh
npm install
# PostgreSQL for development:
docker run -d --name helpdesk-dev-db -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=helpdesk -p 5432:5432 postgres:17
# .env.local: DATABASE_URL=postgres://postgres:dev@localhost:5432/helpdesk, APP_URL=http://localhost:3000, OIDC_* …
npm run dev          # Next.js dev server (Turbopack)
npm run build        # production build
npm run lint && npm run typecheck
npm run db:generate  # after editing src/db/schema.ts: writes a migration to drizzle/
```

Layout:

```
src/app/(app)/      signed-in screens: dashboard, tickets, kb, reports, admin
src/app/auth/       OIDC login, callback, logout
src/components/ui/  shadcn/ui-style components (Radix primitives + Tailwind)
src/db/             Drizzle schema, connection, start-up migration
src/lib/            auth, SLA maths, email, notifications, queries
drizzle/            SQL migrations
```

`components.json` is set up, so more shadcn/ui components can be added with
`npx shadcn@latest add <name>`.
