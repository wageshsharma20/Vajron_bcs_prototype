#!/usr/bin/env bash
#
# Install the Vajron GCS as a locked-down kiosk on a Raspberry Pi 4.
#
# Run this ON THE PI, from the folder this script lives in:
#   chmod +x install-on-pi.sh && ./install-on-pi.sh
#
# What you get:
#   * the GCS starts by itself on power-on, fullscreen, with no desktop behind it
#   * no other application is reachable — there is no desktop, panel or launcher
#   * Chromium is confined to the GCS address, so there is nowhere else to browse
#   * a safe code stops the kiosk and hands the Pi back (vajron-unlock)
#
# Nothing is built here. Metro needs more RAM than a 4 GB Pi has spare and is slow
# on ARM, so the bundle is always built on the dev machine and copied across.
set -euo pipefail

APP_DIR=/opt/vajron-gcs
CONF_DIR=/etc/vajron-gcs
PORT=8080
URL="http://localhost:${PORT}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Checked before anything else, so the likeliest mistake gets the clearest message.
if [[ ! -d "${SCRIPT_DIR}/dist" ]]; then
  echo "ERROR: no dist/ next to this script." >&2
  echo "On your dev machine run './deploy/pi/package-for-pi.sh', then copy the tarball over." >&2
  exit 1
fi
if [[ ! -f "${SCRIPT_DIR}/dist/index.html" ]]; then
  echo "ERROR: ${SCRIPT_DIR}/dist has no index.html — wrong folder copied?" >&2
  exit 1
fi

RUN_USER="${SUDO_USER:-$USER}"
RUN_UID="$(id -u "$RUN_USER")"
[[ -n "$RUN_UID" ]] || { echo "ERROR: cannot resolve uid for ${RUN_USER}" >&2; exit 1; }

echo "==> Installing for user ${RUN_USER} (uid ${RUN_UID})"

# ----------------------------------------------------------------- safe code
# Stored only as a salted SHA-256, so the code itself is nowhere on the device.
# Pass it non-interactively with VAJRON_CODE=... to script this install.
if [[ -n "${VAJRON_CODE:-}" ]]; then
  CODE="$VAJRON_CODE"
else
  echo
  echo "Choose the safe code that will unlock this Pi later."
  read -rsp "Safe code: " CODE; echo
  read -rsp "Repeat it:  " CODE2; echo
  [[ "$CODE" == "$CODE2" ]] || { echo "ERROR: the two entries differ." >&2; exit 1; }
