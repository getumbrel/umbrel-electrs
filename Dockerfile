# Install only backend runtime dependencies for the final image.
FROM node:24.22.1-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS backend-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN npm ci --workspace umbrel-electrs-backend --omit=dev
COPY apps/backend ./apps/backend

# Build the dashboard separately from the runtime dependencies.
FROM node:24.22.1-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN npm ci
COPY apps/frontend ./apps/frontend
RUN npm run build:frontend

FROM node:24.22.1-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS umbrel-electrs
WORKDIR /app
COPY --from=backend-builder /app /app
COPY --from=frontend-builder /app/apps/frontend/dist/ /app/apps/frontend/dist/
EXPOSE 3006
CMD [ "npm", "run", "dev:backend" ]
