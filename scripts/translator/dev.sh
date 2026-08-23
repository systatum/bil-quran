#!/bin/bash

set -a
source .env-public
source .env
set +a

uv sync --all-packages
hivemind
