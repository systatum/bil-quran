#!/bin/bash

set -a
source .env-public
source .env
set +a

uv run --package proxy --isolated python -m proxy.main
