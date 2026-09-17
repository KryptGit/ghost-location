# Hardware bring-up log — first real device test (2026-09-15/16)

First end-to-end test of `sidecar/ios_bridge.py` against a real iPhone over
USB, run on physical Raspberry Pi hardware instead of a desktop. Kept here
because most of the debugging time went into USB host-mode issues that will
recur on any future board and are not obvious from the code alone.

## Boards tried

| Board | Result |
|---|---|
| Raspberry Pi Zero 2 W | **USB data port never enumerated any device, on any host.** Root-caused to a hardware fault on that specific unit's data port (see below) — not a software or cable issue. |
| Raspberry Pi 3B | **Works.** iPhone detected immediately (`lsusb` shows `ID 05ac:12a8 Apple, Inc.`), `pymobiledevice3 usbmux list` returns the device, location simulation confirmed working and holding. |

## Setup steps that worked (Pi 3, and should apply to any full-size Pi)

1. Flash Raspberry Pi OS Lite (64-bit) via Raspberry Pi Imager. Use the
   gear-icon (Ctrl+Shift+X) OS customisation screen to pre-set hostname, SSH
   (with a key, not just password — see below), and Wi-Fi.
2. `sudo apt install -y git python3-venv python3-pip usbmuxd libimobiledevice-utils`
3. `git clone https://github.com/KryptGit/ghost-location.git`
4. `cd ghost-location/sidecar && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
   — `piwheels.org` had prebuilt aarch64/Python 3.13 wheels for everything
   except one small package (`lzfse`, built from source in a few seconds).
   `cryptography` did **not** need a source build despite this being a very
   new Debian trixie/Python 3.13 image — worth re-checking if a future OS
   image is even newer than what piwheels has caught up to.
5. `usbmuxd` is socket/udev-activated, not enabled by default — it does not
   survive a reboot and must be started fresh each time:
   `sudo systemctl start usbmuxd`.
6. Plug the iPhone into any USB-A port (Pi 3/4) — no config needed, these
   ports are host-mode by hardware design. Unlock the phone, accept "Trust
   This Computer".

## The Zero 2 W rabbit hole (for the record, in case of a repeat)

This ate most of a night. Order of things tried and what was actually going
on, since only the last item was the real cause:

1. **Symptom:** `lsusb` on the Zero 2 W showed nothing but the root hub, no
   matter what cable/adapter combination was used.
2. **Wrong turn 1 — powering the Pi through the same port as the phone.**
   The Zero 2 W has two micro-USB ports: `PWR IN` (power only) and `USB`
   (data, OTG-capable). Early on, the phone was powering the Pi through the
   `USB` port via the adapter chain. This makes the Pi's controller sense
   incoming power from the far end and negotiate into **device** mode
   instead of host — it thinks it's the accessory being charged. Fix:
   dedicate a separate cable to `PWR IN` from an independent power source,
   keep `USB` free of any incoming power.
3. **Wrong turn 2 — forcing `dtoverlay=dwc2,dr_mode=host`.** This looked
   like the right fix for (2) and is a real, documented technique — but it
   backfired on this specific board. The boot log showed:
   ```
   dwc2 3f980000.usb: supply vusb_d not found, using dummy regulator
   dwc2 3f980000.usb: supply vusb_a not found, using dummy regulator
   ```
   The Zero 2 W has no proper VBUS regulator wired up in its device tree for
   the `dwc2` driver to control, so forcing that driver via overlay leaves
   the port never actually asserting power/readiness on the bus — zero
   enumeration events, indistinguishable from a dead port. **Once power was
   already correctly separated (fix from step 2), this overlay was
   unnecessary** — Raspberry Pi's own app note confirms the Zero family's
   stock `dwc_otg` driver defaults to host mode automatically with zero
   config, as long as the port isn't sensing reverse power. Reverting the
   overlay (deleting the line from `/boot/firmware/config.txt`, rebooting)
   restored the stock driver; still zero enumeration afterward, which is
   what pointed at the real cause below.
4. **Cable/adapter elimination.** Isolated variables one at a time against
   two independent known-good hosts (the Zero 2 W and a Windows laptop):
   - A suspected charge-only USB-C-to-USB-A converter was ruled out by
     testing phone + converter directly against the laptop — Windows saw
     nothing (`Get-PnpDevice -PresentOnly`, filtered on Apple vendor ID
     `05AC`), confirming that specific converter/cable combo didn't carry
     data on *any* host, not just the Pi.
   - The micro-USB cable itself was proven good independently by plugging
     an Xbox controller through it into the laptop and confirming input
     worked — ruling the cable back in.
   - A different converter + a genuine USB-A-to-USB-C cable, tested phone
     to laptop, worked (Windows could browse the phone's files) — proof
     the phone, trust pairing, and *a* correct cable combination all work.
   - The exact same proven-good combination, moved onto the Zero 2 W, still
     produced nothing.
5. **Conclusion:** with the cable proven good on two fronts (laptop
   round-trip, Xbox controller) and the Pi 3 immediately working with the
   same style of connection, the Zero 2 W's `USB` data port itself is the
   remaining variable — most likely a physical fault (cold solder joint or
   damaged connector), not anything fixable from software. Not re-tested
   after physical inspection/reflow; if this board is used again, check the
   port under magnification before assuming it's cable/software.

## Wrong idea worth flagging so it isn't retried

Plugging a USB-C hub's **upstream** (host-facing) connector into the iPhone,
hoping to use the hub "backwards" to bridge to a USB-A cable, does not work
and is not a config issue: whichever end a hub's upstream connector plugs
into becomes the **host** of that whole chain. Plugging it into the phone
makes the *phone* the host of the hub and everything behind it — the
opposite of what this software needs (the Pi must be host, the phone the
enumerated device). If the hub is genuine Thunderbolt (not just a fast
USB-C hub), it likely won't even initialize against a phone at all, since
Thunderbolt requires real host-controller silicon iPhones don't have.

## Operational notes

- **SSH key auth**, not password: sudo over a non-interactive SSH session
  fails ("a terminal is required to read the password") once the pi user's
  sudo credential cache expires, which happens mid-session. Password-gated
  commands (`systemctl start usbmuxd`, editing `/boot/firmware/config.txt`)
  had to be run by hand at the keyboard/in an interactive SSH session, not
  scripted.
- **`usbmuxd` must be restarted after every reboot** — it's not a persistent
  enabled service by default (`systemctl enable` on it says as much: no
  `[Install]` section, it's socket/udev-activated).
- **A one-shot CLI call does not hold a spoofed location.**
  `pymobiledevice3 developer dvt simulate-location set` opens a tunnel, sets
  the location once, and tears the tunnel down when the process exits —
  iOS reverts to real GPS the moment that happens. To hold a location, keep
  one `ios_bridge.py` session open and let its internal one-second refresh
  loop keep reasserting the same target (see `sidecar/ping-dallas.sh` for a
  working example, and `sidecar/README.md` for the underlying protocol).
