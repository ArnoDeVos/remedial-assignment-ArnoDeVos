# ---------------------------------------------------------------------------
# API image — multi-stage so the runtime layer carries production deps only.
# ---------------------------------------------------------------------------

# --- Stage 1: install dependencies ----------------------------------------
FROM node:22-alpine AS dependencies

WORKDIR /usr/src/app

# Copy manifests first so this layer is cached until dependencies change.
COPY package*.json ./

RUN npm install --omit=dev --no-audit --no-fund

# --- Stage 2: runtime ------------------------------------------------------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY knexfile.js ./
COPY scripts ./scripts
COPY src ./src

# Drop root privileges. The `node` user ships with the official image.
USER node

EXPOSE 4000

CMD ["node", "src/server.js"]
