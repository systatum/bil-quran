#!/bin/bash

set -a
source .env
source .env-public
set +a

export UV_INDEX_STRATEGY=unsafe-first-match

uv run --package backend --dev fastapi dev --entrypoint backend.main:app --reload-dir backend/src
