#!/bin/bash

# Quick Deploy Script for Development
# Use this for quick deployments from your development environment

set -e

DROPLET_IP="${1}"
DROPLET_USER="${2:-root}"

if [ -z "$DROPLET_IP" ]; then
    echo "Usage: ./quick-deploy.sh DROPLET_IP [USER]"
    echo "Example: ./quick-deploy.sh 192.168.1.100 root"
    exit 1
fi

echo "🚀 Quick deploying to $DROPLET_IP..."

# Create temporary deployment package
echo "📦 Creating deployment package..."
tar -czf /tmp/partner-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    --exclude=attached_assets \
    .

# Upload to droplet
echo "📤 Uploading to droplet..."
scp /tmp/partner-deploy.tar.gz $DROPLET_USER@$DROPLET_IP:/tmp/

# Deploy on droplet
echo "🔄 Deploying on droplet..."
ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
cd /var/www/partner-management

# Backup current version
sudo -u partnerapp cp -r . /tmp/backup-$(date +%s) 2>/dev/null || true

# Extract new version
sudo -u partnerapp tar -xzf /tmp/partner-deploy.tar.gz

# Install dependencies and build
sudo -u partnerapp npm ci --production
sudo -u partnerapp npm run build

# Run migrations
sudo -u partnerapp npm run db:push

# Restart application
sudo -u partnerapp pm2 restart partner-app

# Health check
sleep 5
if curl -f http://localhost:3000/api/init > /dev/null 2>&1; then
    echo "✅ Quick deployment successful!"
else
    echo "❌ Deployment failed - health check failed"
    exit 1
fi

# Cleanup
rm -f /tmp/partner-deploy.tar.gz
EOF

# Cleanup local files
rm -f /tmp/partner-deploy.tar.gz

echo "✅ Quick deployment completed!"