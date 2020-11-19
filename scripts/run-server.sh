#!/bin/bash

# This script executes on docker container start.

echo "Starting node.js server"
set -e
exec node build/server.js
