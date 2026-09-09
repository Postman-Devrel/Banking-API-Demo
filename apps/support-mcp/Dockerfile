FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/support-mcp ./apps/support-mcp
COPY packages/support-contract ./packages/support-contract
RUN npm ci --workspace=@intergalactic/support-mcp --include-workspace-root=false
RUN npm run build --workspace=@intergalactic/support-mcp
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production SUPPORT_MCP_HOST=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/support-mcp/package.json ./apps/support-mcp/package.json
COPY --from=build --chown=node:node /app/apps/support-mcp/dist ./apps/support-mcp/dist
COPY --from=build --chown=node:node /app/packages/support-contract ./packages/support-contract
USER node
EXPOSE 3200
CMD ["node", "apps/support-mcp/dist/server.js"]
