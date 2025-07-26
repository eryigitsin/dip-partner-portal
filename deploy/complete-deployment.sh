#!/bin/bash

# Complete DIP Partner Portal Deployment Script
# This single script contains everything needed to deploy your application
# Repository: https://github.com/eryigitsin/dip-partner-portal.git

set -e

REPO_URL="https://github.com/eryigitsin/dip-partner-portal.git"
REPO_BRANCH="main"
APP_DIR="/var/www/partner-management"
APP_USER="partnerapp"
APP_NAME="partner-app"
APP_PORT="3000"
DB_NAME="partner_db"
DB_USER="partner_user"

echo "🚀 DIP Partner Portal - Complete Deployment"
echo "==========================================="
echo "Repository: $REPO_URL"
echo

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script as root (use sudo)"
    exit 1
fi

# Get configuration from user
echo "📋 Configuration Setup"
echo "======================"

read -p "Enter your domain name (or press Enter for IP-only setup): " DOMAIN
read -p "Enter your email address: " EMAIL
read -s -p "Enter database password (or press Enter for auto-generated): " DB_PASSWORD
echo

if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 16)
    echo "Generated database password: ${DB_PASSWORD:0:8}..."
fi

read -s -p "Enter your SendGrid API Key: " SENDGRID_API_KEY
echo

if [ -z "$EMAIL" ]; then
    echo "❌ Email address is required"
    exit 1
fi

if [ -z "$SENDGRID_API_KEY" ]; then
    echo "❌ SendGrid API Key is required"
    exit 1
fi

# Generate session secret
SESSION_SECRET=$(openssl rand -base64 32)

echo
echo "🔄 Starting automated setup..."

# Step 1: Update system
echo "1️⃣ Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install Node.js 18.x
echo "2️⃣ Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Step 3: Install PostgreSQL
echo "3️⃣ Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Step 4: Install Nginx
echo "4️⃣ Installing Nginx..."
apt install -y nginx

# Step 5: Install PM2 globally
echo "5️⃣ Installing PM2..."
npm install -g pm2

# Step 6: Install Git and other tools
echo "6️⃣ Installing additional tools..."
apt install -y git curl ufw certbot python3-certbot-nginx

# Step 7: Create application user
echo "7️⃣ Creating application user..."
useradd -m -s /bin/bash $APP_USER || echo "User already exists"

# Step 8: Create application directory
echo "8️⃣ Creating application directory..."
mkdir -p $APP_DIR
chown $APP_USER:$APP_USER $APP_DIR

# Step 9: Setup PostgreSQL database
echo "9️⃣ Setting up PostgreSQL database..."
sudo -u postgres psql << EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME') THEN
        CREATE DATABASE $DB_NAME;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
    END IF;
    
    GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
END
\$\$;
\q
EOF

# Step 10: Configure PostgreSQL
echo "🔟 Configuring PostgreSQL..."
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf
if ! grep -q "host    $DB_NAME    $DB_USER    127.0.0.1/32    md5" /etc/postgresql/*/main/pg_hba.conf; then
    echo "host    $DB_NAME    $DB_USER    127.0.0.1/32    md5" >> /etc/postgresql/*/main/pg_hba.conf
fi
systemctl restart postgresql

