FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with development dependencies for build step
RUN npm ci

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads && chmod 777 uploads

# Build frontend and backend assets
RUN npm run build

# Verify the build output
RUN ls -la dist/ || echo "Build failed - dist directory not created"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start the application directly without a script file
CMD ["sh", "-c", "echo 'Starting application...' && npm run dev"]