#!/bin/bash

# SSL Certificate Setup Script using Let's Encrypt
# Run this script after your domain is pointing to your droplet

set -e

# Configuration
DOMAIN="${1:-yourdomain.com}"
EMAIL="${2:-admin@yourdomain.com}"

if [ "$DOMAIN" = "yourdomain.com" ]; then
    echo "❌ Please provide your domain name:"
    echo "Usage: ./ssl-setup.sh yourdomain.com admin@yourdomain.com"
    exit 1
fi

echo "🔐 Setting up SSL certificate for $DOMAIN..."

# Update Nginx configuration with domain name
echo "🌐 Updating Nginx configuration..."
sudo sed -i "s/server_name _;/server_name $DOMAIN www.$DOMAIN;/" /etc/nginx/sites-available/partner-management

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Install SSL certificate
echo "📜 Installing SSL certificate..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect

# Setup automatic renewal
echo "🔄 Setting up automatic certificate renewal..."
sudo crontab -l 2>/dev/null | { cat; echo "0 3 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -

# Test certificate renewal
echo "🧪 Testing certificate renewal..."
sudo certbot renew --dry-run

echo "✅ SSL certificate setup completed!"
echo "🌍 Your site is now available at https://$DOMAIN"

# Update application configuration for HTTPS
echo "⚙️ Updating application configuration for HTTPS..."
sudo -u partnerapp tee -a /var/www/partner-management/.env.production << EOF

# HTTPS Configuration
FORCE_HTTPS=true
TRUST_PROXY=true
EOF

# Restart application to apply HTTPS settings
echo "⚡ Restarting application..."
sudo -u partnerapp pm2 restart partner-app

echo "🔒 HTTPS setup completed successfully!"