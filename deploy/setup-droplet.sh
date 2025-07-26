#!/bin/bash

# DigitalOcean Droplet Setup Script for Partner Management System
# Run this script on a fresh Ubuntu 22.04 droplet

set -e

echo "🚀 Setting up DigitalOcean droplet for Partner Management System..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
echo "🗄️ Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Install PM2 globally
echo "⚡ Installing PM2..."
sudo npm install -g pm2

# Install Git
echo "🔧 Installing Git..."
sudo apt install -y git

# Create application user
echo "👤 Creating application user..."
sudo useradd -m -s /bin/bash partnerapp || echo "User already exists"

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/partner-management
sudo chown partnerapp:partnerapp /var/www/partner-management

# Setup PostgreSQL database
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres psql << EOF
CREATE DATABASE partner_db;
CREATE USER partner_user WITH ENCRYPTED PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE partner_db TO partner_user;
\q
EOF

# Configure PostgreSQL to allow connections
echo "🔐 Configuring PostgreSQL..."
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf
echo "host    partner_db    partner_user    127.0.0.1/32    md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf
sudo systemctl restart postgresql

# Setup Nginx configuration
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/partner-management << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Serve static files
    location /assets {
        alias /var/www/partner-management/dist/public/assets;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/partner-management /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Create environment file
echo "⚙️ Creating environment configuration..."
sudo -u partnerapp tee /var/www/partner-management/.env.production << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://partner_user:SecurePassword123!@localhost:5432/partner_db
SESSION_SECRET=$(openssl rand -base64 32)
SENDGRID_API_KEY=your_sendgrid_api_key_here
EOF

# Create deployment script
echo "📝 Creating deployment script..."
sudo tee /var/www/partner-management/deploy.sh << 'EOF'
#!/bin/bash

set -e

APP_DIR="/var/www/partner-management"
REPO_URL="https://github.com/yourusername/partner-management-system.git"

echo "🚀 Starting deployment..."

cd $APP_DIR

# Check if it's first deployment
if [ ! -d ".git" ]; then
    echo "📥 First deployment - cloning repository..."
    git clone $REPO_URL .
else
    echo "🔄 Pulling latest changes..."
    git pull origin main
fi

echo "📦 Installing dependencies..."
npm ci --production

echo "🏗️ Building application..."
npm run build

echo "🗄️ Running database migrations..."
npm run db:push

echo "⚡ Restarting application..."
pm2 reload partner-app || pm2 start dist/index.js --name "partner-app"

echo "✅ Deployment completed successfully!"
EOF

sudo chmod +x /var/www/partner-management/deploy.sh
sudo chown partnerapp:partnerapp /var/www/partner-management/deploy.sh

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Install SSL certificate tools
echo "🔐 Installing SSL certificate tools..."
sudo apt install -y certbot python3-certbot-nginx

echo "✅ Droplet setup completed!"
echo ""
echo "Next steps:"
echo "1. Update the REPO_URL in /var/www/partner-management/deploy.sh"
echo "2. Add your SendGrid API key to /var/www/partner-management/.env.production"
echo "3. Run the deployment: sudo -u partnerapp /var/www/partner-management/deploy.sh"
echo "4. Setup SSL: sudo certbot --nginx -d yourdomain.com"
echo "5. Setup PM2 startup: sudo -u partnerapp pm2 startup && sudo -u partnerapp pm2 save"
EOF