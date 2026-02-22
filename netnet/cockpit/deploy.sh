#!/bin/bash

set -e

APP_DIR="/opt/netnet"
REPO_URL="https://github.com/Eco-Wealth/netnet.git"

echo "Starting Netnet deployment..."

# Clone if not exists
if [ ! -d "$APP_DIR" ]; then
  git clone $REPO_URL $APP_DIR
fi

cd $APP_DIR
git pull

cd netnet/cockpit

echo "Building Docker image..."
docker build -t netnet-cockpit .

echo "Starting container..."
docker stop netnet || true
docker rm netnet || true

docker run -d \
  --name netnet \
  -p 3000:3000 \
  -v $APP_DIR/netnet/cockpit/data:/app/data \
  --env-file .env \
  netnet-cockpit

echo "Deployment complete."
