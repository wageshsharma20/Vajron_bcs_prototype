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
# Capture the help text first, then grep it. `cage -h` exits non-zero after
# printing usage, and under `set -o pipefail` a pipeline takes the failing
# status of cage even when grep matched -- so the old one-line check ALWAYS
# concluded "no -s", and every install shipped with Ctrl+Alt+F2 disabled.
CAGE_HELP="$(cage -h 2>&1 || true)"
if command -v cage > /dev/null && ! printf '%s\n' "$CAGE_HELP" | grep -qE "^[[:space:]]*-s([[:space:]]|,|$)"; then
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

# ----------------------------------------------------------------- router
# mavlink-router owns the link to the flight controller and fans it out, so
# the bridge and every QGroundControl are independent peers. Without it, QGC
# had to sit in the middle and forward to the bridge, and closing QGC took the
# DDA GCS down with it.
echo "==> Installing mavlink-router"
ROUTER_OK=1
ROUTER_BIN="$(command -v mavlink-routerd || true)"
if [[ -z "$ROUTER_BIN" ]]; then
  sudo apt-get update -qq || true
  # Packaged on some images; otherwise build the upstream source.
  sudo apt-get install -y -qq mavlink-router 2>/dev/null || true
  ROUTER_BIN="$(command -v mavlink-routerd || true)"
fi
if [[ -z "$ROUTER_BIN" ]]; then
  echo "    not packaged here - building from source (a few minutes on a Pi 4)…"
  sudo apt-get install -y -qq git meson ninja-build pkg-config gcc g++ || true
  SRC="$(mktemp -d)"
  # Pinned to a release so a rebuild next year cannot pull in a different
  # router; falls back to the default branch only if that tag is unreachable.
  if git clone -q --depth 1 --branch v4 --recurse-submodules --shallow-submodules \
       https://github.com/mavlink-router/mavlink-router.git "$SRC/mr" 2>/dev/null \
     || git clone -q --depth 1 --recurse-submodules --shallow-submodules \
       https://github.com/mavlink-router/mavlink-router.git "$SRC/mr"; then
    ( cd "$SRC/mr" && meson setup build . --buildtype=release > /dev/null \
      && ninja -C build > /dev/null && sudo ninja -C build install > /dev/null ) || true
  fi
  rm -rf "$SRC"
  ROUTER_BIN="$(command -v mavlink-routerd || ls /usr/local/bin/mavlink-routerd 2>/dev/null || true)"
fi

if [[ -z "$ROUTER_BIN" ]]; then
  ROUTER_OK=0
  echo "    WARNING: mavlink-router could not be installed (no internet?)." >&2
  echo "    The bridge still listens on UDP 14551: point QGC's MAVLink forwarding" >&2
  echo "    at this Pi to use the old QGC-in-the-middle setup." >&2
else
  echo "    router: ${ROUTER_BIN}"
  # The upstream build installs its own unit reading /etc/mavlink-router; a
  # second router fighting ours for the serial port would drop packets.
  sudo systemctl disable --now mavlink-router.service > /dev/null 2>&1 || true

  # Which device is the flight controller? /dev/serial/by-id names survive
  # reboots and replugging, where ttyACM0/ttyACM1 can swap. Override with
  # VAJRON_FC_DEVICE=... and VAJRON_FC_BAUD=... when running this script.
  FC_DEVICE="${VAJRON_FC_DEVICE:-}"
  if [[ -z "$FC_DEVICE" ]]; then
    FC_DEVICE="$(ls /dev/serial/by-id/* 2>/dev/null | head -1 || true)"
  fi
  if [[ -z "$FC_DEVICE" ]]; then
    FC_DEVICE=/dev/ttyACM0
    echo "    no flight controller plugged in - assuming ${FC_DEVICE}"
    echo "    (USB Pixhawk). Re-run with VAJRON_FC_DEVICE=... if it is wired differently."
  fi
  # 57600 is the SiK telemetry-radio standard; a USB Pixhawk ignores baud.
  # A Pixhawk wired to the Pi's GPIO UART on TELEM2 usually wants 921600.
  FC_BAUD="${VAJRON_FC_BAUD:-57600}"
  echo "    flight controller: ${FC_DEVICE} @ ${FC_BAUD}"

  sudo mkdir -p "$CONF_DIR"
  sed -e "s|VAJRON_FC_DEVICE|${FC_DEVICE}|" -e "s|VAJRON_FC_BAUD|${FC_BAUD}|" \
    "${SCRIPT_DIR}/mavlink-router.conf" | sudo tee "${CONF_DIR}/mavlink-router.conf" > /dev/null
  sed "s|VAJRON_ROUTER_BIN|${ROUTER_BIN}|" "${SCRIPT_DIR}/vajron-router.service" \
    | sudo tee /etc/systemd/system/vajron-router.service > /dev/null
  sudo systemctl daemon-reload
  sudo systemctl enable --now vajron-router.service
  echo "    QGroundControl: add a TCP comm link to this Pi, port 5760"
