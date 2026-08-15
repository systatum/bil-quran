#!/bin/bash

set -a
source .env
source .env-public
set +a

export UV_INDEX_STRATEGY=unsafe-first-match

uv run fastapi dev --entrypoint backend.src.main:app --reload-dir backend/src
