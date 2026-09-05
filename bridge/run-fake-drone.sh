#!/usr/bin/env bash
# Test aircraft. Same interpreter problem as start.sh, same fix.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
for c in /usr/bin/python3 python3; do
  command -v "$c" > /dev/null 2>&1 || continue
  if "$c" -c "import sys,os; sys.path.insert(0,'vendor'); import pymavlink" 2>/dev/null; then
    exec "$c" fake_drone.py "$@"
  fi
done
exec python3 fake_drone.py "$@"