fi

echo "==> Installing the MAVLink bridge (UDP 14551 -> HTTP 8082)"
if [[ -d "${SCRIPT_DIR}/bridge" ]]; then
  sudo rm -rf "${APP_DIR}/bridge"
  sudo cp -r "${SCRIPT_DIR}/bridge" "${APP_DIR}/bridge"
  # MAVLink signing key. Optional, and harmless to set before the aircraft has
  # it: an aircraft with no key accepts signed commands, and unsigned telemetry
  # is still accepted until you deliberately add --require-signed.
  # Pass VAJRON_SIGNING_PASSPHRASE=... to script this.
  SIGNING_KEY_FILE="${CONF_DIR}/mavlink-signing.key"
  SIGNING_ARGS=""
  if [[ ! -f "$SIGNING_KEY_FILE" ]]; then
    SIGN_PASS="${VAJRON_SIGNING_PASSPHRASE:-}"
    if [[ -z "$SIGN_PASS" && -t 0 ]]; then
      echo
      echo "    MAVLink signing passphrase (protects the aircraft from forged commands)."
      echo "    Keep it safe: an aircraft that enforces signing ignores any ground"
      echo "    station without it. See bridge/README.md before entering it in QGC."
      read -rsp "    Passphrase (Enter to skip): " SIGN_PASS; echo
    fi
    if [[ -n "$SIGN_PASS" ]]; then
      printf '%s\n' "$SIGN_PASS" | sudo tee "$SIGNING_KEY_FILE" > /dev/null
      unset SIGN_PASS
    fi
  fi
  if [[ -f "$SIGNING_KEY_FILE" ]]; then
    # Readable by the bridge's user only. This file IS the key.
    sudo chown "root:${RUN_USER}" "$SIGNING_KEY_FILE"
    sudo chmod 640 "$SIGNING_KEY_FILE"
    SIGNING_ARGS="--signing-key-file ${SIGNING_KEY_FILE}"
    echo "    signing key: ${SIGNING_KEY_FILE} (commands signed, telemetry verified)"
  else
    echo "    signing: off (re-run with VAJRON_SIGNING_PASSPHRASE=... to enable)"
  fi
  sed -e "s/vajron-gcs-user-placeholder/${RUN_USER}/" -e "s|VAJRON_SIGNING_ARGS|${SIGNING_ARGS}|" \
    "${SCRIPT_DIR}/vajron-mavlink.service" \
    | sudo tee /etc/systemd/system/vajron-mavlink.service > /dev/null
  sudo systemctl daemon-reload
  sudo systemctl enable --now vajron-mavlink.service
  echo "    bridge running - point QGroundControl's MAVLink forwarding at this Pi:14551"
  # Receive-only unless someone deliberately turns commanding on: the unit ships
  # without --command-link, and enabling it is an edit plus a restart. A ground
  # station that can arm an aircraft the moment it is installed is not a default
  # anyone should get by accident.
  if python3 -c "import pymavlink" 2>/dev/null; then
    echo "    pymavlink present - commanding can be enabled by editing the unit"
  else
    echo "    (telemetry only; for commanding: pip3 install pymavlink, then add"
    echo "     --command-link to /etc/systemd/system/vajron-mavlink.service)"
  fi
else
  echo "    WARNING: no bridge/ in the payload; the GCS will stay in demo mode" >&2
fi

# Prove the chain, rather than assume it: aircraft -> router -> bridge.
if (( ROUTER_OK )) && systemctl is-active --quiet vajron-mavlink.service; then
  echo "==> Checking the aircraft link (up to 20s)"
  LINK_SEEN=0
  for _ in $(seq 1 20); do
    if curl -fsS http://localhost:8082/health 2>/dev/null | grep -q '"connected": true'; then
      LINK_SEEN=1; break
    fi
    sleep 1
  done
  if (( LINK_SEEN )); then
    echo "    aircraft heartbeat received through the router - link OK"
  elif systemctl is-active --quiet vajron-router.service; then
    echo "    router running, but no aircraft heard yet. Normal if the flight"
    echo "    controller is off or unplugged; check later with:"
    echo "        curl localhost:8082/health"
  else
    echo "    WARNING: the router is not running - most likely the device path"
    echo "    is wrong. See: sudo journalctl -u vajron-router -n 30" >&2
  fi
fi

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

# ----------------------------------------------------------------- panic key
# Ctrl+Alt+Shift+Q, read straight from the kernel's input devices.
#
# This is the piece that was missing. Everything else here can only be escaped
# from a console, and reaching a console means the fullscreen app has already
# let go of the screen. A key bound inside the compositor is no good either:
# Chromium in kiosk mode grabs the keyboard, so compositor-level and X-level
# bindings get swallowed by the very app you are trying to close. triggerhappy
# reads /dev/input/event* below all of that, where nothing can intercept it.
echo "==> Installing the panic key (Ctrl+Alt+Shift+Q)"
HOTKEY_OK=1
if ! command -v thd > /dev/null; then
  echo "    installing triggerhappy…"
  # The cage block above only refreshes the package lists when cage is missing,
  # so on a Pi that already had cage the lists may be stale and the install
  # would fail for no visible reason.
  sudo apt-get update -qq || true
  sudo apt-get install -y -qq triggerhappy || true
