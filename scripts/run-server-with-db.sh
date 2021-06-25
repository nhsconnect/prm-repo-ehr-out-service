#!/bin/bash

# This script executes on docker container start.
# It runs the DB migration and then starts node.js server

#Structured logging
NHS_SERVICE=repo-to-gp
timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}
function jsonPrettify {
  echo "{message: $1, level: $2, timestamp: `timestamp`, service: ${NHS_SERVICE}, environment: ${NHS_ENVIRONMENT} } "
}

DB_CONNECTION_TIMEOUT=30

count=0
while ! pg_isready -h ${DATABASE_HOST}; do
  jsonPrettify "Waiting for ${DATABASE_HOST}:5432" INFO
  sleep 1
  ((count++))
  if [ "${DB_CONNECTION_TIMEOUT}" -le $count ]; then
    jsonPrettify "Timed-out waiting for DB connection at ${DATABASE_HOST}:5432" WARN
    exit 5
  fi
done
set -e

jsonPrettify "Loading API Keys" INFO
source ./scripts/load-api-keys.sh

jsonPrettify "Starting node.js server" INFO
set -e
exec node build/server.js
