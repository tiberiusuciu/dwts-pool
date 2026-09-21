# DWTS Pool — Deployment (Hetzner + GitHub Actions)

Private Next.js prediction pool for *Dancing with the Stars*. This document is the source of truth for **production deploy to a Hetzner VPS** via GitHub Actions. Paste or point other agents at this file when asking for deploy help.

## Architecture (production)

```
GitHub (push to main)
  → Actions: rsync app → VPS (does NOT overwrite server .env)
  → SSH: scripts/deploy.sh
       → ensure Docker + Compose
       → bootstrap .env on first run (then requires AUTH_URL edit)
       → docker compose -f docker-compose.prod.yml up -d --build
            → db  (Postgres 16, private network only)
            → web (Next.js standalone)
                 → on start: prisma migrate deploy && node server.js
```

| Piece | Path / detail |
|--------|----------------|
| CI workflow | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) |
| Remote script | [`scripts/deploy.sh`](scripts/deploy.sh) |
| Prod Compose | [`docker-compose.prod.yml`](docker-compose.prod.yml) |
| Image build | [`Dockerfile`](Dockerfile) (multi-stage, `output: "standalone"`) |
| Env template | [`.env.production.example`](.env.production.example) |
| Default remote path | `/opt/dwts-pool` |

**Local/dev** uses [`docker-compose.yml`](docker-compose.yml) (Postgres on host port `5433`). Do not confuse with prod compose.

## Prerequisites

1. Hetzner VPS (Ubuntu recommended) with SSH access.
2. GitHub repo with Actions enabled.
3. SSH key pair: **private** key in GitHub Secrets, **public** key in the VPS `~/.ssh/authorized_keys` for the deploy user.
4. Public URL for the app (domain or IP) — used as `AUTH_URL` (Auth.js).

Optional later: reverse proxy (Caddy/nginx) for HTTPS in front of `APP_PORT` (default `3000`).

## GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Required | Description |
|--------|----------|-------------|
| `HETZNER_HOST` | Yes | VPS IP or hostname |
| `HETZNER_USER` | Yes | SSH user (`root` or a sudo user in the `docker` group) |
| `HETZNER_SSH_KEY` | Yes | Full private key PEM (including `BEGIN`/`END` lines) |
| `HETZNER_DEPLOY_PATH` | No | App directory on the server (default `/opt/dwts-pool`) |

The workflow triggers on:

- Push to `main`
- Manual **Run workflow** (`workflow_dispatch`)

Concurrency group `deploy-production` cancels in-progress deploys when a newer one starts.

## What the workflow does

1. `actions/checkout@v4`
2. Writes the SSH key, `ssh-keyscan` the host
3. `rsync -az --delete` project files to the VPS  
   **Excluded:** `.git/`, `node_modules/`, `.next/`, `.env`, `.env.local`  
   So the server’s `.env` is never wiped by CI.
4. SSH runs `chmod +x scripts/deploy.sh && ./scripts/deploy.sh`

## What `scripts/deploy.sh` does

1. Installs Docker via get.docker.com if `docker` is missing; requires Compose plugin.
2. If `.env` is missing: generates `AUTH_SECRET` + `POSTGRES_PASSWORD`, writes `.env`, then **exits with an error** telling you to set `AUTH_URL` and re-run.
3. Validates `.env`: `AUTH_SECRET`, `AUTH_URL` (must not contain `CHANGE_ME`), `POSTGRES_PASSWORD`.
4. `docker compose -f docker-compose.prod.yml up -d --build --remove-orphans`
5. Prints recent `web` logs (migrations appear here) and `compose ps`.

**Migrations:** not a separate CI step. The web container CMD runs `prisma migrate deploy` before `node server.js` every start.

**Seed:** not run automatically. For a fresh DB, SSH in and seed once if needed (see below).

## Server `.env` (production)

Create/edit on the VPS at `$DEPLOY_PATH/.env` (mode `600`). Reference: [`.env.production.example`](.env.production.example).

