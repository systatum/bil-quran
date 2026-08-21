#!/bin/bash

set -a
source .env-public
source .env
set +a

export UV_INDEX_STRATEGY=unsafe-first-match

uv run --package backend --isolated fastapi dev --entrypoint backend.main:app --reload-dir backend/src
