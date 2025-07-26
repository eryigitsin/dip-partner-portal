#!/bin/bash

# Webhook Deployment Script
# This script can be triggered by GitHub webhooks for automatic deployments

set -e

LOG_FILE="/var/log/partner-deployment.log"
APP_DIR="/var/www/partner-management"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "🔔 Webhook deployment triggered"

# Change to application directory
cd $APP_DIR

# Check if there are new commits
CURRENT_COMMIT=$(git rev-parse HEAD)
git fetch origin main
LATEST_COMMIT=$(git rev-parse origin/main)

if [ "$CURRENT_COMMIT" = "$LATEST_COMMIT" ]; then
    log "ℹ️ No new commits found, skipping deployment"
    exit 0
fi

log "🆕 New commits found, starting deployment"

# Run the deployment script
sudo -u partnerapp /var/www/partner-management/deploy.sh 2>&1 | tee -a $LOG_FILE

if [ $? -eq 0 ]; then
    log "✅ Webhook deployment completed successfully"
    
    # Optional: Send notification (uncomment if you want Slack/Discord notifications)
    # curl -X POST -H 'Content-type: application/json' \
    #     --data '{"text":"🚀 Partner Management System deployed successfully!"}' \
    #     YOUR_SLACK_WEBHOOK_URL
else
    log "❌ Webhook deployment failed"
    
    # Optional: Send error notification
    # curl -X POST -H 'Content-type: application/json' \
    #     --data '{"text":"🚨 Partner Management System deployment failed!"}' \
    #     YOUR_SLACK_WEBHOOK_URL
    exit 1
fi