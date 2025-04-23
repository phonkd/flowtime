FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build frontend assets
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads && chmod 777 uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "dist/index.js"]