fi

if ! command -v thd > /dev/null; then
  echo "    WARNING: triggerhappy could not be installed (no internet?)." >&2
  echo "    The panic key will NOT work. Console, SSH and the SD-card hatch still do." >&2
  HOTKEY_OK=0
else
  sudo install -m 755 "${SCRIPT_DIR}/vajron-panic"        /usr/local/bin/vajron-panic
  sudo install -m 755 "${SCRIPT_DIR}/vajron-test-hotkey"  /usr/local/bin/vajron-test-hotkey
  sudo mkdir -p /etc/triggerhappy/triggers.d
  sudo install -m 644 "${SCRIPT_DIR}/vajron-hotkey.conf" \
       /etc/triggerhappy/triggers.d/vajron-gcs.conf

  # The daemon ships running as 'nobody', which cannot call systemctl. The key
  # would be seen, the script would run, and nothing would happen — the worst
  # kind of failure, because it looks like the key is dead. Run it as root.
  THD_BIN="$(command -v thd)"
  sudo mkdir -p /etc/systemd/system/triggerhappy.service.d
  sudo tee /etc/systemd/system/triggerhappy.service.d/vajron.conf > /dev/null <<THD
[Service]
ExecStart=
ExecStart=${THD_BIN} --triggers /etc/triggerhappy/triggers.d/ --socket /run/thd.socket --user root --deviceglob /dev/input/event*
THD

  sudo systemctl daemon-reload
  sudo systemctl enable triggerhappy.service > /dev/null 2>&1 || true
  sudo systemctl restart triggerhappy.service || true
  sleep 1
  if systemctl is-active --quiet triggerhappy.service; then
    echo "    panic key armed"
  else
    echo "    WARNING: triggerhappy did not start. Check: journalctl -u triggerhappy" >&2
    HOTKEY_OK=0
  fi
fi

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

# ----------------------------------------------------------------- self-test
# Proving the way out works is worth more than any amount of documentation
# claiming it does. Done here, before the first reboot, while the screen is
# still a normal console and a failure costs nothing.
HOTKEY_VERIFIED=0
if (( HOTKEY_OK )); then
  echo
  echo "======================================================================"
  echo "One last step: let us prove the panic key works BEFORE you rely on it."
  echo "======================================================================"
  if sudo /usr/local/bin/vajron-test-hotkey 30; then
    HOTKEY_VERIFIED=1
  else
    echo
    echo "    The panic key did not fire. Not fatal — the console, SSH and the" >&2
    echo "    SD-card hatch below all still work. Re-test later with:" >&2
    echo "        sudo vajron-test-hotkey" >&2
  fi
fi

if (( HOTKEY_VERIFIED )); then
  PANIC_NOTE="Ctrl+Alt+Shift+Q  — TESTED AND WORKING on this Pi"
elif (( HOTKEY_OK )); then
  PANIC_NOTE="Ctrl+Alt+Shift+Q  — installed but NOT yet proven (run: sudo vajron-test-hotkey)"
else
  PANIC_NOTE="NOT INSTALLED (triggerhappy missing) — use the console, SSH or the SD card"
fi

cat <<DONE

======================================================================
Done. Reboot and the Pi comes up straight into the GCS.

    sudo reboot

THREE WAYS BACK IN — in order of convenience:

 1. PANIC KEY — the fastest way, works while the GCS is fullscreen:
    ${PANIC_NOTE}
    Press it and the GCS closes and hands you a login prompt.
    Put it back with:  vajron-lock

 2. Console:  Ctrl+Alt+F2, log in, then:  vajron-unlock
    ${CONSOLE_NOTE}

 3. SSH:      ssh ${RUN_USER}@<pi-ip>   then:  vajron-unlock
    Find the IP from your router, or run 'hostname -I' before locking.

 4. SD CARD — works even if everything above fails. No login, no network:
    Power off, put the card in any Mac or Windows machine, and create an
    empty file called  vajron-nokiosk  on the small FAT32 "bootfs" volume
    (that volume is ${BOOT_DIR} when the Pi is running).
    On a Mac, in Terminal:  touch /Volumes/bootfs/vajron-nokiosk
    Make sure it has NO .txt on the end.
    Put the card back and boot: the kiosk stays off and you get a console.
    Delete that file to re-arm the kiosk.

Other commands:
    vajron-unlock --desktop    stop the kiosk and start the desktop
    sudo vajron-test-hotkey    re-prove the panic key at any time
    vajron-lock                put the kiosk back

Checks:
    sudo systemctl status vajron-gcs         is the bundle being served?
    sudo systemctl status vajron-gcs-kiosk   is the kiosk running?
    sudo journalctl -u vajron-gcs-kiosk -f   kiosk log
======================================================================
DONE
