# Multi-stage isn't strictly required; keep simple for portability
FROM node:18-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-progress --prefer-offline

COPY . .
RUN npm run build || true

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]
