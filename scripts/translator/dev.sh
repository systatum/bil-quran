#!/bin/bash

# Refer to docker-compose.yml for explanation on env vars
export ALT_SETTING_SYS_PATH=.
export ALT_SETTING_PYTHON_PATH=mount.setting
export MOUNT_ROOT=./mount
export APP_TOKEN=default_token
export HF_HOME=./mount/hf_cache

export UV_INDEX_STRATEGY=unsafe-first-match

uv run fastapi dev --entrypoint src.main:app --reload-dir src