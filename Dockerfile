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

# Estado de sincronização (última varredura, cancelamentos detectados,
# categorização manual do time de CS etc. — ver server/*.js) precisa
# sobreviver a um novo deploy, senão cada deploy força uma varredura
# completa da API externa de novo e perde categorização já feita.
# Configurar volume persistente no painel apontando pra esse caminho.
VOLUME ["/app/server/.cache"]

EXPOSE 3000

CMD ["node", "server.js"]
