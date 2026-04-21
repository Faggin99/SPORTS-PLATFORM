#!/bin/bash
set -e
cd "$(dirname "$0")"

# Start Xvfb if not running
if ! pgrep -x Xvfb > /dev/null; then
    Xvfb :99 -screen 0 1024x768x24 -nolisten tcp > /tmp/xvfb.log 2>&1 &
    sleep 2
fi

export DISPLAY=:99
export WINEDEBUG=-all
export WINEDLLOVERRIDES="mscoree,mshtml="

# Initialize wine if needed
if [ ! -d "$HOME/.wine" ] || [ ! -f "$HOME/.wine/system.reg" ]; then
    wineboot --init 2>&1 | tail -5
    sleep 2
fi

# Build
npm run build:win 2>&1
