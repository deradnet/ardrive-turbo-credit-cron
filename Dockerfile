FROM node:22-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001


COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force


COPY --chown=nodejs:nodejs . .

USER nodejs

ENTRYPOINT ["node", "index.js"]
