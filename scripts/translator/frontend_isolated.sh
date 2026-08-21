#!/bin/bash

set -a
source .env-public
source .env
set +a

uv run --package frontend --isolated jupyter lab ./frontend
