#!/usr/bin/env bash
# Run on the Hetzner VPS from the app directory (e.g. /opt/dwts-pool).
# Ensures Docker is available, bootstraps .env once, builds/restarts the stack.
# Prisma migrations run inside the web container on start (see Dockerfile CMD).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.prod.yml)

log() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

ensure_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker already installed: $(docker --version)"
  else
    log "Installing Docker…"
    curl -fsSL https://get.docker.com | sh
    if command -v systemctl >/dev/null 2>&1; then
      systemctl enable --now docker
    fi
  fi

  if ! docker compose version >/dev/null 2>&1; then
    die "Docker Compose plugin missing. Install docker-compose-plugin and retry."
  fi

  # Allow non-root deploy user if we're root and a sudo user exists later — no-op for root.
  if [[ "$(id -u)" -eq 0 ]] && id -u ubuntu >/dev/null 2>&1; then
    usermod -aG docker ubuntu 2>/dev/null || true
  fi
}

bootstrap_env() {
  if [[ -f .env ]]; then
    log ".env present"
    return
  fi

  log "Creating .env (first deploy)…"
  local secret password
  secret="$(openssl rand -base64 32 | tr -d '\n')"
  password="$(openssl rand -base64 24 | tr -d '\n=/+' | head -c 32)"

  cat >.env <<EOF
POSTGRES_USER=dwts
POSTGRES_PASSWORD=${password}
POSTGRES_DB=dwts_pool
DATABASE_URL=postgresql://dwts:${password}@db:5432/dwts_pool?schema=public
AUTH_SECRET=${secret}
AUTH_URL=https://CHANGE_ME
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
ADMIN_EMAIL=
APP_PORT=3000
EOF
  chmod 600 .env
  die "Created .env with generated secrets. Set AUTH_URL (and ADMIN_EMAIL / Google OAuth if needed) in ${ROOT}/.env, then re-run deploy."
}

require_env() {
  # shellcheck disable=SC1091
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a

  [[ -n "${AUTH_SECRET:-}" ]] || die "AUTH_SECRET is empty in .env"
  [[ -n "${AUTH_URL:-}" ]] || die "AUTH_URL is empty in .env"
  [[ "${AUTH_URL}" != *"CHANGE_ME"* ]] || die "Set AUTH_URL in .env to your public URL (https://…)"
  [[ -n "${POSTGRES_PASSWORD:-}" ]] || die "POSTGRES_PASSWORD is empty in .env"
}

deploy_stack() {
  log "Building and starting services…"
  "${COMPOSE[@]}" up -d --build --remove-orphans

  log "Waiting for web container…"
  local i=0
  until "${COMPOSE[@]}" ps --status running | grep -q web; do
    i=$((i + 1))
    [[ "$i" -lt 30 ]] || die "web service did not become running"
    sleep 2
  done

  log "Recent web logs (migrations run on container start):"
  "${COMPOSE[@]}" logs --tail=40 web || true

  log "Stack status:"
  "${COMPOSE[@]}" ps
}

main() {
  log "Deploy root: ${ROOT}"
  ensure_docker
  bootstrap_env
  require_env
  deploy_stack
  log "Deploy finished."
}

main "$@"
