#!/bin/sh
set -eu
[ "$#" -eq 1 ] || { echo "Usage: sh scripts/restore-test.sh BACKUP_PATH" >&2; exit 2; }
# Implementation creates a random linxiaobang_restore_ database, verifies all rows,
# and removes only that database in its finally cleanup. No existing target is accepted.
exec node --import tsx scripts/restore-test.ts "$1"
