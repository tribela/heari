FROM oven/bun:1.3 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --production

FROM base AS build
COPY package.json bun.lock ./
RUN bun install
COPY . .
RUN bun run build

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/next.config.ts ./
COPY --from=build /app/package.json ./
COPY --from=build /app/words.txt ./
COPY --from=build /app/public ./public

EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "run", "start"]
