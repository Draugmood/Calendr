#!/bin/bash
set -Eeuo pipefail
PS4='+ ${LINENO}: '
set -x

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
    local cmd=${BASH_COMMAND}

    echo
    echo "❌ Deploy failed (exit code: ${exit_code})"
    echo "   Line: ${line_no}"
    echo "   Cmd : ${cmd}"
    pause
    exit "${exit_code}"
}

on_exit() {
    local exit_code=$?
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

PI_USER="draugmood"
PI_HOST="raspberrypi.local"

REMOTE_APP_DIR="/home/draugmood/Software/Calendr"   # on the Pi
WEBROOT="/var/www/html"

echo " "
echo "== Build frontend =="
( cd frontend && npm ci && npm run build )

echo " "
echo "== Upload frontend dist/ =="
scp -r -v frontend/dist "${PI_USER}@${PI_HOST}:${REMOTE_APP_DIR}/frontend/"

echo " "
echo "== Upload backend source =="
scp -r -v backend "${PI_USER}@${PI_HOST}:${REMOTE_APP_DIR}/"

echo " "
echo "== Deploy on Pi (copy frontend to nginx webroot, update backend deps, restart) =="
ssh "${PI_USER}@${PI_HOST}" \
    "REMOTE_APP_DIR='${REMOTE_APP_DIR}' WEBROOT='${WEBROOT}' PI_USER='${PI_USER}' bash -s" << 'ENDSSH'
set -Eeuo pipefail
PS4='+ remote:${LINENO}: '
set -x

# --- Frontend -> nginx webroot (atomic-ish swap) ---
sudo rm -rf "${WEBROOT}.new"
sudo mkdir -p "${WEBROOT}.new"
sudo cp -r "${REMOTE_APP_DIR}/frontend/dist/"* "${WEBROOT}.new/"

sudo chown -R www-data:www-data "${WEBROOT}.new"
sudo find "${WEBROOT}.new" -type d -exec chmod 755 {} \;
sudo find "${WEBROOT}.new" -type f -exec chmod 644 {} \;

sudo rm -rf "${WEBROOT}.old"
sudo mv "${WEBROOT}" "${WEBROOT}.old" || true
sudo mv "${WEBROOT}.new" "${WEBROOT}"

# --- Backend venv + deps ---
cd "${REMOTE_APP_DIR}/backend"

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Make sure DB directory exists (if you're using /var/lib/calendr)
sudo mkdir -p /var/lib/calendr
sudo chown -R "${PI_USER}:${PI_USER}" /var/lib/calendr

# Restart services
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart calendr-backend
sudo systemctl status calendr-backend --no-pager -l | sed -n '1,25p'
ENDSSH