# Step 11: Setup Nginx configuration
echo "1️⃣1️⃣ Configuring Nginx..."
cat > /etc/nginx/sites-available/partner-management << EOF
server {
    listen 80;
    server_name ${DOMAIN:-_};

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /assets {
        alias $APP_DIR/dist/public/assets;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/partner-management /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Step 12: Setup firewall
echo "1️⃣2️⃣ Configuring firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Step 13: Clone repository and setup
echo "1️⃣3️⃣ Cloning repository..."
cd $APP_DIR
if [ ! -d ".git" ]; then
    sudo -u $APP_USER git clone $REPO_URL .
else
    sudo -u $APP_USER git pull origin $REPO_BRANCH
fi

# Step 14: Create environment file
echo "1️⃣4️⃣ Creating environment configuration..."
sudo -u $APP_USER tee $APP_DIR/.env.production << EOF
NODE_ENV=production
PORT=$APP_PORT
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
SESSION_SECRET=$SESSION_SECRET
SENDGRID_API_KEY=$SENDGRID_API_KEY
FORCE_HTTPS=${DOMAIN:+true}
TRUST_PROXY=true
EOF

chmod 600 $APP_DIR/.env.production

# Step 15: Install dependencies and build
echo "1️⃣5️⃣ Installing dependencies and building..."
cd $APP_DIR
sudo -u $APP_USER npm ci --production
sudo -u $APP_USER npm run build

# Step 16: Run database migrations
echo "1️⃣6️⃣ Running database migrations..."
sudo -u $APP_USER npm run db:push

# Step 17: Start application with PM2
echo "1️⃣7️⃣ Starting application..."
sudo -u $APP_USER pm2 start dist/index.js --name "$APP_NAME" --env production
sudo -u $APP_USER pm2 startup
sudo -u $APP_USER pm2 save

# Step 18: Setup SSL if domain provided
if [ ! -z "$DOMAIN" ]; then
    echo "1️⃣8️⃣ Setting up SSL certificate..."
    certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect
    
    # Setup automatic renewal
    (crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/certbot renew --quiet") | crontab -
fi

# Step 19: Create deployment script for future updates
echo "1️⃣9️⃣ Creating deployment script..."
cat > $APP_DIR/deploy.sh << 'EOF'
#!/bin/bash
set -e

APP_DIR="/var/www/partner-management"
APP_USER="partnerapp" 
APP_NAME="partner-app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting deployment..."

cd $APP_DIR

# Backup current version
cp -r . /tmp/backup-$TIMESTAMP 2>/dev/null || true

# Pull latest changes
sudo -u $APP_USER git fetch origin
sudo -u $APP_USER git reset --hard origin/main

# Install dependencies
sudo -u $APP_USER npm ci --production

# Build application
sudo -u $APP_USER npm run build

# Run migrations
sudo -u $APP_USER npm run db:push

# Restart application
sudo -u $APP_USER pm2 reload $APP_NAME --update-env

# Health check
sleep 5
if curl -f http://localhost:3000/api/init > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
    rm -rf /tmp/backup-$TIMESTAMP
else
    echo "❌ Deployment failed - rolling back"
    if [ -d "/tmp/backup-$TIMESTAMP" ]; then
        rm -rf $APP_DIR
        mv /tmp/backup-$TIMESTAMP $APP_DIR
        sudo -u $APP_USER pm2 restart $APP_NAME
    fi
    exit 1
fi
EOF

chmod +x $APP_DIR/deploy.sh
chown $APP_USER:$APP_USER $APP_DIR/deploy.sh

# Step 20: Create monitoring script
echo "2️⃣0️⃣ Setting up monitoring..."
cat > /usr/local/bin/partner-monitoring << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/partner-monitoring.log"
APP_USER="partnerapp"
APP_NAME="partner-app"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Check if PM2 process is running
if ! sudo -u $APP_USER pm2 list | grep -q "$APP_NAME.*online"; then
    log "🚨 ALERT: PM2 process '$APP_NAME' is not running"
    sudo -u $APP_USER pm2 restart $APP_NAME
    log "🔄 Attempted to restart application"
fi

# Check HTTP health
if ! curl -f http://localhost:3000/api/init > /dev/null 2>&1; then
    log "🚨 ALERT: HTTP health check failed"
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    log "⚠️ WARNING: Disk usage is at ${DISK_USAGE}%"
fi

log "✅ Health check completed"
EOF

chmod +x /usr/local/bin/partner-monitoring

# Add monitoring to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/partner-monitoring") | crontab -

# Final health check
echo "🏥 Performing final health check..."
sleep 5
if curl -f http://localhost:$APP_PORT/api/init > /dev/null 2>&1; then
    echo "✅ Application is healthy!"
else
    echo "⚠️ Application may not be responding correctly"
fi

echo
echo "🎉 Deployment completed successfully!"
echo
echo "📋 Summary:"
echo "  • Repository: $REPO_URL"
if [ ! -z "$DOMAIN" ]; then
    echo "  • URL: https://$DOMAIN"
else
    echo "  • URL: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
fi
echo "  • Application: Running on PM2"
echo "  • Database: PostgreSQL configured"
echo "  • SSL: $([ ! -z "$DOMAIN" ] && echo "Enabled with Let's Encrypt" || echo "Not configured (IP-only setup)")"
echo "  • Monitoring: Enabled (every 5 minutes)"
echo
echo "🔧 Useful commands:"
echo "  • Check status: sudo -u $APP_USER pm2 list"
echo "  • View logs: sudo -u $APP_USER pm2 logs $APP_NAME"
echo "  • Deploy updates: $APP_DIR/deploy.sh"
echo "  • Check monitoring: tail -f /var/log/partner-monitoring.log"
echo
echo "📝 For future deployments:"
echo "  1. Make changes in Replit"
echo "  2. Push to GitHub: git push origin main"
echo "  3. Deploy: $APP_DIR/deploy.sh"
echo
echo "✅ Your DIP Partner Portal is now live!"