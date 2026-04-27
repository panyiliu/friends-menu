FROM node:20.11.1-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

FROM node:20.11.1-alpine AS builder
WORKDIR /app
ENV DATABASE_URL=file:/app/prisma/dev.db
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate && npm run build -- --webpack

FROM node:20.11.1-alpine AS runner
ARG GIT_SHA=unknown
ARG BUILD_TIME=
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV GIT_SHA=${GIT_SHA}
ENV BUILD_TIME=${BUILD_TIME}

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.ts ./next.config.ts

# Healthcheck 需要 curl；同时创建非 root 用户，确保运行时可写挂载卷。
RUN addgroup -S app && adduser -S app -G app && \
  mkdir -p /app/data /app/public/uploads && \
  # named volume 首次挂载时会从镜像拷贝目录内容（用 marker 确保权限正确）
  echo "init" > /app/data/.volume-init && \
  echo "init" > /app/public/uploads/.volume-init && \
  chmod +x /app/scripts/docker-entrypoint.sh && \
  chown -R app:app /app

USER app

EXPOSE 3000
CMD ["/app/scripts/docker-entrypoint.sh"]
