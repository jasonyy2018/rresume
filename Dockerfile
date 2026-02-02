# syntax=docker/dockerfile:1

# ---------- Dependencies Layer ----------
FROM docker.m.daocloud.io/library/node:24-slim AS dependencies

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN mkdir -p /tmp/dev /tmp/prod

COPY package.json pnpm-lock.yaml /tmp/dev/
COPY package.json pnpm-lock.yaml /tmp/prod/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    cd /tmp/dev && pnpm install --frozen-lockfile

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    cd /tmp/prod && pnpm install --frozen-lockfile --prod

# ---------- Builder Layer ----------
FROM docker.m.daocloud.io/library/node:24-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

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
