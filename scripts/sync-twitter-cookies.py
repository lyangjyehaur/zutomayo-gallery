#!/usr/bin/env python3
"""
sync-twitter-cookies.py
Read Edge Twitter cookies on Mac → update RSSHub TWITTER_COOKIE on server3
"""
import subprocess
import sys
import re


def edge_cookie(name):
    """Read a specific cookie from Edge (x.com domain) via browser-cookie3."""
    import browser_cookie3
    cj = browser_cookie3.edge(domain_name='x.com')
    cookies = {c.name: c.value for c in cj}
    val = cookies.get(name)
    if not val:
        print(f"ERROR: '{name}' not found in Edge x.com cookies", file=sys.stderr)
        sys.exit(1)
    return val


def ssh_run(cmd: str, timeout=30) -> str:
    """Run a command on server3 and return combined stdout/stderr."""
    r = subprocess.run(
        ["ssh", "server3", cmd],
        capture_output=True, text=True, timeout=timeout,
    )
    if r.returncode != 0:
        print(f"SSH error (exit {r.returncode}):\n{r.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    return r.stdout.strip()


def main():
    print("📡 Reading Twitter cookies from Edge...")
    auth_token = edge_cookie("auth_token")
    ct0 = edge_cookie("ct0")
    print(f"   auth_token: {auth_token[:15]}...")
    print(f"   ct0:        {ct0[:15]}...")

    cookie_val = f"auth_token={auth_token}; ct0={ct0};"
    print("📦 Syncing to server3...")

    # Build a remote command: update TWITTER_COOKIE line in compose file
    # Use Python on server3 to avoid sed escaping headaches
    remote_script = f"""
import re, yaml

compose_path = '/opt/rsshub/docker-compose.yml'

with open(compose_path) as f:
    content = f.read()

# Update TWITTER_COOKIE using regex (no yaml dependency needed)
new_val = '{cookie_val}'
content = re.sub(
    r"TWITTER_COOKIE:\\s*'[^']*'",
    f"TWITTER_COOKIE: '{{new_val}}'",
    content,
)

with open(compose_path, 'w') as f:
    f.write(content)

print("TWITTER_COOKIE updated")
"""

    # First try with yaml, fall back to plain regex
    remote_cmd = f"""python3 << 'PYEOF'
{remote_script}
# Verify
import re
with open('/opt/rsshub/docker-compose.yml') as f:
    for line in f:
        line = line.strip()
        if 'TWITTER_COOKIE' in line:
            print(f"  -> {{line}}")
PYEOF"""

    result = ssh_run(remote_cmd, timeout=15)
    print(f"   {result}")

    # Restart RSSHub - kill legacy container first, then let compose take over
    print("   Restarting RSSHub container...")
    restart_cmd = """cd /opt/rsshub && \
docker rm -f rsshub-1 2>/dev/null; \
docker compose up -d rsshub 2>&1 | tail -3"""
    restart_out = ssh_run(restart_cmd, timeout=60)
    print(f"   {restart_out}")

    # Verify
    verify = ssh_run(
        "docker ps --filter 'name=rsshub' --format '{{.Names}} {{.Status}}'",
        timeout=10
    )
    print(f"   Container: {verify}")

    print("\n✅ Done! RSSHub Twitter cookie synced from Edge.")


if __name__ == "__main__":
    main()
