FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY src/ src/

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/server.js"]
