#!/bin/bash

# Environment Variables Setup Script
# This script helps you configure all environment variables

set -e

# Load configuration
source "$(dirname "$0")/config.sh"

echo "🔧 Partner Management System - Environment Setup"
echo "================================================="

# Function to read user input with default value
read_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    read -p "$prompt [$default]: " input
    if [ -z "$input" ]; then
        input="$default"
    fi
    export $var_name="$input"
}

# Function to read secret input (hidden)
read_secret() {
    local prompt="$1"
    local var_name="$2"
    
    read -s -p "$prompt: " input
    echo
    export $var_name="$input"
}

echo
echo "📋 Basic Configuration"
echo "======================"

read_with_default "Repository URL" "$REPO_URL" "REPO_URL"
read_with_default "Domain name (leave empty if no domain)" "$DOMAIN" "DOMAIN"
read_with_default "Admin email" "$ADMIN_EMAIL" "ADMIN_EMAIL"

echo
echo "🗄️ Database Configuration"
echo "=========================="

read_with_default "Database name" "$DB_NAME" "DB_NAME"
read_with_default "Database user" "$DB_USER" "DB_USER"
read_secret "Database password" "DB_PASSWORD"

echo
echo "🔑 API Keys and Secrets"
echo "======================="

read_secret "SendGrid API Key (required for emails)" "SENDGRID_API_KEY"

# Generate session secret
SESSION_SECRET=$(openssl rand -base64 32)
echo "Generated session secret: ${SESSION_SECRET:0:10}..."

echo
echo "🔔 Notification Setup (Optional)"
echo "================================"

read_with_default "Slack webhook URL (optional)" "" "SLACK_WEBHOOK_URL"
read_with_default "Discord webhook URL (optional)" "" "DISCORD_WEBHOOK_URL"
read_with_default "Notification email (optional)" "" "NOTIFICATION_EMAIL"

echo
echo "📝 Creating environment files..."

# Create production environment file
cat > "$APP_DIR/.env.production" << EOF
# Production Environment Configuration
# Generated on $(date)

NODE_ENV=production
PORT=$APP_PORT

# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# Security
SESSION_SECRET=$SESSION_SECRET

# Email Configuration
SENDGRID_API_KEY=$SENDGRID_API_KEY

# SSL Configuration
FORCE_HTTPS=$FORCE_HTTPS
TRUST_PROXY=true

# Application Settings
REPLIT_DB_URL=""
EOF

# Create development environment template
cat > "$APP_DIR/.env.development" << EOF
# Development Environment Configuration
# Copy this to your development environment

NODE_ENV=development
PORT=5000

# Database Configuration (use your development database)
DATABASE_URL=postgresql://localhost:5432/partner_dev

# Security (use a different secret for development)
SESSION_SECRET=development_secret_change_me

# Email Configuration (use same as production or test keys)
SENDGRID_API_KEY=$SENDGRID_API_KEY

# Development Settings
FORCE_HTTPS=false
TRUST_PROXY=false
EOF

# Create monitoring configuration
cat > "$APP_DIR/.env.monitoring" << EOF
# Monitoring Configuration
SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL
DISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK_URL
NOTIFICATION_EMAIL=$NOTIFICATION_EMAIL
EOF

# Set proper permissions
chown $APP_USER:$APP_USER "$APP_DIR/.env.production"
chown $APP_USER:$APP_USER "$APP_DIR/.env.development"
chown $APP_USER:$APP_USER "$APP_DIR/.env.monitoring"
chmod 600 "$APP_DIR/.env.production"
chmod 600 "$APP_DIR/.env.development"
chmod 600 "$APP_DIR/.env.monitoring"

echo
echo "✅ Environment configuration completed!"
echo
echo "📄 Files created:"
echo "  - $APP_DIR/.env.production (production environment)"
echo "  - $APP_DIR/.env.development (development template)"
echo "  - $APP_DIR/.env.monitoring (monitoring settings)"
echo
echo "🔒 Security notes:"
echo "  - Environment files have restricted permissions (600)"
echo "  - Session secret was automatically generated"
echo "  - Database password is encrypted in the environment file"
echo
echo "📋 Next steps:"
echo "  1. Review the generated environment files"
echo "  2. Copy .env.development to your development environment"
echo "  3. Update your repository URL in deploy scripts"
echo "  4. Run the deployment script"

# Update repository URL in deployment scripts
if [ -f "$(dirname "$0")/deploy.sh" ]; then
    sed -i "s|REPO_URL=.*|REPO_URL=\"$REPO_URL\"|" "$(dirname "$0")/deploy.sh"
    echo "  ✓ Updated repository URL in deploy.sh"
fi

if [ -f "$(dirname "$0")/webhook-deploy.sh" ]; then
    sed -i "s|REPO_URL=.*|REPO_URL=\"$REPO_URL\"|" "$(dirname "$0")/webhook-deploy.sh"
    echo "  ✓ Updated repository URL in webhook-deploy.sh"
fi