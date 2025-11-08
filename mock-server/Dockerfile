FROM oven/bun:1

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package.json and lockfile
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy mock-server source files
COPY mock-server ./mock-server/

EXPOSE 3001

WORKDIR /app/mock-server

CMD ["bun", "run", "index.ts"]
