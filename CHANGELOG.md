# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/boelder-mws/mws-helpdesk/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/boelder-mws/mws-helpdesk/releases/tag/v0.1.0
