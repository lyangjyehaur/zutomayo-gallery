#!/usr/bin/env bash
# sync-twitter-cookies.sh
# Read Edge Twitter cookies on Mac → update remote RSSHub TWITTER_COOKIE
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_CONFIG="${DEPLOY_CONFIG:-${PROJECT_DIR}/deploy-local.conf}"
if [ -f "$DEPLOY_CONFIG" ]; then
    # shellcheck disable=SC1090
    source "$DEPLOY_CONFIG"
fi
: "${SSH_TARGET:?請在 ${DEPLOY_CONFIG} 或環境變數設定 SSH_TARGET}"
: "${RSSHUB_COMPOSE_FILE:?請在 ${DEPLOY_CONFIG} 或環境變數設定 RSSHUB_COMPOSE_FILE}"
: "${RSSHUB_SERVICE_NAME:?請在 ${DEPLOY_CONFIG} 或環境變數設定 RSSHUB_SERVICE_NAME}"
: "${TWITTER_COOKIE_DOMAIN:?請在 ${DEPLOY_CONFIG} 或環境變數設定 TWITTER_COOKIE_DOMAIN}"

echo "📡 Reading Twitter cookies from Edge..."

# Read cookies
AUTH_TOKEN=$(python3 - "$TWITTER_COOKIE_DOMAIN" "auth_token" 2>&1 <<'PY'
import browser_cookie3, sys
domain, name = sys.argv[1], sys.argv[2]
cj = browser_cookie3.edge(domain_name=domain)
cookies = {c.name: c.value for c in cj}
v = cookies.get(name, '')
if not v:
    print(f'ERROR: {name} not found for {domain}', file=sys.stderr)
    sys.exit(1)
print(v)
PY
)

CT0=$(python3 - "$TWITTER_COOKIE_DOMAIN" "ct0" 2>&1 <<'PY'
import browser_cookie3, sys
domain, name = sys.argv[1], sys.argv[2]
cj = browser_cookie3.edge(domain_name=domain)
cookies = {c.name: c.value for c in cj}
v = cookies.get(name, '')
if not v:
    print(f'ERROR: {name} not found for {domain}', file=sys.stderr)
    sys.exit(1)
print(v)
PY
)

echo "   auth_token: loaded (value hidden)"
echo "   ct0:        loaded (value hidden)"

# Build cookie string
COOKIE="auth_token=${AUTH_TOKEN}; ct0=${CT0};"

# Sync via SSH heredoc
echo "📦 Syncing to ${SSH_TARGET}..."
ssh "$SSH_TARGET" bash -s -- "$COOKIE" "$RSSHUB_COMPOSE_FILE" "$RSSHUB_SERVICE_NAME" <<'REMOTE'
COOKIE_VAL="$1"
COMPOSE_FILE="$2"
SERVICE_NAME="$3"

echo "   Updating TWITTER_COOKIE in ${COMPOSE_FILE}..."

# Escape for sed (Linux)
ESCAPED=$(printf '%s\n' "$COOKIE_VAL" | sed 's/[\/&]/\\&/g')
sed -i "s/^\([[:space:]]*TWITTER_COOKIE:\).*/\1 '${ESCAPED}'/" "$COMPOSE_FILE"

if grep -q 'TWITTER_COOKIE:' "$COMPOSE_FILE"; then
    echo "   TWITTER_COOKIE updated (value hidden)"
else
    echo "   TWITTER_COOKIE entry not found" >&2
    exit 1
fi

echo "   Restarting RSSHub..."
cd "$(dirname "$COMPOSE_FILE")"
docker compose up -d --force-recreate "$SERVICE_NAME"

echo "   Container status:"
docker compose ps "$SERVICE_NAME"
REMOTE

echo ""
echo "✅ Done! RSSHub Twitter cookie synced from Edge."
