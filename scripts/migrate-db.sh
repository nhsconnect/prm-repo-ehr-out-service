#!/bin/bash

#
# @deprecated
# to be deleted in PRMT-4588

NHS_SERVICE=ehr-out-service
DB_CONNECTION_TIMEOUT=30

timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

function jsonPrettify {
  echo "{message: $1, level: $2, timestamp: `timestamp`, service: ${NHS_SERVICE}, environment: ${NHS_ENVIRONMENT} } "
}

if [ "${DB_SKIP_MIGRATION}" == "true" ]; then
  jsonPrettify "DB_SKIP_MIGRATION is set to true. Skipping DB migration" INFO
else
  jsonPrettify "Waiting for DB port to become open 5432" INFO
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
  jsonPrettify "DB connection at ${DATABASE_HOST}:5432 is available" INFO
  jsonPrettify "Trying to create a database, if not exists. 'Already exists' errors are safe to ignore" INFO
  PGPASSWORD="${DATABASE_PASSWORD}" createdb --host="${DATABASE_HOST}" --username="${DATABASE_USER}" $DATABASE_NAME || true
  set -e
  jsonPrettify "Migrating DB, will not migrate parts that have already been migrated (meta)"  INFO && \
  npx sequelize-cli db:migrate
  jsonPrettify "DB migration completed." INFO
fi