# Multi-stage build for the hevy-mcp Streamable HTTP server (remote deployment).
# Used to host the server on platforms like Azure Container Apps so it can be
# reached by remote MCP clients (e.g. Claude on mobile). The published npm
# package remains stdio-only; this image runs dist/http.mjs instead.

FROM node:26-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:26-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/http.mjs"]
