#!/bin/sh
set -eu
[ "$#" -eq 1 ] || { echo "Usage: sh scripts/backup.sh OUTPUT_PATH" >&2; exit 2; }
exec node --import tsx scripts/backup.ts "$1"
