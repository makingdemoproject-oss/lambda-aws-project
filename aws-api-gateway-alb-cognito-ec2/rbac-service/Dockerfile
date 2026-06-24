FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4000
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs appuser
RUN npm install -g pm2@5
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=appuser:nodejs . .
USER appuser
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:4000/api/v1/health || exit 1
CMD ["pm2-runtime","start","ecosystem.config.js","--env","production"]
