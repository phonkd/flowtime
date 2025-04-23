FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build frontend and backend assets
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads && chmod 777 uploads

# Verify the built files exist
RUN ls -la dist/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Create start script
RUN echo '#!/bin/sh\nif [ -f "./dist/index.js" ]; then\n  echo "Starting in production mode..."\n  npm run start\nelse\n  echo "Starting in development mode..."\n  npm run dev\nfi' > start.sh && chmod +x start.sh

# Start application
CMD ["./start.sh"]