| Variable | Required | Notes |
|----------|----------|--------|
| `POSTGRES_USER` | No | Default `dwts` |
| `POSTGRES_PASSWORD` | Yes | Strong password; used by Compose for Postgres + `DATABASE_URL` host `db` |
| `POSTGRES_DB` | No | Default `dwts_pool` |
| `DATABASE_URL` | Yes* | Compose overrides for the web service to `…@db:5432…`; keep consistent with Postgres vars |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `AUTH_URL` | Yes | Public site origin, e.g. `https://pool.example.com` (no trailing path) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | No | Enable Google sign-in when both set |
| `ADMIN_EMAIL` | No | That user is promoted to `ADMIN` on signup/login (see `auth.ts` / seed) |
| `APP_PORT` | No | Host port mapped to container `3000` (default `3000`) |

\*Compose sets `DATABASE_URL` for `web` from the Postgres vars; still keep `.env` coherent.

## First-time checklist

1. Add the four GitHub secrets (path optional).
2. Ensure the VPS accepts the deploy key for `HETZNER_USER`.
3. Push to `main` or run the workflow manually.
4. **First run fails on purpose** after creating `.env` — SSH to the server:

   ```bash
   ssh USER@HOST
   cd /opt/dwts-pool   # or HETZNER_DEPLOY_PATH
   nano .env           # set AUTH_URL=https://your-domain-or-ip:port
   # optional: ADMIN_EMAIL, Google OAuth
   ```

5. Re-run the workflow (or on the server: `./scripts/deploy.sh`).
6. Open `http://HOST:APP_PORT` (or HTTPS via proxy).
7. Optional one-time season seed (only when you want cast/episodes loaded). Prod image may or may not run `prisma db seed` cleanly; verify with:

   ```bash
   docker compose -f docker-compose.prod.yml run --rm --entrypoint sh web \
     -c './node_modules/.bin/prisma db seed'
   ```

   If that fails (missing `tsx`/seed in the image), seed from a machine that can reach the DB (e.g. temporary SSH tunnel to Postgres — only if you intentionally publish or exec into the db network). Migrations do **not** require seed.

8. Point DNS + reverse proxy at `APP_PORT`; keep `AUTH_URL` on HTTPS when live.

## Useful server commands

```bash
cd /opt/dwts-pool

# Status / logs
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f db

# Redeploy without GitHub (after manual file sync or edit)
./scripts/deploy.sh

# Restart only
docker compose -f docker-compose.prod.yml restart web

# Shell in web container
docker compose -f docker-compose.prod.yml exec web sh
```

## Local development (not production)

```bash
# Postgres
docker compose up -d db

# Copy .env.example → .env, set AUTH_SECRET, ADMIN_EMAIL, etc.
pnpm install
pnpm db:migrate   # or prisma migrate deploy
pnpm db:seed      # optional
pnpm dev          # http://localhost:3000 — HMR; prefer this over docker web for UI work
```

Dev Compose maps Postgres to **localhost:5433**.

## Agent notes / constraints

- **Do not commit** real `.env` or production secrets.
- **Do not** change `docker-compose.prod.yml` to publish Postgres (`5432`) to the public internet.
- Rsync **must** keep excluding `.env` so deploys don’t clobber server secrets.
- Auth.js v5 uses `AUTH_*` env names (not legacy `NEXTAUTH_*`).
- App admin is role `ADMIN` (often via `ADMIN_EMAIL`), not a separate CMS.
- Stack: Next.js 16, React 19, Prisma, Postgres, pnpm, Docker standalone output.
- UI languages: `en` / `fr` in `localStorage` (`dwts-locale`); not related to deploy.
- If deploy fails on “Compose plugin missing”, install `docker-compose-plugin` on the VPS.
- If SSH fails, check key format, `authorized_keys`, and that `HETZNER_USER` owns/write `/opt/dwts-pool` (or the custom path).
- Firewall: allow `22` (SSH) and `APP_PORT` or `80`/`443` if proxied.

## File map for deploy-related changes

When editing deploy behavior, touch only:

- `.github/workflows/deploy.yml` — CI/SSH/rsync
- `scripts/deploy.sh` — remote bootstrap + compose
- `docker-compose.prod.yml` — services/network/ports
- `Dockerfile` — build + migrate-on-start
- `.env.production.example` — documented variables
- This `README.md` — keep in sync with the above
