#!/bin/bash
export HF_HOME=./hf_cache
fastapi dev src/main.py --reload-dir src
