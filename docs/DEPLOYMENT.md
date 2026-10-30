# LeaseLedger — Production Deployment Guide

## 1. System Overview & Architecture

LeaseLedger is deployed as a decoupled multi-tier web application consisting of:
1. **Frontend Client:** React 18 SPA compiled into static assets served via Nginx or Express static serving.
2. **Backend API:** Node.js Express microservice running on port 5000.
3. **Database:** MongoDB 7.0+ Replica Set.
4. **Media Storage:** Cloudinary CDN or persistent local volume mount (`/storage/uploads`).
5. **Reverse Proxy:** Nginx with SSL termination, TLS 1.3, and Gzip/Brotli compression.

---

## 2. Environment Variables Specification

Ensure all variables are populated in your production `.env` file before booting the service:

| Variable | Required | Default / Example | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Enables production optimizations & error masking |
| `PORT` | No | `5000` | Port for Express HTTP server |
| `MONGODB_URI` | Yes | `mongodb+srv://...` | Connection URI to production MongoDB replica set |
| `JWT_ACCESS_SECRET` | Yes | `64-character-hex-key` | Signs 15-minute access JWTs |
| `JWT_REFRESH_SECRET` | Yes | `64-character-hex-key` | Signs 7-day refresh tokens |
| `CLIENT_URL` | Yes | `https://leaseledger.app` | CORS allowed origin and email callback URLs |
| `STORAGE_DRIVER` | No | `local` / `cloudinary` | Target driver for photographic evidence plates |
| `CLOUDINARY_CLOUD_NAME` | If cloud | `your-cloud-name` | Cloudinary asset hosting credentials |
| `CLOUDINARY_API_KEY` | If cloud | `your-api-key` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | If cloud | `your-api-secret` | Cloudinary API secret |
| `SMTP_HOST` | If email | `smtp.sendgrid.net` | Outgoing email transport server |
| `SMTP_PORT` | No | `587` | Outgoing SMTP port |
| `SMTP_USER` | If email | `apikey` | Outgoing SMTP user |
| `SMTP_PASS` | If email | `your-sendgrid-key` | Outgoing SMTP password |

---

## 3. Docker Deployment

### Multi-stage `Dockerfile.server`
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ ./

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 5000
USER node
CMD ["node", "src/server.js"]
```

### Multi-stage `Dockerfile.client`
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    restart: always
    environment:
      MONGO_INITDB_DATABASE: leaseledger
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  server:
    build:
      context: .
      dockerfile: Dockerfile.server
    restart: always
    environment:
      NODE_ENV: production
      PORT: 5000
      MONGODB_URI: mongodb://mongodb:27017/leaseledger
    depends_on:
      - mongodb
    ports:
      - "5000:5000"
    volumes:
      - uploads_data:/app/storage/uploads

  client:
    build:
      context: .
      dockerfile: Dockerfile.client
    restart: always
    ports:
      - "80:80"
    depends_on:
      - server

volumes:
  mongo_data:
  uploads_data:
```

---

## 4. Production Health Checks & Monitoring

The backend exposes two zero-dependency health check endpoints:
- `GET /health` — Root health probe for load balancers.
- `GET /api/v1/health` — API v1 monitoring endpoint returning database connection status:

```json
{
  "status": "ok",
  "db": "connected",
  "timestamp": "2026-10-30T10:00:00.000Z"
}
```

---

## 5. Security Checklist Prior to Go-Live
- [x] Run `npm audit` to verify zero known high/critical vulnerabilities.
- [x] Enforce `NODE_ENV=production` to disable verbose stack traces in API errors.
- [x] Ensure `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are high-entropy cryptographic strings.
- [x] Verify that the `/storage/uploads` directory has persistent volume storage attached.
- [x] Configure SSL/TLS certificates (e.g. Let's Encrypt / Certbot) on the reverse proxy.
- [x] Schedule automated nightly MongoDB backups with `mongodump`.
