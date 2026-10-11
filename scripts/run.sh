#!/bin/bash
# Demo keep-alive: keeps the Mac awake (caffeinate) and restarts Kin 2 s after it exits. Ctrl-C stops both.
cd "$(dirname "$0")/.." || exit 1
mkdir -p logs

caffeinate -dimsu -w $$ &
CAF=$!
trap 'kill "$CAF" 2>/dev/null; kill "$KIN" 2>/dev/null; exit 0' INT TERM

n=0
while true; do
  n=$((n + 1))
  echo "[$(date '+%H:%M:%S')] run.sh: starting Kin (run $n)" >> logs/kin.log
  ~/.bun/bin/bun src/main.ts >> logs/kin.log 2>&1 &
  KIN=$!
  wait "$KIN"
  code=$?
  echo "[$(date '+%H:%M:%S')] run.sh: Kin exited (code $code); restarting in 2 s" >> logs/kin.log
  sleep 2
done
