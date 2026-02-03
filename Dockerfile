# syntax=docker/dockerfile:1

# ---------- Base Layer ----------
FROM docker.m.daocloud.io/library/node:24-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com

RUN npm install -g pnpm@10.28.2

# ---------- Dependencies Layer ----------
FROM base AS dependencies

RUN mkdir -p /tmp/dev /tmp/prod

COPY package.json pnpm-lock.yaml /tmp/dev/
COPY package.json pnpm-lock.yaml /tmp/prod/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    cd /tmp/dev && pnpm install

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    cd /tmp/prod && pnpm install --prod

# ---------- Builder Layer ----------
FROM base AS builder

WORKDIR /app

COPY --from=dependencies /tmp/dev/node_modules ./node_modules
COPY . .

RUN pnpm run build

# ---------- Runtime Layer ----------
FROM docker.m.daocloud.io/library/node:24-slim AS runtime

LABEL maintainer="jasonyy2018"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="Reactive Resume"
LABEL org.opencontainers.image.description="A free and open-source resume builder."
LABEL org.opencontainers.image.vendor="Jason Yu"
LABEL org.opencontainers.image.url="https://github.com/jasonyy2018/rresume"
LABEL org.opencontainers.image.documentation="https://github.com/jasonyy2018/rresume"
LABEL org.opencontainers.image.source="https://github.com/jasonyy2018/rresume"

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/migrations ./migrations
COPY --from=dependencies /tmp/prod/node_modules ./node_modules

EXPOSE 3000/tcp

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["node", ".output/server/index.mjs"]
