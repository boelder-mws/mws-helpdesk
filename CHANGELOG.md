# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Security automation: Dependabot for npm packages, Docker images and GitHub Actions; a CI workflow (type check, lint, build, `npm audit`, Docker build and start-up check, Trivy image scan) that also runs daily; an optional CodeQL workflow; `SECURITY.md`.
- `scripts/update.sh` pulls fresh base images, rebuilds and restarts the stack, and waits for it to be healthy. The README describes a weekly cron job for it, and host patching with `unattended-upgrades`.

### Changed
- The app container now runs with a read-only filesystem, no Linux capabilities and `no-new-privileges`. Its image installs pending OS security updates when built and no longer includes npm.

## [0.2.0] - 2026-11-13

### Added
- Branding: admins can set the name, logo, accent colour and menu/sign-in panel colour under Settings → Branding, with a live light/dark preview. Text colours, hover states and dark mode are worked out from the two colours; accents too light for white button text are refused. The logo (PNG, JPEG, GIF, WebP or SVG, up to 1 MB) is shown in the menu, on the sign-in page and as the browser-tab icon; the name and accent colour are also used in emails. Stored in the `uploads` volume; "Reset to defaults" restores the original look.
- Admins can permanently delete a ticket from its page, after a confirmation. This removes its replies, internal notes, history and attachment files, and is recorded in the server log.

### Changed
- Email: the connection to the mail server is checked at start-up and the result is logged; each message sent is logged; connection attempts give up after 15 seconds.

## [0.1.0] - 2026-11-13

First release.

### Added
- Ticketing: create, assign, reply, internal notes, status/priority/team/category changes with history, attachments.
- Roles: requester, agent and admin; sign-in with OpenID Connect (tested for Google Workspace).
- Queue views, filters, search, and a dashboard for agents.
- First-reply and fix targets per priority, counted in business hours.
- Email notifications over SMTP (optional).
- Reports: tickets created and resolved per day, by category and by agent, median times.
- Knowledge base with Markdown articles, drafts and search.
- Settings for people, teams, categories, targets and business hours.
- Docker Compose deployment (app, PostgreSQL, optional Caddy) with automatic database migrations.
- Version number shown in the account menu and in `/api/health`.
- `APP_BIND` setting so a reverse proxy on another server (such as Nginx Proxy Manager) can reach the app.

[Unreleased]: https://github.com/boelder-mws/mws-helpdesk/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/boelder-mws/mws-helpdesk/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/boelder-mws/mws-helpdesk/releases/tag/v0.1.0