fi
[[ ${#CODE} -ge 4 ]] || { echo "ERROR: use at least 4 characters." >&2; exit 1; }

SALT="$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
HASH="$(printf '%s' "${SALT}${CODE}" | sha256sum | cut -d' ' -f1)"
unset CODE CODE2
sudo mkdir -p "$CONF_DIR"
printf '%s\n%s\n' "$SALT" "$HASH" | sudo tee "${CONF_DIR}/unlock.hash" > /dev/null
sudo chmod 644 "${CONF_DIR}/unlock.hash"
echo "    safe code stored (salted hash only)"

# ----------------------------------------------------------------- dependencies
echo "==> Checking for the kiosk compositor (cage)"
HARD_LOCK=1
if ! command -v cage > /dev/null; then
  echo "    installing cage…"
  sudo apt-get update -qq && sudo apt-get install -y -qq cage || true
fi
if ! command -v cage > /dev/null; then
  echo "    WARNING: cage could not be installed (no internet?)." >&2
  echo "    Falling back to a desktop-session kiosk, which is NOT fully locked down." >&2
  HARD_LOCK=0
fi

# Does this cage understand -s (allow VT switching)? Every version shipped so
# far does, but if a future one ever drops or renames it, writing "cage -s"
# would make the kiosk die instantly on every start, restart forever, and hold
# tty1 while doing it — the exact trap this script exists to prevent. Check it
# once here, while reacting is still cheap.
CAGE_VT_OK=1
if command -v cage > /dev/null && ! cage -h 2>&1 | grep -qE "^[[:space:]]*-s([[:space:]]|,|$)"; then
  CAGE_VT_OK=0
  echo "    WARNING: this cage build does not advertise -s (VT switching)." >&2
  echo "    Ctrl+Alt+F2 will NOT get you a console on this build." >&2
  echo "    Your way back in is the SD-card escape hatch printed at the end." >&2
fi

BROWSER="$(command -v chromium-browser || command -v chromium || true)"
[[ -n "$BROWSER" ]] || { echo "ERROR: Chromium is not installed. sudo apt install -y chromium-browser" >&2; exit 1; }
echo "    browser: ${BROWSER}"

# How reachable the console stays.
#
# The console (Ctrl+Alt+F2) is the local way back in. cage disables VT switching
# unless given -s, so turning it off makes the console genuinely unreachable —
# and if SSH is not actually working at that moment, the owner is locked out of
# their own Pi with no way back except pulling the SD card.
#
# That happened once, because this script trusted `systemctl is-enabled ssh`.
# On Raspberry Pi OS that unit ships enabled whether or not SSH was ever turned
# on, so the check said yes when nothing was listening on port 22. The console
# was killed and there was no way in.
#
# So: the console stays reachable by default. Getting to it still needs the Pi
# login password, which is enough for a field device. Pass --hard-lock to remove
# it, and even then we verify SSH is genuinely listening first.
if (( CAGE_VT_OK )); then
  ALLOW_VT="-s"
  CONSOLE_NOTE="(console left reachable — this is the default)"
else
  ALLOW_VT=""
  CONSOLE_NOTE="(UNAVAILABLE — this cage build has no -s; use the SD-card hatch)"
fi
WANT_HARD_LOCK=0
for arg in "$@"; do [[ "$arg" == "--hard-lock" ]] && WANT_HARD_LOCK=1; done

if (( HARD_LOCK )) && (( WANT_HARD_LOCK )); then
  # A real check: is something actually accepting connections on port 22 now?
  SSH_LIVE=0
  if command -v ss > /dev/null && ss -ltn 2>/dev/null | grep -qE '[:.]22 '; then
    SSH_LIVE=1
  elif command -v nc > /dev/null && nc -z -w2 127.0.0.1 22 2>/dev/null; then
    SSH_LIVE=1
  elif timeout 2 bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/22' 2>/dev/null; then
    SSH_LIVE=1
  fi

  if (( SSH_LIVE )) && systemctl is-active ssh > /dev/null 2>&1; then
    ALLOW_VT=""
    CONSOLE_NOTE="(DISABLED by --hard-lock — use SSH or the SD card)"
    echo "    SSH is listening on port 22 — removing the console as requested."
    echo "    Recovery: SSH in and run vajron-unlock, or use the SD-card escape hatch."
  else
    echo
    echo "    --hard-lock requested, but nothing is listening on port 22." >&2
    echo "    Keeping the console reachable so you cannot be locked out." >&2
    echo "    Enable SSH first: sudo raspi-config > Interface Options > SSH." >&2
  fi
fi

# ----------------------------------------------------------------- the bundle
echo "==> Installing the app bundle to ${APP_DIR}"
sudo mkdir -p "$APP_DIR"
sudo rm -rf "${APP_DIR}/dist"
sudo cp -r "${SCRIPT_DIR}/dist" "${APP_DIR}/dist"

echo "==> Installing the file server (port ${PORT})"
sed "s/vajron-gcs-user-placeholder/${RUN_USER}/" "${SCRIPT_DIR}/vajron-gcs.service" \
  | sudo tee /etc/systemd/system/vajron-gcs.service > /dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now vajron-gcs.service

for _ in $(seq 1 20); do curl -fsS -o /dev/null "${URL}/" && break; sleep 0.5; done
curl -fsS -o /dev/null "${URL}/" \
  || { echo "ERROR: server did not come up. Check: sudo systemctl status vajron-gcs" >&2; exit 1; }
echo "    serving OK"

# ----------------------------------------------------------------- browser lock
echo "==> Confining Chromium to the GCS"
if [[ -f "${SCRIPT_DIR}/chromium-policy.json" ]]; then
  for d in /etc/chromium/policies/managed /etc/chromium-browser/policies/managed; do
    sudo mkdir -p "$d"
    sudo cp "${SCRIPT_DIR}/chromium-policy.json" "${d}/vajron-gcs.json"
  done
  echo "    policy installed — no other address will load"
else
  echo "    WARNING: chromium-policy.json missing; the browser will NOT be restricted" >&2
fi

# ----------------------------------------------------------------- kiosk
echo "==> Installing the kiosk"
sudo tee /usr/local/bin/vajron-gcs-kiosk > /dev/null <<KIOSK
#!/usr/bin/env bash
# Waits for the bundle to be served, then puts the GCS on screen fullscreen.
for _ in \$(seq 1 60); do
  curl -fsS -o /dev/null "${URL}/" && break
  sleep 1
done

# Clear any "restore pages?" state from an unclean shutdown in the field.
PROFILE="\${HOME}/.config/chromium/Default/Preferences"
[[ -f "\$PROFILE" ]] && sed -i \\
  's/"exit_type":"Crashed"/"exit_type":"Normal"/; s/"exited_cleanly":false/"exited_cleanly":true/' \\
  "\$PROFILE" 2>/dev/null || true

CHROME_ARGS=(
  --kiosk
  --app="${URL}"
  --noerrdialogs
  --disable-infobars
  --disable-session-crashed-bubble
  --disable-features=TranslateUI,Translate
  --disable-pinch
  --overscroll-history-navigation=0
  --check-for-update-interval=31536000
  --autoplay-policy=no-user-gesture-required
  --start-fullscreen
)

if command -v cage > /dev/null; then
  # cage is a kiosk compositor: one app, no desktop, and (without -s) no way to
  # switch to a console.
  exec cage ${ALLOW_VT} -- "${BROWSER}" "\${CHROME_ARGS[@]}"
else
  exec "${BROWSER}" "\${CHROME_ARGS[@]}"
fi
KIOSK
sudo chmod +x /usr/local/bin/vajron-gcs-kiosk

sudo install -m 755 "${SCRIPT_DIR}/vajron-unlock" /usr/local/bin/vajron-unlock
sudo install -m 755 "${SCRIPT_DIR}/vajron-lock"   /usr/local/bin/vajron-lock

if (( HARD_LOCK )); then
  echo "==> Booting straight into the kiosk (no desktop)"
  # Console boot: nothing starts a desktop session, so nothing is behind the app.
  sudo raspi-config nonint do_boot_behaviour B2 2>/dev/null \
    || echo "    (could not set console autologin automatically)"

  sed -e "s/VAJRON_USER/${RUN_USER}/" -e "s/VAJRON_UID/${RUN_UID}/" \
    "${SCRIPT_DIR}/vajron-gcs-kiosk.service" \
    | sudo tee /etc/systemd/system/vajron-gcs-kiosk.service > /dev/null
  sudo systemctl daemon-reload
  sudo systemctl enable vajron-gcs-kiosk.service

  # A desktop login manager would fight the kiosk for tty1.
  sudo systemctl disable lightdm.service 2>/dev/null || true

  # Remove the older desktop-autostart hook, if a previous install left one.
  rm -f "$(getent passwd "$RUN_USER" | cut -d: -f6)/.config/autostart/vajron-gcs.desktop" 2>/dev/null || true
else
  echo "==> Setting up desktop autostart (fallback mode)"
  RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
  mkdir -p "${RUN_HOME}/.config/autostart"
  cat > "${RUN_HOME}/.config/autostart/vajron-gcs.desktop" <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=Vajron GCS
Exec=/usr/local/bin/vajron-gcs-kiosk
X-GNOME-Autostart-enabled=true
DESKTOP
  sudo raspi-config nonint do_boot_behaviour B4 2>/dev/null || true
fi

# ----------------------------------------------------------------- display
# Where the FAT32 boot partition is mounted. Bookworm and later use
# /boot/firmware; older images use /boot. This is the partition a Mac or Windows
# machine sees as "bootfs", so it is also where the escape-hatch file goes —
# report the real one rather than guessing in the instructions below.
BOOT_DIR=""
for candidate in /boot/firmware /boot; do
  [[ -f "${candidate}/cmdline.txt" ]] && { BOOT_DIR="$candidate"; break; }
done
if [[ -z "$BOOT_DIR" ]]; then
  echo "    WARNING: could not find the boot partition (no cmdline.txt)." >&2
  echo "    The SD-card escape hatch may not work — verify before relying on it." >&2
  BOOT_DIR="/boot/firmware"
fi

echo "==> Stopping the screen from blanking mid-flight"
if ! grep -q "consoleblank=0" "${BOOT_DIR}/cmdline.txt" 2>/dev/null; then
  sudo sed -i "1 s|$| consoleblank=0|" "${BOOT_DIR}/cmdline.txt" 2>/dev/null || true
fi
sudo raspi-config nonint do_blanking 1 2>/dev/null || true

# Ctrl+Alt+Del rebooting the GCS mid-survey is not wanted.
sudo systemctl mask ctrl-alt-del.target 2>/dev/null || true

cat <<DONE

======================================================================
Done. Reboot and the Pi comes up straight into the GCS.

    sudo reboot

THREE WAYS BACK IN — in order of convenience:

 1. Console:  Ctrl+Alt+F2, log in, then:  vajron-unlock
    ${CONSOLE_NOTE}

 2. SSH:      ssh ${RUN_USER}@<pi-ip>   then:  vajron-unlock
    Find the IP from your router, or run 'hostname -I' before locking.

 3. SD CARD — works even if 1 and 2 both fail. No login, no network:
    Power off, put the card in any Mac or Windows machine, and create an
    empty file called  vajron-nokiosk  on the small FAT32 "bootfs" volume
    (that volume is ${BOOT_DIR} when the Pi is running).
    On a Mac, in Terminal:  touch /Volumes/bootfs/vajron-nokiosk
    Make sure it has NO .txt on the end.
    Put the card back and boot: the kiosk stays off and you get a console.
    Delete that file to re-arm the kiosk.

Other commands:
    vajron-unlock --desktop    stop the kiosk and start the desktop
    vajron-lock                put the kiosk back

Checks:
    sudo systemctl status vajron-gcs         is the bundle being served?
    sudo systemctl status vajron-gcs-kiosk   is the kiosk running?
    sudo journalctl -u vajron-gcs-kiosk -f   kiosk log
======================================================================
DONE
