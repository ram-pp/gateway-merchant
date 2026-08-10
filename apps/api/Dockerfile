# Build context: repo root (see docker-compose.yml) — needed for the
# packages/shared workspace dependency.
FROM node:20-alpine

WORKDIR /repo

COPY package.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm install --workspace apps/api --omit=dev

WORKDIR /repo/apps/api

EXPOSE 4000
CMD ["node", "src/server.js"]
