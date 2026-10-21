#!/bin/bash
set -Eeuo pipefail
if [ -n "${DEBUG:-}" ]; then
    PS4='+ ${LINENO}: '
    set -x
fi

# Override any of these per run, e.g. PI_HOST=raspberrypi.local ./deploy.sh
PI_USER="${PI_USER:-draugmood}"
PI_HOST="${PI_HOST:-tavla}"   # Tailscale MagicDNS name, works from anywhere on the tailnet

REMOTE_APP_DIR="${REMOTE_APP_DIR:-/home/draugmood/Software/Calendr}"   # on the Pi
WEBROOT="${WEBROOT:-/var/www/html}"
HEALTH_URL="${HEALTH_URL:-http://localhost/api/auth/google/status}"   # checked from the Pi

# Vite bakes these into the bundle at build time, so a missing one ships a broken frontend.
REQUIRED_FRONTEND_ENV=(VITE_GOOGLE_CLIENT_ID VITE_TRELLO_KEY VITE_TRELLO_TOKEN)

TARGET="${PI_USER}@${PI_HOST}"
# Unique per run, so overlapping deploys never share (or delete) each other's upload
REMOTE_STAGE="${REMOTE_APP_DIR}/.deploy-staging/$(date +%Y%m%d-%H%M%S)-$$"
# Short fixed parent: the SSH control socket inside must fit the ~104 char Unix socket limit,
# which a long $TMPDIR (e.g. macOS) would blow past
TMP_DIR="$(mktemp -d /tmp/calendr-deploy.XXXXXX)"
# Every ssh call below reuses one connection, so a password (if any) is asked for once.
# It outlives any build; on_exit closes it.
SSH_OPTS=(-o ControlMaster=auto -o "ControlPath=${TMP_DIR}/ssh-%C" -o ControlPersist=30m)

pause() {
    # Only pause if we have a terminal (prevents hanging in CI)
    if [ -t 0 ]; then
        echo
        read -rp "Press ENTER to close..."
    fi
}

on_error() {
    local exit_code=$?
    local line_no=${BASH_LINENO[0]}
    local cmd=${BASH_COMMAND%%$'\n'*}   # first line only, not the whole heredoc

    echo
    echo "❌ Deploy failed (exit code: ${exit_code})"
    echo "   Line: ${line_no}"
    echo "   Cmd : ${cmd}"
}

on_exit() {
    local exit_code=$?
    ssh "${SSH_OPTS[@]}" -O exit "${TARGET}" 2>/dev/null || true
    rm -rf "${TMP_DIR}"
    echo
    if [ "${exit_code}" -eq 0 ]; then
        echo "✅ Deploy finished successfully."
    else
        echo "❌ Deploy finished with errors (exit code: ${exit_code})."
    fi
    pause
}

trap on_error ERR
trap on_exit EXIT

cd "$(dirname "$0")"

