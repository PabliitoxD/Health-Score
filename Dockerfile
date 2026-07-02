# Stage 1 — build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2 — serve com Node (Express)
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY server ./server

EXPOSE 3000

CMD ["node", "server.js"]
