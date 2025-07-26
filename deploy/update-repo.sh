#!/bin/bash

# Repository URL Update Script
# Use this script to update all deployment scripts with your repository URL

set -e

NEW_REPO_URL="$1"

if [ -z "$NEW_REPO_URL" ]; then
    echo "❌ Please provide your repository URL"
    echo "Usage: ./update-repo.sh https://github.com/eryigitsin/dip-partner-portal.git"
    exit 1
fi

echo "🔄 Updating repository URL to: $NEW_REPO_URL"

# Update config.sh
if [ -f "config.sh" ]; then
    sed -i "s|export REPO_URL=.*|export REPO_URL=\"$NEW_REPO_URL\"|" config.sh
    echo "✓ Updated config.sh"
fi

# Update deploy.sh
if [ -f "deploy.sh" ]; then
    sed -i "s|REPO_URL=.*|REPO_URL=\"$NEW_REPO_URL\"|" deploy.sh
    echo "✓ Updated deploy.sh"
fi

# Update webhook-deploy.sh
if [ -f "webhook-deploy.sh" ]; then
    sed -i "s|REPO_URL=.*|REPO_URL=\"$NEW_REPO_URL\"|" webhook-deploy.sh
    echo "✓ Updated webhook-deploy.sh"
fi

# Update setup-droplet.sh
if [ -f "setup-droplet.sh" ]; then
    sed -i "s|https://raw.githubusercontent.com/yourusername/partner-management-system|${NEW_REPO_URL/github.com/raw.githubusercontent.com}|g" setup-droplet.sh
    echo "✓ Updated setup-droplet.sh"
fi

# Update README.md
if [ -f "README.md" ]; then
    sed -i "s|https://github.com/yourusername/partner-management-system|$NEW_REPO_URL|g" README.md
    sed -i "s|https://raw.githubusercontent.com/yourusername/partner-management-system|${NEW_REPO_URL/github.com/raw.githubusercontent.com}|g" README.md
    echo "✓ Updated README.md"
fi

# Update GitHub workflow
if [ -f "github-workflow.yml" ]; then
    sed -i "s|# Save this as .github/workflows/deploy.yml in your repository|# Save this as .github/workflows/deploy.yml in $NEW_REPO_URL|" github-workflow.yml
    echo "✓ Updated github-workflow.yml"
fi

echo "✅ All files updated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Commit these changes to your repository"
echo "2. Push to GitHub: git push origin main"
echo "3. Update environment variables using env-setup.sh"
echo "4. Run deployment on your droplet"