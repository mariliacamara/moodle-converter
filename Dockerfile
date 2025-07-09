FROM alpine:latest AS builder

WORKDIR /app

RUN apk --no-cache update && apk add nodejs npm

COPY package*.json .

RUN npm ci

COPY . .

RUN npm run build

RUN cp -R ./node_modules/.prisma ./.prisma

RUN npm prune --production

FROM alpine:latest AS production

WORKDIR /app

RUN apk --no-cache update && apk add nodejs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/package-lock.json .
COPY --from=builder /app/.prisma ./node_modules/.prisma

CMD ["node", "dist/main.js"]