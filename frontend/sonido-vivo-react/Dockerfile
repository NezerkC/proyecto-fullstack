# Stage 1: Build React SPA
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

RUN rm -rf ./*
COPY --from=builder /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
