# Use Node.js 18 Alpine as base image
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Define build arguments
ARG VITE_BACKEND_URL
ARG VITE_WEB_SOCKET_URL
ARG VITE_SERVER_LOG_URL
ARG VITE_SERVER_LOG_DASHBOARD_ID

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Set environment variables from build arguments
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_WEB_SOCKET_URL=$VITE_WEB_SOCKET_URL
ENV VITE_SERVER_LOG_URL=$VITE_SERVER_LOG_URL
ENV VITE_SERVER_LOG_DASHBOARD_ID=$VITE_SERVER_LOG_DASHBOARD_ID

# Build the application
RUN pnpm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration (optional - you can customize this)
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
