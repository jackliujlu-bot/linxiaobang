FROM node:24.19.0-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24.19.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app /app
USER node
# 0.0.0.0 is inside the private container; Compose publishes host loopback only.
CMD ["sh","-c","npm run db:migrate && node node_modules/next/dist/bin/next start --hostname 0.0.0.0"]
