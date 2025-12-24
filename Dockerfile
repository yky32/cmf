FROM node:20-alpine

WORKDIR /app

# Copy package files and install all dependencies (including devDependencies for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Create non-root user
RUN adduser -D -s /bin/sh cmf && chown -R cmf:cmf /app
USER cmf

EXPOSE 8088

CMD ["node", "dist/server.js"]