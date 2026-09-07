# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    npm_config_audit=false \
    npm_config_fund=false \
    npm_config_update_notifier=false
RUN npm install --global npm@12.0.2
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.server.json vitest.config.ts vite*.ts ./
COPY apps ./apps
COPY packages ./packages
RUN npm run build

FROM node:24-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS production-dependencies
WORKDIR /app
ENV npm_config_audit=false \
    npm_config_fund=false \
    npm_config_update_notifier=false
RUN npm install --global npm@12.0.2
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:fbbdda866ea71aef98c4abece17e3d61fbf820cc2ef3961522caa2478716171a AS runtime
ENV NODE_ENV=production \
    PORT=3006
WORKDIR /app
COPY --from=production-dependencies --chown=1000:1000 /app/node_modules ./node_modules
COPY --from=build --chown=1000:1000 /app/dist ./dist
COPY --from=build --chown=1000:1000 /app/apps/ui/dist ./apps/ui/dist
COPY --chown=1000:1000 package.json LICENSE.md LICENSE.legacy THIRD_PARTY_NOTICES.md ./
USER 1000:1000
EXPOSE 3006
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3006/ping').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["dist/apps/server/src/index.js"]
