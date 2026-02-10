# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm --prefix netnet/cockpit run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/netnet/cockpit/package.json /app/netnet/cockpit/package.json
COPY --from=builder /app/netnet/cockpit/next.config.mjs /app/netnet/cockpit/next.config.mjs
COPY --from=builder /app/netnet/cockpit/public /app/netnet/cockpit/public
COPY --from=builder /app/netnet/cockpit/.next /app/netnet/cockpit/.next
COPY --from=builder /app/netnet/cockpit/node_modules /app/netnet/cockpit/node_modules

EXPOSE 3000
CMD ["npm", "--prefix", "netnet/cockpit", "run", "start"]
