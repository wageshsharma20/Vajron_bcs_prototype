# Vajron GCS on a Raspberry Pi 4 (4 GB) — locked-down kiosk

The Pi powers on straight into the GCS, fullscreen, with **no desktop behind it**.
There is no panel, no launcher and no other application running, and the browser
is confined to the GCS itself. A **safe code** hands the Pi back when you need it.

Nothing is built on the Pi: Metro needs more RAM than a 4 GB Pi has spare and is
slow on ARM, so the bundle is built on the dev machine and copied across.

**On the Pi you need:** Raspberry Pi OS (64-bit recommended), Chromium, `python3`
(both preinstalled on the desktop image), and internet **once** so the installer
can `apt install cage`, the kiosk compositor.

---

## 1. On the Mac — build and pack

```bash
cd "~/Desktop/Vajron apps/AeroGuardAI_Command"
./deploy/pi/package-for-pi.sh
```

Writes `deploy/pi/vajron-gcs-pi.tar.gz` (~1.5 MB). That single file is everything.

## 2. Copy it over

```bash
scp deploy/pi/vajron-gcs-pi.tar.gz <pi-user>@<pi-host>.local:~/
```

A USB stick works just as well.

## 3. Enable SSH in Raspberry Pi Imager (recommended)

In Imager's settings, under **Services**, tick **Enable SSH** and set a password.
Do this while writing the card — it is far easier than turning it on afterwards.

SSH is not required: by default the installer leaves the console (`Ctrl+Alt+F2`)
reachable, so you always have a local way back in. SSH just makes remote admin
convenient.

## 4. Check the keyboard FIRST

Type a few letters and digits somewhere before you start. If the keyboard
produces Devanagari (or anything other than what you pressed), fix it now:

```bash
sudo raspi-config    # Localisation Options > Keyboard > English (US)
sudo reboot
```

This matters more than it looks. The installer asks you to invent a **safe
code**, and later you type that same code at the console to unlock the kiosk.
If the layout changes between those two moments, the code you set is not the
code you can type, and the console stops being a way back in.

## 5. Install

```bash
tar -xzf vajron-gcs-pi.tar.gz
cd vajron-gcs-pi
./install-on-pi.sh
```

It asks you to choose the **safe code**, twice. Only a salted SHA-256 of it is
stored (`/etc/vajron-gcs/unlock.hash`) — the code itself is never written to the
Pi. To script the install instead: `VAJRON_CODE='your-code' ./install-on-pi.sh`.

## 6. Reboot

```bash
sudo reboot
```

The Pi comes up in the GCS. That is the whole interface.

---

## Getting back in — four ways

**1. The panic key — `Ctrl` + `Alt` + `Shift` + `Q`.**

Press it any time, even with the GCS fullscreen. The app closes and you get a
login prompt. Put it back with `vajron-lock`.

This is read straight from the kernel's input devices by `triggerhappy`, not by
the compositor. That distinction is the whole reason it works: Chromium in kiosk
mode grabs the keyboard, so a key bound in the window manager, in X, or as a
browser shortcut gets swallowed by the app you are trying to escape. Reading
below the compositor is the only place a combination cannot be intercepted.

The installer **tests this key on your actual Pi** before it finishes, and prints
`TESTED AND WORKING` only if a real key press was detected. Re-test any time:

```bash
sudo vajron-test-hotkey
```

If it ever reports `nobody` in the triggerhappy command line, the key will appear
dead — the daemon runs unprivileged by default and cannot stop the kiosk. Re-run
`install-on-pi.sh`, which installs a drop-in to run it as root.

**2. Console (default).** `Ctrl+Alt+F2`, log in with your Pi username and
password, then:

```bash
vajron-unlock              # enter the safe code — the kiosk stops
vajron-unlock --desktop    # also start the desktop, if the image has one
vajron-lock                # put the kiosk back
```

**3. SSH.** `ssh <pi-user>@<pi-ip>`, then the same commands. Get the IP from your
router, or run `hostname -I` on the Pi before you lock it.

