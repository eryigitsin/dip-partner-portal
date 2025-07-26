#!/bin/bash

# Script Installation Helper for DIP Partner Portal
# Downloads all deployment scripts with correct repository URLs

set -e

REPO_URL="https://github.com/eryigitsin/dip-partner-portal.git"
RAW_URL="https://raw.githubusercontent.com/eryigitsin/dip-partner-portal/main/deploy"

echo "🚀 DIP Partner Portal - Script Installation"
echo "==========================================="
echo "Repository: $REPO_URL"
echo

# Create deployment directory
mkdir -p dip-deploy
cd dip-deploy

echo "📥 Downloading deployment scripts..."

# Download all scripts
scripts=(
    "setup-droplet.sh"
    "deploy.sh"
    "env-setup.sh"
    "ssl-setup.sh"
    "monitoring.sh"
    "webhook-deploy.sh"
    "quick-deploy.sh"
    "one-click-setup.sh"
    "development-sync.sh"
    "update-repo.sh"
    "config.sh"
    "db-check.js"
    "github-workflow.yml"
)

for script in "${scripts[@]}"; do
    echo "  📄 Downloading $script..."
    wget -q -O "$script" "$RAW_URL/$script"
    if [[ "$script" == *.sh ]]; then
        chmod +x "$script"
    fi
done

echo "📄 Downloading README..."
wget -q -O "README.md" "$RAW_URL/README.md"

echo
echo "✅ All scripts downloaded successfully!"
echo
echo "📋 Available Scripts:"
echo "===================="
echo "🔧 setup-droplet.sh      - Initial server setup"
echo "⚙️  env-setup.sh          - Environment configuration"
echo "🚀 deploy.sh             - Main deployment script"
echo "🔐 ssl-setup.sh          - SSL certificate setup"
echo "📊 monitoring.sh         - Health monitoring"
echo "🔄 webhook-deploy.sh     - Webhook deployment"
echo "⚡ quick-deploy.sh       - Quick development deployment"
echo "🎯 one-click-setup.sh    - Complete automated setup"
echo "🔄 development-sync.sh   - Sync dev environment"
echo "🔧 update-repo.sh        - Update repository URLs"
echo
echo "🚀 Quick Start Options:"
echo "======================"
echo
echo "Option 1 - Complete Automated Setup (Recommended):"
echo "  sudo ./one-click-setup.sh"
echo
echo "Option 2 - Step by Step Setup:"
echo "  1. sudo ./setup-droplet.sh"
echo "  2. sudo ./env-setup.sh"
echo "  3. sudo -u partnerapp /var/www/partner-management/deploy.sh"
echo "  4. sudo ./ssl-setup.sh yourdomain.com admin@yourdomain.com"
echo
echo "📖 For detailed instructions, see README.md"
echo
echo "🏁 Ready to deploy your DIP Partner Portal!"