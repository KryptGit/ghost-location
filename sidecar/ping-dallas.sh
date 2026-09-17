#!/bin/bash
# Holds the connected iPhone's simulated location at downtown Dallas, TX for a
# fixed duration, using one persistent ios_bridge.py session.
#
# Earlier version of this script called `pymobiledevice3 developer dvt
# simulate-location set` in a loop. Each call opens and tears down its own
# DVT tunnel, so the location snaps back to the phone's real GPS between
# calls instead of holding. This version instead drives ios_bridge.py's
# JSONL protocol directly, which keeps one tunnel open and reasserts the
# target once a second internally (see sidecar/ios_bridge.py's
# refresh_session) until the session is closed.
set -e
cd "$(dirname "$0")"
source .venv/bin/activate

LAT=32.7767
LON=-96.7970
DURATION=${1:-60}

UDID=$(pymobiledevice3 usbmux list | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['Identifier'])")
if [ -z "$UDID" ]; then
  echo "No iPhone found. Check USB connection and usbmuxd." >&2
  exit 1
fi

echo "Holding ($LAT, $LON) on $UDID for ${DURATION}s..."
(
  printf '%s\n' "{\"id\":1,\"method\":\"prepare\",\"params\":{\"udid\":\"$UDID\"}}"
  printf '%s\n' "{\"id\":2,\"method\":\"set\",\"params\":{\"udid\":\"$UDID\",\"latitude\":$LAT,\"longitude\":$LON}}"
  sleep "$DURATION"
) | python ios_bridge.py

echo "Done — session closed, real GPS restored."
