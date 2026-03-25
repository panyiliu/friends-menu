FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
ENV DATABASE_URL=file:/app/prisma/dev.db
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:20-alpine AS runner
ARG GIT_SHA=unknown
ARG BUILD_TIME=
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:/app/prisma/dev.db
ENV GIT_SHA=${GIT_SHA}
ENV BUILD_TIME=${BUILD_TIME}

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.ts ./next.config.ts
RUN chmod +x /app/scripts/docker-entrypoint.sh

EXPOSE 3000
CMD ["/app/scripts/docker-entrypoint.sh"]
