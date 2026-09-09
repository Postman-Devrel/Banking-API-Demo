FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci --workspace=@intergalactic/fraud-api --include-workspace-root=false
RUN npm run build --workspace=@intergalactic/fraud-api
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/fraud-api/package.json ./apps/fraud-api/package.json
COPY --from=build --chown=node:node /app/apps/fraud-api/dist ./apps/fraud-api/dist
COPY --from=build --chown=node:node /app/apps/fraud-api/openapi ./apps/fraud-api/openapi
COPY --from=build --chown=node:node /app/packages/fraud-contract ./packages/fraud-contract
USER node
EXPOSE 8080
CMD ["node", "apps/fraud-api/dist/server.js"]
