#!/bin/bash
# PaperVault.app launcher.
#
# PaperVault's executable is a small local web server (the app must run over
# http://127.0.0.1 so the camera, QR scanner and Web Crypto get a secure
# context). This wrapper starts that server, shows a native "Quit" dialog so a
# non-technical user has an obvious way to stop it, and shuts the server down
# when they quit — no Terminal, no orphaned process.
set -u
RES="$(cd "$(dirname "$0")/../Resources" && pwd)"
LOG="$(mktemp -t papervault)"

"$RES/papervault" >"$LOG" 2>&1 &
PID=$!

# Wait up to ~5s for the server to announce its URL.
for _ in $(seq 1 25); do
  grep -q '127.0.0.1:' "$LOG" 2>/dev/null && break
  sleep 0.2
done
URL="$(grep -oE 'http://127\.0\.0\.1:[0-9]+' "$LOG" | head -1)"
[ -z "$URL" ] && URL="(it opens in your browser automatically)"

# Blocking dialog with a single Quit button. URL + icon path passed as argv so
# there is no shell-quoting to get wrong.
osascript - "$URL" "$RES/icon.png" <<'APPLESCRIPT' >/dev/null 2>&1
on run argv
  set theURL to item 1 of argv
  set iconPath to item 2 of argv
  set msg to "PaperVault is running." & return & return & ¬
    "Open it in your browser at:" & return & theURL & return & return & ¬
    "Keep this open while you use PaperVault. Click Quit to stop the server."
  try
    display dialog msg buttons {"Quit"} default button "Quit" ¬
      with title "PaperVault" with icon POSIX file iconPath
  on error
    display dialog msg buttons {"Quit"} default button "Quit" with title "PaperVault"
  end try
end run
APPLESCRIPT

kill "$PID" >/dev/null 2>&1
pkill -P "$PID" >/dev/null 2>&1
rm -f "$LOG"
exit 0
