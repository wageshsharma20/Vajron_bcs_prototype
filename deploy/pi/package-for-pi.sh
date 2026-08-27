#!/usr/bin/env bash
#
# Build the GCS web bundle and pack everything the Pi needs into one tarball.
# Run this on the DEV MACHINE (Mac), from anywhere:
#
#   ./deploy/pi/package-for-pi.sh
#
# Produces  deploy/pi/vajron-gcs-pi.tar.gz  — copy that single file to the Pi.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$(cd "${HERE}/../.." && pwd)"
STAGE="$(mktemp -d)"
TARBALL="${HERE}/vajron-gcs-pi.tar.gz"
trap 'rm -rf "$STAGE"' EXIT

echo "==> Building web bundle (this runs on the Mac, never on the Pi)"
cd "$PROJECT"
npx expo export -p web

[[ -f "${PROJECT}/dist/index.html" ]] || { echo "ERROR: export produced no dist/index.html" >&2; exit 1; }

echo "==> Staging payload"
mkdir -p "${STAGE}/vajron-gcs-pi"
cp -r "${PROJECT}/dist" "${STAGE}/vajron-gcs-pi/dist"
cp "${HERE}/install-on-pi.sh" \
   "${HERE}/vajron-gcs.service" \
   "${HERE}/vajron-gcs-kiosk.service" \
   "${HERE}/vajron-unlock" \
   "${HERE}/vajron-lock" \
   "${HERE}/chromium-policy.json" \
   "${HERE}/README.md" \
   "${STAGE}/vajron-gcs-pi/"
chmod +x "${STAGE}/vajron-gcs-pi/install-on-pi.sh" \
         "${STAGE}/vajron-gcs-pi/vajron-unlock" \
         "${STAGE}/vajron-gcs-pi/vajron-lock"

# The policy file is what restricts the browser to the GCS; shipping without it
# would silently produce an unlocked kiosk.
for required in install-on-pi.sh vajron-gcs.service vajron-gcs-kiosk.service vajron-unlock vajron-lock chromium-policy.json; do
  [[ -f "${STAGE}/vajron-gcs-pi/${required}" ]] || { echo "ERROR: ${required} missing from payload" >&2; exit 1; }
done

echo "==> Writing ${TARBALL}"
rm -f "$TARBALL"
tar -czf "$TARBALL" -C "$STAGE" vajron-gcs-pi

echo
echo "Bundle size:  $(du -sh "${PROJECT}/dist" | cut -f1)"
echo "Tarball:      $(du -sh "$TARBALL" | cut -f1)  ->  $TARBALL"
echo
echo "Next, from this machine:"
echo "  scp \"$TARBALL\" <pi-user>@<pi-host>.local:~/"
echo "Then on the Pi:"
echo "  tar -xzf vajron-gcs-pi.tar.gz && cd vajron-gcs-pi && ./install-on-pi.sh"
