#!/usr/bin/env bash
# Rebuild and restart the helpdesk with the newest base images and OS patches.
#
#   scripts/update.sh          rebuild from the code that is checked out now
#   scripts/update.sh --code   first fast-forward the checked-out branch (git pull)
#
# Run it weekly from cron (see README, "Security and updates"). The default
# does not change the app's code, so an unattended run only brings in patches
# for the operating system, Node and PostgreSQL.
set -euo pipefail
cd "$(dirname "$0")/.."

log() { printf '%s  %s\n' "$(date '+%F %T')" "$*"; }

if [ "${1:-}" = "--code" ]; then
  log "Pulling the latest code"
  git pull --ff-only
fi

log "Pulling newer postgres/caddy images"
docker compose pull --ignore-buildable

log "Rebuilding the app on a fresh base image"
docker compose build --pull

log "Restarting changed containers"
docker compose up -d --remove-orphans

log "Waiting for the app to report healthy"
for _ in $(seq 1 40); do
  status=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q app)" 2>/dev/null || echo starting)
  if [ "$status" = healthy ]; then
    log "App is healthy"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 3
done

log "App did not become healthy. Recent logs:"
docker compose logs --tail 50 app
exit 1
