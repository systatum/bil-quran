ARG BASE_IMAGE=nvidia/cuda:13.2.1-runtime-ubuntu24.04
FROM ghcr.io/astral-sh/uv:0.12.2 AS uv-base

##########################
# Generator/parser stage #
##########################
FROM ${BASE_IMAGE} AS generator

# Index strategy first match because some windows version stuff made a mess
ENV UV_LOCKED=1 \
    UV_INDEX_STRATEGY=unsafe-first-match \
    UV_HTTP_TIMEOUT=300

WORKDIR /app

RUN mkdir /packages

# We output what fixed large size python packages needs to be installed first before
# the smaller ones or our application code
RUN --mount=type=bind,source=.,target=. \
    --mount=from=uv-base,source=/uv,target=/bin/uv \
    --mount=type=cache,target=/root/.cache/uv \
    --mount=type=cache,target=/root/.local/share/uv/python \
    uv export --package=backend --only-group=heavy --format pylock.toml --verbose > /packages/pylock.heavy.toml && \
    uv export --package=backend --package=shared --format pylock.toml --verbose > /packages/pylock.toml
##########################
# Generator/parser stage #
##########################

#################
# Runtime stage #
#################
FROM ${BASE_IMAGE}

# HTTP timeout bumped from 30 default to 3000 because cuda images are slow to download
# Link mode copy just in case hardlinks does not work
ENV UV_LOCKED=1 \
    UV_LINK_MODE=copy \
    UV_INDEX_STRATEGY=unsafe-first-match \
    UV_HTTP_TIMEOUT=3000

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

# Install all deps
RUN --mount=from=generator,source=/packages/pylock.heavy.toml,target=/app/pylock.toml \
    --mount=type=cache,target=/root/.cache/uv \
    uv pip install -r pylock.toml --verbose

COPY . ./

# Because for some reason the all install above is not enough
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --package backend --package shared

ENTRYPOINT ["uv", "run", "--package", "backend", "fastapi", "run", "--entrypoint", "backend.main:app"]
#################
# Runtime stage #
#################
