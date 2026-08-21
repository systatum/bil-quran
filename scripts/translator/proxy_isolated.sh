#!/bin/bash

set -a
source .env-public
source .env
set +a

uv run --package --isolated proxy python -m proxy.main
