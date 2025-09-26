FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Create non-root user
RUN adduser -D -s /bin/sh cmf && chown -R cmf:cmf /app
USER cmf

EXPOSE 8088

CMD ["node", "dist/server.js"]