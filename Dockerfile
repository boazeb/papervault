FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# Patch base-image OS packages (e.g. c-ares, libexpat) so the weekly Trivy scan stays clean
# even when the upstream nginx:alpine image lags behind Alpine's package fixes.
RUN apk upgrade --no-cache
ARG VERSION=""
ARG REVISION=""
ARG CREATED=""
LABEL org.opencontainers.image.title="PaperVault" \
      org.opencontainers.image.description="Open source cryptographic secret sharing tool for secure paper-based cold storage vaults" \
      org.opencontainers.image.url="https://papervault.xyz" \
      org.opencontainers.image.source="https://github.com/boazeb/papervault" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}"
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