# Names of required VITE_* vars that resolve to empty, using Vite's own loader so
# env file precedence, expansion and exported vars match what `vite build` sees.
missing_frontend_env() {
    ( cd frontend && node --input-type=module -e '
        import { loadEnv } from "vite";
        const env = loadEnv("production", process.cwd(), "VITE_");
        const missing = process.argv.slice(1).filter((name) => !env[name]?.trim());
        console.log(missing.join(" "));
    ' "${REQUIRED_FRONTEND_ENV[@]}" )
}

# Tracked files plus new files git isn't ignoring, so caches, venvs and .env files never ship.
backend_files() {
    git ls-files -z --cached --others --exclude-standard -- backend |
        while IFS= read -r -d '' file; do
            if [ -e "${file}" ]; then
                printf '%s\0' "${file}"
            fi
        done
}

echo "== Preflight =="
VERSION="$(git rev-parse --short HEAD)"
# Untracked (non-ignored) files count too, since they get built and shipped
if [ -n "$(git status --porcelain)" ]; then
    VERSION="${VERSION}-dirty"
    echo "⚠️  Working tree has uncommitted changes; deploying them as ${VERSION}."
fi

if ! ssh "${SSH_OPTS[@]}" -o ConnectTimeout=10 "${TARGET}" true; then
    echo "Could not reach ${TARGET}. Is Tailscale up on both ends? Try: tailscale status" >&2
    exit 1
fi

echo " "
echo "== Build frontend (${VERSION}) =="
( cd frontend && npm ci )
missing_env="$(missing_frontend_env)"
if [ -n "${missing_env}" ]; then
    echo "Missing or empty frontend build variables: ${missing_env}" >&2
    echo "Add them to frontend/.env.production.local (gitignored) or export them." >&2
    exit 1
fi
( cd frontend && npm run build )
echo "${VERSION} $(date '+%Y-%m-%dT%H:%M:%S%z')" > frontend/dist/version.txt

echo " "
echo "== Upload frontend dist/ and backend source =="
STAGE="${TMP_DIR}/stage"
mkdir -p "${STAGE}/frontend"
cp -R frontend/dist "${STAGE}/frontend/dist"
backend_files | tar --null -T - -cf - | tar -xf - -C "${STAGE}"

tar -C "${STAGE}" -czf - . |
    ssh "${SSH_OPTS[@]}" "${TARGET}" \
        "mkdir -p '${REMOTE_STAGE}' && tar -xzf - -C '${REMOTE_STAGE}'"

echo " "
echo "== Deploy on Pi (update backend, restart + health check, swap frontend into nginx webroot) =="
ssh "${SSH_OPTS[@]}" "${TARGET}" \
    "REMOTE_APP_DIR='${REMOTE_APP_DIR}' REMOTE_STAGE='${REMOTE_STAGE}' WEBROOT='${WEBROOT}' PI_USER='${PI_USER}' HEALTH_URL='${HEALTH_URL}' DEBUG='${DEBUG:-}' bash -s" << 'ENDSSH'
set -Eeuo pipefail
if [ -n "${DEBUG}" ]; then
    PS4='+ remote:${LINENO}: '
    set -x
fi
trap 'rm -rf "${REMOTE_STAGE}"' EXIT

# One deploy at a time: a second one waits here instead of interleaving with the first
exec 9> "${REMOTE_APP_DIR}/.deploy.lock"
if ! flock -w 300 9; then
    echo "Another deploy has held ${REMOTE_APP_DIR}/.deploy.lock for 5 minutes, giving up" >&2
    exit 1
fi

# --- Backend code + venv/deps (.venv and .env files on the Pi are left alone) ---
mkdir -p "${REMOTE_APP_DIR}/backend"
cp -R "${REMOTE_STAGE}/backend/." "${REMOTE_APP_DIR}/backend/"
cd "${REMOTE_APP_DIR}/backend"

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

# Only reinstall dependencies when requirements.txt changed since the last deploy
REQUIREMENTS_STAMP=".venv/.requirements.sha256"
if ! sha256sum --check --status "${REQUIREMENTS_STAMP}" 2>/dev/null; then
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r requirements.txt
    sha256sum requirements.txt > "${REQUIREMENTS_STAMP}"
else
    echo "requirements.txt unchanged, skipping pip install"
fi

# Make sure DB directory exists (if you're using /var/lib/calendr)
sudo mkdir -p /var/lib/calendr
sudo chown -R "${PI_USER}:${PI_USER}" /var/lib/calendr

# --- Restart backend and wait until it answers through nginx ---
sudo systemctl restart calendr-backend
healthy=""
for _ in $(seq 1 20); do
    if python3 -c 'import sys, urllib.request; urllib.request.urlopen(sys.argv[1], timeout=2)' "${HEALTH_URL}" 2>/dev/null; then
        healthy="yes"
        break
    fi
    sleep 1
done
if [ -z "${healthy}" ]; then
    echo "Backend did not answer ${HEALTH_URL} within 20s. Frontend was NOT swapped. Recent logs:" >&2
    sudo journalctl -u calendr-backend -n 40 --no-pager >&2
    exit 1
fi
echo "Backend healthy"

# --- Frontend -> nginx webroot (atomic-ish swap, previous version kept in ${WEBROOT}.old) ---
sudo rm -rf "${WEBROOT}.new"
sudo cp -R "${REMOTE_STAGE}/frontend/dist" "${WEBROOT}.new"

sudo chown -R www-data:www-data "${WEBROOT}.new"
sudo find "${WEBROOT}.new" -type d -exec chmod 755 {} +
sudo find "${WEBROOT}.new" -type f -exec chmod 644 {} +

sudo rm -rf "${WEBROOT}.old"
sudo mv "${WEBROOT}" "${WEBROOT}.old" || true
sudo mv "${WEBROOT}.new" "${WEBROOT}"

sudo nginx -t -q
sudo systemctl reload nginx

echo "Now serving: $(cat "${WEBROOT}/version.txt")"
ENDSSH

echo " "
echo "Deployed ${VERSION} to http://${PI_HOST}/"
