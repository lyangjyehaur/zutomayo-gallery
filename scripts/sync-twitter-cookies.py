#!/usr/bin/env python3
"""
sync-twitter-cookies.py
Read Edge Twitter cookies on Mac → update remote RSSHub TWITTER_COOKIE
"""
import base64
import os
from pathlib import Path
import shlex
import subprocess
import sys
import re


PROJECT_DIR = Path(__file__).resolve().parents[1]
DEPLOY_CONFIG = Path(os.environ.get("DEPLOY_CONFIG", PROJECT_DIR / "deploy-local.conf"))


def get_setting(name: str) -> str:
    """Read a non-secret deployment setting from env or deploy-local.conf."""
    env_value = os.environ.get(name)
    if env_value:
        return env_value

    if DEPLOY_CONFIG.is_file():
        pattern = re.compile(
            rf"^\s*{re.escape(name)}\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^#\s]+))\s*$"
        )
        for line in DEPLOY_CONFIG.read_text(encoding="utf-8").splitlines():
            match = pattern.match(line)
            if match:
                return next(value for value in match.groups() if value is not None)

    print(
        f"ERROR: set {name} in {DEPLOY_CONFIG} or the environment",
        file=sys.stderr,
    )
    sys.exit(1)


def edge_cookie(domain: str, name: str):
    """Read a specific cookie from Edge for the configured Twitter domain."""
    import browser_cookie3
    cj = browser_cookie3.edge(domain_name=domain)
    cookies = {c.name: c.value for c in cj}
    val = cookies.get(name)
    if not val:
        print(f"ERROR: '{name}' not found in Edge {domain} cookies", file=sys.stderr)
        sys.exit(1)
    return val


def ssh_run(ssh_target: str, cmd: str, timeout=30) -> str:
    """Run a command on the configured server and return stdout."""
    r = subprocess.run(
        ["ssh", ssh_target, cmd],
        capture_output=True, text=True, timeout=timeout,
    )
    if r.returncode != 0:
        print(f"SSH error (exit {r.returncode}):\n{r.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    return r.stdout.strip()


def main():
    ssh_target = get_setting("SSH_TARGET")
    compose_file = get_setting("RSSHUB_COMPOSE_FILE")
    service_name = get_setting("RSSHUB_SERVICE_NAME")
    cookie_domain = get_setting("TWITTER_COOKIE_DOMAIN")

    print("📡 Reading Twitter cookies from Edge...")
    auth_token = edge_cookie(cookie_domain, "auth_token")
    ct0 = edge_cookie(cookie_domain, "ct0")
    print("   auth_token: loaded (value hidden)")
    print("   ct0:        loaded (value hidden)")

    cookie_val = f"auth_token={auth_token}; ct0={ct0};"
    print(f"📦 Syncing to {ssh_target}...")

    # Build a remote command: update TWITTER_COOKIE line in compose file
    # Use base64 transport so the cookie is not interpolated as Python source.
    encoded_cookie = base64.b64encode(cookie_val.encode("utf-8")).decode("ascii")
    remote_script = f"""
import base64
import re

compose_path = {compose_file!r}

with open(compose_path) as f:
    content = f.read()

new_val = base64.b64decode({encoded_cookie!r}).decode("utf-8")
content, count = re.subn(
    r"(?m)^(\\s*TWITTER_COOKIE:\\s*).*$",
    lambda match: f"{{match.group(1)}}'{{new_val}}'",
    content,
)
if count != 1:
    raise SystemExit(f"expected one TWITTER_COOKIE entry, found {{count}}")

with open(compose_path, 'w') as f:
    f.write(content)

print("TWITTER_COOKIE updated (value hidden)")
"""

    remote_cmd = f"""python3 << 'PYEOF'
{remote_script}
PYEOF"""

    result = ssh_run(ssh_target, remote_cmd, timeout=15)
    print(f"   {result}")

    print("   Restarting RSSHub container...")
    restart_cmd = (
        f"docker compose -f {shlex.quote(compose_file)} up -d --force-recreate "
        f"{shlex.quote(service_name)} "
        "2>&1 | tail -3"
    )
    restart_out = ssh_run(ssh_target, restart_cmd, timeout=60)
    print(f"   {restart_out}")

    # Verify
    verify = ssh_run(
        ssh_target,
        f"docker compose -f {shlex.quote(compose_file)} ps {shlex.quote(service_name)}",
        timeout=10
    )
    print(f"   Container: {verify}")

    print("\n✅ Done! RSSHub Twitter cookie synced from Edge.")


if __name__ == "__main__":
    main()