**4. The SD card — the one that cannot fail.**

Power the Pi off and put the card in any Mac or Windows machine. The small FAT32
volume (`bootfs`) mounts normally. Create an empty file on it named:

```
vajron-nokiosk
```

Put the card back and boot. The kiosk does not start and you get the ordinary
desktop. Delete the file to re-arm it.

This works with no Linux, no login, no password and no network — it is there so a
kiosk can never permanently lock you out of your own Pi.

Wrong safe codes add a growing delay (3 s per failure, capped at 30 s). A reboot
always brings the kiosk back.

### Removing the kiosk entirely

```bash
sudo systemctl disable --now vajron-gcs-kiosk vajron-gcs
sudo rm -f /etc/systemd/system/vajron-gcs*.service
sudo rm -f /etc/chromium/policies/managed/vajron-gcs.json \
           /etc/chromium-browser/policies/managed/vajron-gcs.json
sudo raspi-config nonint do_boot_behaviour B4   # back to desktop autologin
sudo reboot
```

## What "locked down" means here

| Layer | Effect |
|---|---|
| **Console boot, no desktop** | Nothing but the kiosk runs. There is no desktop to switch to, because none is started. |
| **cage kiosk compositor** | Runs exactly one app fullscreen — no desktop, panel or launcher. The console stays reachable at `Ctrl+Alt+F2` (needs the Pi password) unless you install with `--hard-lock`. |
| **Chromium managed policy** | Browsing restricted to `http://localhost:8080`. DevTools, incognito, sign-in, sync, printing and notifications are all disabled and cannot be re-enabled from the UI. |
| **Relaunch on exit** | systemd restarts the kiosk if it ever closes. |
| **Ctrl+Alt+Del masked** | No accidental reboot mid-survey. |
| **Safe code** | The supported way out, over console or SSH. |
| **SD-card escape hatch** | `vajron-nokiosk` on the boot partition stops the kiosk starting — recovery that needs no login at all. |

**Be clear about the limit:** this stops anyone using the Pi as a computer, which
is what a field GCS needs. It is not protection against someone who takes the
device apart — the SD card can be pulled and read on another machine. If you need
that, the next step is full-disk encryption, which is a separate piece of work.

## Updating after a code change

```bash
# Mac
./deploy/pi/package-for-pi.sh
scp deploy/pi/vajron-gcs-pi.tar.gz <pi-user>@<pi-host>.local:~/
# Pi
vajron-unlock
tar -xzf vajron-gcs-pi.tar.gz && cd vajron-gcs-pi && ./install-on-pi.sh
sudo reboot
```

Re-running is safe and idempotent. It will ask for a safe code again — reuse the
same one, or set a new one.

## Checks and troubleshooting

```bash
sudo systemctl status vajron-gcs          # is the bundle being served?
sudo systemctl status vajron-gcs-kiosk    # is the kiosk running?
sudo journalctl -u vajron-gcs-kiosk -f    # kiosk log
curl -I http://localhost:8080/            # expect 200
```

**Blank white screen.** Almost always the document root. The bundle loads its JS
from an absolute path (`/_expo/static/js/web/...`), so the server's root must be
the `dist` directory itself.

**Black screen, no app.** cage could not start — check the kiosk log. Usually the
service user lacks a seat; confirm the Pi is set to console autologin
(`sudo raspi-config` → System Options → Boot / Auto Login → Console Autologin).

**"cage could not be installed".** The Pi had no internet. Connect it, run
`sudo apt install -y cage`, then re-run the installer for the full lockdown.

## Notes

- The server binds `0.0.0.0`, so `http://<pi-host>.local:8080` also works from a
  laptop on the same network. Change `--bind` in `vajron-gcs.service` to
  `127.0.0.1` to keep it strictly on-device.
- Telemetry in this build is mock data (`src/services/telemetryService.ts`). A
  browser cannot read a serial link, so real MAVLink needs a small bridge
  (MAVLink → WebSocket) running alongside this server.
- The screens are a centred column capped at 600 px, which suits the official 7"
  800×480 touchscreen well.
