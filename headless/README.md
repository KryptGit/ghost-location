# Headless deployment (custom hardware / dongle prototype)

This runs Ghost's existing `backend/` and iOS sidecar without Electron, as a
plain Node HTTP server. It's meant for a small Linux board (prototyping on a
Raspberry Pi **Compute Module 4 IO Board** before committing to a custom
carrier PCB) that:

- acts as its own Wi-Fi access point (`hostapd` + `dnsmasq`),
- USB-hosts an iPhone plugged in with a standard (already MFi-certified)
  Lightning-to-USB cable, and
- serves the Ghost map UI to a browser on the same AP, so no keyboard/screen
  is needed on the board itself.

No code in `backend/` changes. Only `electron/main.mjs`'s IPC layer is
replaced — `headless/server.mjs` swaps `ipcMain`/`contextBridge` for a small
HTTP + Server-Sent-Events API, and `headless/bridge.js` is a drop-in browser
replacement for `electron/preload.cjs`'s `window.ghost`.

## 1. Flash and boot the board

Raspberry Pi OS **Lite** (64-bit), headless, SSH enabled via `rpi-imager`'s
advanced options (set hostname/SSH/Wi-Fi-for-setup-only there — the board's
*runtime* Wi-Fi will be its own AP, configured below).

## 2. System packages

```sh
sudo apt update
sudo apt install -y nodejs npm python3-venv python3-pip hostapd dnsmasq adb git
sudo systemctl unmask hostapd
```

(Use NodeSource's Node 24 setup script if the apt version is too old — check
`node -v` against the `engines` this project expects.)

## 3. Wi-Fi access point (hostapd + dnsmasq)

Give `wlan0` a static IP and stop it from asking for DHCP:

`/etc/dhcpcd.conf` (append):
```
interface wlan0
    static ip_address=192.168.50.1/24
    nohook wpa_supplicant
```

`/etc/hostapd/hostapd.conf`:
```
interface=wlan0
driver=nl80211
ssid=Ghost-Setup
hw_mode=g
channel=6
wpa=2
wpa_passphrase=<choose-a-real-passphrase>
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
```

`/etc/default/hostapd`: set `DAEMON_CONF="/etc/hostapd/hostapd.conf"`.

`/etc/dnsmasq.conf` (append):
```
interface=wlan0
dhcp-range=192.168.50.10,192.168.50.100,255.255.255.0,24h
```

```sh
sudo systemctl enable hostapd dnsmasq
sudo systemctl restart dhcpcd hostapd dnsmasq
```

The iPhone joins `Ghost-Setup` over Wi-Fi for the **control UI** — this is
separate from, and in addition to, the USB cable used for the actual
location-spoofing protocol. iOS supports both simultaneously.

## 4. iOS sidecar (pure Python — no bundled-executable build needed)

The packaged desktop build only cross-compiles the sidecar for
darwin/win32 (`scripts/build-ios-sidecar.mjs`), but `backend/ios.mjs` falls
back to invoking `sidecar/ios_bridge.py` directly through a local venv when
no bundled executable is present — which is all Linux/ARM needs, since
`pymobiledevice3` is pure Python:

```sh
cd ghost-location/sidecar
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## 5. Run it

```sh
cd ghost-location
npm ci
npm run headless   # builds the renderer, then starts headless/server.mjs
```

By default it binds `0.0.0.0:8080` — on the finished board, set
`GHOST_HEADLESS_BIND=192.168.50.1` (the AP's own address) so it's never
reachable from anything but a phone joined to `Ghost-Setup`. From the
iPhone's Safari, browse to `http://192.168.50.1:8080`.

## 6. Run at boot (systemd)

`/etc/systemd/system/ghost-headless.service`:
```ini
[Unit]
Description=Ghost headless location server
After=network.target hostapd.service dnsmasq.service

[Service]
Type=simple
WorkingDirectory=/home/pi/ghost-location
Environment=GHOST_HEADLESS_BIND=192.168.50.1
ExecStart=/usr/bin/node headless/server.mjs
Restart=on-failure
User=pi

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl enable --now ghost-headless
```

Run `npm run build` once ahead of time (or as an `ExecStartPre`) so the
service doesn't rebuild the renderer on every boot.

## What's different from the desktop app

- `network()` always reports `{wifi: true}` — the board doesn't ask "do I
  have Wi-Fi," it *is* the Wi-Fi. `setConnection('wifi')` in the UI still
  refers to the **iPhone's** transport (USB vs. Apple's wireless-debugging
  style connection), same as on desktop.
- `installRuntime` is disabled — device tools are installed once at image/
  provisioning time, not on demand from the UI, since there's no dialog UX
  on a headless board.
- Everything else — `Controller`, `IosAdapter`, `AndroidAdapter`, recovery
  journal, route playback — is the unmodified code from `backend/`.
