#!/bin/bash

# Configuration file for deployment scripts
# Update these values according to your setup

# Repository Configuration
export REPO_URL="https://github.com/eryigitsin/dip-partner-portal.git"
export REPO_BRANCH="main"

# Domain Configuration
export DOMAIN="yourdomain.com"
export ADMIN_EMAIL="admin@yourdomain.com"

# Database Configuration
export DB_NAME="partner_db"
export DB_USER="partner_user"
export DB_PASSWORD="SecurePassword123!"

# Application Configuration
export APP_DIR="/var/www/partner-management"
export APP_USER="partnerapp"
export APP_NAME="partner-app"
export APP_PORT="3000"

# SSL Configuration
export ENABLE_SSL="true"
export FORCE_HTTPS="true"

# Monitoring Configuration
export ENABLE_MONITORING="true"
export MONITORING_INTERVAL="*/5 * * * *"  # Every 5 minutes

# Backup Configuration
export BACKUP_DIR="/var/backups/partner-management"
export BACKUP_RETENTION_DAYS="7"

# Notification Configuration (Optional)
export SLACK_WEBHOOK_URL=""
export DISCORD_WEBHOOK_URL=""
export NOTIFICATION_EMAIL=""

echo "Configuration loaded successfully!"
echo "Repository: $REPO_URL"
echo "Domain: $DOMAIN"
echo "App Directory: $APP_DIR"