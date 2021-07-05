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

jsonPrettify "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI=$AWS_CONTAINER_CREDENTIALS_RELATIVE_URI"
jsonPrettify "AWS_CONTAINER_CREDENTIALS_FULL_URI=$AWS_CONTAINER_CREDENTIALS_FULL_URI"

jsonPrettify "Running DB migrations" INFO
source ./scripts/migrate-db.sh

jsonPrettify "Loading API Keys" INFO
source ./scripts/load-api-keys.sh

jsonPrettify "Starting node.js server" INFO
set -e
exec node build/server.js
