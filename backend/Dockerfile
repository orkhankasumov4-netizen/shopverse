FROM node:20-alpine AS base
WORKDIR /home/node/app
RUN apk add --no-cache dumb-init

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

FROM base AS runner
COPY --from=deps /home/node/app/node_modules ./node_modules
COPY . .
RUN mkdir -p logs
RUN chown -R node:node .
USER node

EXPOSE 5000
CMD ["dumb-init", "node", "src/app.js"]
