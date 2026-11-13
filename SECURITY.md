# Security

## Reporting a vulnerability

Please don't open a public issue. In this repository choose
**Security → Report a vulnerability** to send a private report, or tell the
IT department that runs your copy of the helpdesk. Include what you did,
what you expected, and what happened.

## Supported versions

Only the latest release gets fixes. See [CHANGELOG.md](CHANGELOG.md).

## How it is kept patched

Dependabot alerts and updates, a daily vulnerability scan in CI, and a
weekly rebuild of the container are described in the README under
"Security and updates".

## Design notes

- Sign-in is by OpenID Connect only; the app stores no passwords. Sessions
  are random tokens kept as SHA-256 hashes in the database.
- Requesters can only see their own tickets; internal notes and knowledge
  base drafts are never shown to them. Settings and ticket deletion are for
  admins only.
- Uploaded files are served through the app after a permission check, with
  `nosniff`. The public logo is served sandboxed, and SVGs containing
  scripts are refused.
- The container runs unprivileged on a read-only filesystem.
