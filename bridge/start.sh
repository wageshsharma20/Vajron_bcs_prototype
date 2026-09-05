#!/usr/bin/env bash
#
# Starts the bridge with a Python that actually works.
#
# The Homebrew pythons on this Mac have a broken pyexpat -- they link against a
# newer libexpat than macOS ships -- so importing pymavlink fails on them and
# commanding would silently be unavailable. Rather than make that everyone's
# problem to remember, pick an interpreter that can load pymavlink, and fall
# back to any python3 for receive-only use (which needs no dependencies).
#
#   ./start.sh                                   telemetry only
#   ./start.sh --command-link udpout:HOST:14550  ...and commanding
#   ./start.sh --command-link udpout:HOST:14550 --allow-arm
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PY=""
for candidate in /usr/bin/python3 python3 python3.12 python3.11; do
  command -v "$candidate" > /dev/null 2>&1 || continue
  if PYTHONPATH=vendor "$candidate" -c "from pymavlink import mavutil" 2>/dev/null; then
    PY="$candidate"; break
  fi
  [[ -z "$PY" ]] && command -v "$candidate" > /dev/null && FALLBACK="$candidate"
done

if [[ -z "$PY" ]]; then
  PY="${FALLBACK:-python3}"
  echo "note: no python here can import pymavlink, so commanding is unavailable."
  echo "      telemetry still works. to fix:  pip install pymavlink"
fi

echo "using $PY ($("$PY" --version 2>&1))"
exec "$PY" mavlink_bridge.py "$@"
