# Optional for Nhân Hòa's GitHub-based builder.
# IMPORTANT: Build this image on an isolated builder, not on the 1-vCPU / 2-GB
# VPS that runs the live AutoTrade engine.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG SITE_URL=https://gaufamily.io.vn
ARG NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/bright
ENV DEPLOY_STANDALONE=1
ENV SITE_URL=${SITE_URL}
ENV NEXT_PUBLIC_MAP_STYLE_URL=${NEXT_PUBLIC_MAP_STYLE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
# Unit tests must not inherit the deployment's trusted public SITE_URL:
# origin-guard fixtures test their own same-origin and proxy inputs.
# Keep lint and all tests mandatory; build with SITE_URL configured as usual.
RUN npm run lint \
 && env -u SITE_URL npm test \
 && npm run build \
 && mkdir -p .next/standalone/.next \
 && cp -a .next/static .next/standalone/.next/static \
 && if [ -d public ]; then cp -a public .next/standalone/public; fi

FROM node:22-bookworm-slim AS runner
WORKDIR /app
# Keep the public origin in the runtime image, not just the build stage.
# Nhân Hòa runtime environment may override this value for another public URL.
ARG SITE_URL=https://gaufamily.io.vn
ENV SITE_URL=${SITE_URL}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
USER node
EXPOSE 3000
CMD ["node", "server.js"]
