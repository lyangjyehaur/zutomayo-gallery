#!/usr/bin/env bash
# sync-twitter-cookies.sh
# Read Edge Twitter cookies on Mac → update RSSHub TWITTER_COOKIE on server3
set -euo pipefail

COMPOSE_FILE="/opt/rsshub/docker-compose.yml"
SSH_TARGET="server3"

echo "📡 Reading Twitter cookies from Edge..."

# Read cookies
AUTH_TOKEN=$(python3 -c "
import browser_cookie3, sys
cj = browser_cookie3.edge(domain_name='x.com')
cookies = {c.name: c.value for c in cj}
v = cookies.get('auth_token', '')
if not v:
    print('ERROR: auth_token not found', file=sys.stderr)
    sys.exit(1)
print(v)
" 2>&1)

CT0=$(python3 -c "
import browser_cookie3, sys
cj = browser_cookie3.edge(domain_name='x.com')
cookies = {c.name: c.value for c in cj}
v = cookies.get('ct0', '')
if not v:
    print('ERROR: ct0 not found', file=sys.stderr)
    sys.exit(1)
print(v)
" 2>&1)

echo "   auth_token: ${AUTH_TOKEN:0:15}..."
echo "   ct0:        ${CT0:0:15}..."

# Build cookie string
COOKIE="auth_token=${AUTH_TOKEN}; ct0=${CT0};"

# Sync to server3 via SSH heredoc
echo "📦 Syncing to server3..."
ssh "$SSH_TARGET" bash -s -- "$COOKIE" "$COMPOSE_FILE" <<'REMOTE'
COOKIE_VAL="$1"
COMPOSE_FILE="$2"

echo "   Updating TWITTER_COOKIE in ${COMPOSE_FILE}..."

# Escape for sed (Linux)
ESCAPED=$(printf '%s\n' "$COOKIE_VAL" | sed 's/[\/&]/\\&/g')
sed -i "s/^\([[:space:]]*TWITTER_COOKIE:\).*/\1 '${ESCAPED}'/" "$COMPOSE_FILE"

echo "   New value:"
grep TWITTER_COOKIE "$COMPOSE_FILE"

echo "   Restarting RSSHub..."
cd /opt/rsshub
docker compose up -d --force-recreate rsshub

echo "   Container status:"
docker ps --filter "name=rsshub" --format "{{.Names}} {{.Status}}"
REMOTE

echo ""
echo "✅ Done! RSSHub Twitter cookie synced from Edge."
