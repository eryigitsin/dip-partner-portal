#!/bin/bash

# Development Sync Script
# Use this to sync environment variables from production to your development environment

set -e

DROPLET_IP="$1"
DROPLET_USER="${2:-root}"

if [ -z "$DROPLET_IP" ]; then
    echo "Usage: ./development-sync.sh DROPLET_IP [USER]"
    echo "Example: ./development-sync.sh 192.168.1.100 root"
    exit 1
fi

echo "🔄 Syncing development environment from production..."

# Create temporary directory
TEMP_DIR=$(mktemp -d)

# Download environment template from production
echo "📥 Downloading environment template..."
scp $DROPLET_USER@$DROPLET_IP:/var/www/partner-management/.env.development $TEMP_DIR/

if [ -f "$TEMP_DIR/.env.development" ]; then
    echo "📝 Development environment template downloaded"
    echo
    echo "📋 Environment file content:"
    echo "=========================="
    cat "$TEMP_DIR/.env.development"
    echo "=========================="
    echo
    echo "📁 Copy this file to your development environment:"
    echo "   cp $TEMP_DIR/.env.development /path/to/your/project/.env"
    echo
    echo "⚠️ Remember to:"
    echo "  • Update DATABASE_URL for your local database"
    echo "  • Change SESSION_SECRET for development"
    echo "  • Verify all API keys are correct"
else
    echo "❌ Failed to download environment template"
    exit 1
fi

# Cleanup
rm -rf $TEMP_DIR

echo "✅ Development sync completed!"