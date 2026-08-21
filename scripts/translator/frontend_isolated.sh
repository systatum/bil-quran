#!/bin/bash

set -a
source .env-public
source .env
set +a

uv run --package --isolated frontend jupyter lab ./frontend
