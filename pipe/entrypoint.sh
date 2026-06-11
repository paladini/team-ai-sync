#!/bin/sh
set -eu

export TEAM_AI_SYNC_PLATFORM="${TEAM_AI_SYNC_PLATFORM:-${PLATFORM:-bitbucket}}"

exec node /app/lib/cli.js
