#!/bin/bash

# One-Click Setup Script for Partner Management System
# This script automates the entire deployment process

set -e

echo "🚀 Partner Management System - One-Click Setup"
echo "==============================================="
echo

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script as root (use sudo)"
    exit 1
fi

# Get repository URL from user
read -p "Enter your GitHub repository URL: " REPO_URL
if [ -z "$REPO_URL" ]; then
    echo "❌ Repository URL is required"
    exit 1
fi

# Get basic configuration
read -p "Enter your domain name (or press Enter for IP-only setup): " DOMAIN
read -p "Enter your email address: " EMAIL

if [ -z "$EMAIL" ]; then
    echo "❌ Email address is required"
    exit 1
fi

echo
echo "🔄 Starting automated setup..."

# Step 1: Update repository URL in all scripts
echo "1️⃣ Updating repository URL..."
SCRIPT_DIR="$(dirname "$0")"
if [ -f "$SCRIPT_DIR/update-repo.sh" ]; then
    cd "$SCRIPT_DIR"
    ./update-repo.sh "$REPO_URL"
else
    echo "⚠️ update-repo.sh not found, repository URL will need to be set manually"
fi

# Step 2: Run droplet setup
echo "2️⃣ Setting up DigitalOcean droplet..."
if [ -f "$SCRIPT_DIR/setup-droplet.sh" ]; then
    bash "$SCRIPT_DIR/setup-droplet.sh"
else
    echo "❌ setup-droplet.sh not found"
    exit 1
fi

# Step 3: Configure environment
echo "3️⃣ Configuring environment variables..."
if [ -f "$SCRIPT_DIR/env-setup.sh" ]; then
    bash "$SCRIPT_DIR/env-setup.sh"
else
    echo "❌ env-setup.sh not found"
    exit 1
fi

# Step 4: Initial deployment
echo "4️⃣ Running initial deployment..."
if [ -f "/var/www/partner-management/deploy.sh" ]; then
    sudo -u partnerapp /var/www/partner-management/deploy.sh
else
    echo "❌ deploy.sh not found"
    exit 1
fi

# Step 5: Setup SSL if domain provided
if [ ! -z "$DOMAIN" ]; then
    echo "5️⃣ Setting up SSL certificate..."
    if [ -f "$SCRIPT_DIR/ssl-setup.sh" ]; then
        bash "$SCRIPT_DIR/ssl-setup.sh" "$DOMAIN" "$EMAIL"
    else
        echo "⚠️ ssl-setup.sh not found, SSL setup skipped"
    fi
fi

# Step 6: Setup PM2 startup
echo "6️⃣ Configuring PM2 startup..."
sudo -u partnerapp pm2 startup
sudo -u partnerapp pm2 save

# Step 7: Setup monitoring (optional)
echo "7️⃣ Setting up monitoring..."
if [ -f "$SCRIPT_DIR/monitoring.sh" ]; then
    cp "$SCRIPT_DIR/monitoring.sh" /usr/local/bin/partner-monitoring
    chmod +x /usr/local/bin/partner-monitoring
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/partner-monitoring") | crontab -
    echo "✓ Monitoring setup completed (runs every 5 minutes)"
fi

echo
echo "🎉 Setup completed successfully!"
echo
echo "📋 Summary:"
echo "  • Repository: $REPO_URL"
if [ ! -z "$DOMAIN" ]; then
    echo "  • URL: https://$DOMAIN"
else
    echo "  • URL: http://$(curl -s ifconfig.me)"
fi
echo "  • Application: Running on PM2"
echo "  • Database: PostgreSQL configured"
echo "  • SSL: $([ ! -z "$DOMAIN" ] && echo "Enabled" || echo "Not configured")"
echo "  • Monitoring: Enabled"
echo
echo "🔧 Useful commands:"
echo "  • Check status: sudo -u partnerapp pm2 list"
echo "  • View logs: sudo -u partnerapp pm2 logs partner-app"
echo "  • Deploy updates: sudo -u partnerapp /var/www/partner-management/deploy.sh"
echo "  • Check monitoring: tail -f /var/log/partner-monitoring.log"
echo
echo "📝 Next steps:"
echo "  1. Test your application in a web browser"
echo "  2. Configure GitHub webhooks for automatic deployments"
echo "  3. Add your team members to the server if needed"
echo "  4. Set up regular backups"
echo
echo "✅ Your Partner Management System is now live!"