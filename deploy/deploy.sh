#!/bin/bash

# Deployment Script for Partner Management System
# Run this script on your DigitalOcean droplet to deploy updates

set -e

# Load configuration
SCRIPT_DIR="$(dirname "$0")"
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    # Fallback configuration
    APP_DIR="/var/www/partner-management"
    BACKUP_DIR="/var/backups/partner-management"
    APP_USER="partnerapp"
    APP_NAME="partner-app"
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting deployment process..."

# Create backup directory if it doesn't exist
sudo mkdir -p $BACKUP_DIR

# Function to rollback on failure
rollback() {
    echo "❌ Deployment failed! Rolling back..."
    if [ -d "$BACKUP_DIR/backup_$TIMESTAMP" ]; then
        sudo rm -rf $APP_DIR
        sudo mv "$BACKUP_DIR/backup_$TIMESTAMP" $APP_DIR
        sudo -u partnerapp pm2 restart partner-app
        echo "🔄 Rollback completed"
    fi
    exit 1
}

# Set trap to rollback on error
trap rollback ERR

cd $APP_DIR

# Create backup of current deployment
echo "💾 Creating backup..."
sudo cp -r $APP_DIR "$BACKUP_DIR/backup_$TIMESTAMP"

# Check if Git repository exists
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please run setup-droplet.sh first."
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes from repository..."
sudo -u $APP_USER git fetch origin
sudo -u $APP_USER git reset --hard origin/${REPO_BRANCH:-main}

# Install/update dependencies
echo "📦 Installing dependencies..."
sudo -u $APP_USER npm ci --production

# Build the application
echo "🏗️ Building application..."
sudo -u $APP_USER npm run build

# Run database migrations
echo "🗄️ Running database migrations..."
sudo -u $APP_USER npm run db:push

# Test the build
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed - dist/index.js not found"
    exit 1
fi

# Restart the application with PM2
echo "⚡ Restarting application..."
sudo -u $APP_USER pm2 reload $APP_NAME --update-env || sudo -u $APP_USER pm2 start dist/index.js --name "$APP_NAME" --env production

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 5

# Health check
echo "🏥 Performing health check..."
if curl -f http://localhost:3000/api/init > /dev/null 2>&1; then
    echo "✅ Application is healthy!"
else
    echo "❌ Health check failed"
    exit 1
fi

# Cleanup old backups (keep last 5)
echo "🧹 Cleaning up old backups..."
sudo find $BACKUP_DIR -name "backup_*" -type d | sort -r | tail -n +6 | sudo xargs rm -rf

# Restart Nginx to ensure everything is working
echo "🌐 Restarting Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo "🌍 Your application is now live!"

# Display application status
echo ""
echo "📊 Application Status:"
sudo -u $APP_USER pm2 list