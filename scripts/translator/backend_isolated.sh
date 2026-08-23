#!/bin/bash

set -a
source .env-public
source .env
set +a

uv run --package backend --isolated fastapi dev --entrypoint backend.main:app --reload-dir backend/src
