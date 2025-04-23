#!/bin/bash

# Check if Docker is running
echo "Checking if Docker is running..."
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running or you don't have permission to access it."
    echo "Please start Docker and ensure you have proper permissions."
    exit 1
fi

# Build the Docker image
echo "Building Docker image..."
docker build -t hypnosis-audio-platform .

# Start the Docker Compose stack
echo "Starting Docker Compose stack..."
docker-compose up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 10

# Check if the containers are running
echo "Checking if containers are running..."
docker-compose ps

# Get the application logs
echo "Application logs:"
docker-compose logs app

# Instructions for testing
echo ""
echo "The application should now be running at http://localhost:5000"
echo "Default admin credentials: admin / admin123"
echo ""
echo "To stop the application, run: docker-compose down"
echo "To remove all data, run: docker-compose down -v"