FROM node:22-bullseye-slim

# Install Tor and SQLite dependencies
RUN apt-get update && apt-get install -y tor sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy configuration
COPY tor/torrc /etc/tor/torrc

# Copy backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build frontend
RUN cd frontend && npm run build

# Setup entrypoint script
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'tor -f /etc/tor/torrc &' >> /entrypoint.sh && \
    echo 'cd /app/backend && node server.js' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# The tor hidden service key will be generated in /var/lib/tor/hidden_service/ on first run
EXPOSE 3001

CMD ["/entrypoint.sh"]
