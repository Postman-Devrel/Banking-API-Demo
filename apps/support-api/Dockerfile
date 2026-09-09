FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci --workspace=@intergalactic/support-api --include-workspace-root=false
RUN npm run build --workspace=@intergalactic/support-api
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/support-api/package.json ./apps/support-api/package.json
COPY --from=build --chown=node:node /app/apps/support-api/dist ./apps/support-api/dist
COPY --from=build --chown=node:node /app/apps/support-api/openapi ./apps/support-api/openapi
COPY --from=build --chown=node:node /app/packages/support-contract ./packages/support-contract
USER node
EXPOSE 8090
CMD ["node", "apps/support-api/dist/server.js"]
