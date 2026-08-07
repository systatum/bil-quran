ARG BASE_IMAGE=nvidia/cuda:13.2.1-runtime-ubuntu22.04
FROM ghcr.io/astral-sh/uv:0.12.2 AS uv-base

##########################
# Generator/parser stage #
##########################
FROM ${BASE_IMAGE} AS generator

# Index strategy first match because some windows version stuff made a mess
ENV UV_LOCKED=1 \
    UV_INDEX_STRATEGY=unsafe-first-match

WORKDIR /packages

# We output what fixed large size python packages needs to be installed first before
# the smaller ones or our application code
RUN --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=.python-version,target=.python-version \
    --mount=from=uv-base,source=/uv,target=/bin/uv \
    --mount=type=cache,target=/root/.cache/uv \
    uv export --only-group=heavy --format pylock.toml --verbose > pylock.heavy.toml
##########################
# Generator/parser stage #
##########################

#################
# Runtime stage #
#################
FROM ${BASE_IMAGE}

# Link mode copy just in case (?) I guess. I forgot if it's needed
# HTTP timeout bumped from 30 default to 600 because cuda images are slow to download
ENV UV_LOCKED=1 \
    UV_INDEX_STRATEGY=unsafe-first-match \
    UV_LINK_MODE=copy \
    UV_HTTP_TIMEOUT=600

# Install uv
COPY --from=uv-base /uv /bin/uv

WORKDIR /app

# We need this because otherwise uv will pick an unsupported python version
COPY .python-version ./

# Install fixed large size python packages before anything that we realistically will modify semi-often
RUN --mount=from=generator,source=/packages/pylock.heavy.toml,target=/app/pylock.heavy.toml \
    --mount=type=cache,target=/root/.cache/uv \
    uv venv --verbose \
    && uv pip install -r pylock.heavy.toml --verbose

# Fetch other smaller deps
COPY pyproject.toml uv.lock ./

# Install other smaller deps
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --verbose

# Copy source code
COPY src src/

ENTRYPOINT ["uv", "run", "fastapi", "run", "--entrypoint", "src.main:app"]
#################
# Runtime stage #
#################
