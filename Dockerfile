# syntax=docker/dockerfile:1.7
# Multi-stage: build the web app, then ship only what runs.

FROM node:22.20.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22.20.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Production dependencies only. tsx is among them: it runs the TypeScript server.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
# The built web app, the server, and the catalog sources the server reads at start.
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/lib/enrich.ts src/lib/types.ts ./src/lib/
COPY src/data ./src/data
# Nothing is written to the image filesystem; DATA_DIR is only used without DATABASE_URL.
RUN mkdir -p /app/server/data && chown -R node:node /app
USER node
EXPOSE 8787
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1:8787/api/health || exit 1
CMD ["node", "node_modules/.bin/tsx", "server/index.ts"]
