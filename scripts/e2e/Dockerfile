FROM mcr.microsoft.com/playwright@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27
ARG E2E_UID=1000
ARG E2E_GID=1000
WORKDIR /app
ENV COREPACK_HOME=/opt/corepack
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY app/ ./app/
COPY components/ ./components/
COPY hooks/ ./hooks/
COPY lib/ ./lib/
COPY db/ ./db/
COPY drizzle/ ./drizzle/
COPY public/ ./public/
COPY scripts/e2e/ ./scripts/e2e/
COPY tests/e2e/local/ ./tests/e2e/local/
COPY drizzle.config.ts envConfig.ts instrumentation-client.ts instrumentation.ts next.config.js postcss.config.mjs proxy.ts sentry.edge.config.ts sentry.server.config.ts playwright.local.config.ts tsconfig.json ./
# Match the non-root host owner of the private bind-mounted run directory.
RUN mkdir /home/e2e && chown "${E2E_UID}:${E2E_GID}" /app /home/e2e
ENV HOME=/home/e2e
USER ${E2E_UID}:${E2E_GID}
CMD ["node", "scripts/e2e/isolated.mjs"]
