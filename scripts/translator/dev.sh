#!/bin/bash
export HF_HOME=./hf_cache
fastapi dev --entrypoint src.main:app --reload-dir src
