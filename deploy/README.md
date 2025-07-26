# DigitalOcean Deployment Guide

Bu dosyalar Partner Management System'i DigitalOcean droplet'ine deploy etmek için gerekli scriptleri içerir.

## 📋 Prerequisites

- Ubuntu 22.04 LTS droplet (minimum 2GB RAM)
- Domain name (opsiyonel, SSL için gerekli)
- GitHub repository'si

## 🚀 Deployment Steps

### 1. İlk Kurulum

Droplet'e SSH ile bağlanın ve root olarak çalıştırın:

```bash
# Script'leri indirin
wget -O setup-droplet.sh https://raw.githubusercontent.com/yourusername/partner-management-system/main/deploy/setup-droplet.sh
chmod +x setup-droplet.sh

# Kurulum script'ini çalıştırın
./setup-droplet.sh
```

### 2. Repository URL'ini Güncelleyin

```bash
# Deployment script'indeki GitHub URL'ini güncelleyin
sudo nano /var/www/partner-management/deploy.sh

# REPO_URL'yi kendi repository'nizle değiştirin
REPO_URL="https://github.com/yourusername/partner-management-system.git"
```

### 3. Environment Variables'ları Ayarlayın

```bash
# SendGrid API key'inizi ekleyin
sudo nano /var/www/partner-management/.env.production

# SENDGRID_API_KEY değerini güncelleyin
SENDGRID_API_KEY=your_actual_sendgrid_api_key
```

### 4. İlk Deployment'ı Yapın

```bash
# Deployment script'ini çalıştırın
sudo -u partnerapp /var/www/partner-management/deploy.sh

# PM2'yi sistem başlangıcında otomatik başlatmak için
sudo -u partnerapp pm2 startup
sudo -u partnerapp pm2 save
```

### 5. SSL Certificate Setup (Opsiyonel)

Domain'iniz varsa SSL sertifikası kurabilirsiniz:

```bash
# SSL setup script'ini indirin
wget -O ssl-setup.sh https://raw.githubusercontent.com/yourusername/partner-management-system/main/deploy/ssl-setup.sh
chmod +x ssl-setup.sh

# SSL'i kurun (domain'inizi ve email'inizi kullanın)
./ssl-setup.sh yourdomain.com admin@yourdomain.com
```

## 🔄 Regular Deployment

Replit'te değişiklik yaptıktan sonra, droplet'te:

```bash
sudo -u partnerapp /var/www/partner-management/deploy.sh
```

## 🤖 Otomatik Deployment Setup

GitHub webhook ile otomatik deployment için:

### 1. Webhook Script'ini Kurun

```bash
# Webhook script'ini indirin
wget -O /var/www/partner-management/webhook-deploy.sh https://raw.githubusercontent.com/yourusername/partner-management-system/main/deploy/webhook-deploy.sh
chmod +x /var/www/partner-management/webhook-deploy.sh

# Webhook endpoint'i için basit HTTP server (opsiyonel)
sudo npm install -g webhook
```

### 2. GitHub Webhook'u Ayarlayın

GitHub repository'nizde:
1. Settings > Webhooks > Add webhook
2. Payload URL: `http://your-server-ip:9000/hooks/deploy`
3. Content type: `application/json`
4. Events: `push` events

## 📊 Monitoring Setup

Sistem health monitoring için:

```bash
# Monitoring script'ini indirin
wget -O monitoring.sh https://raw.githubusercontent.com/yourusername/partner-management-system/main/deploy/monitoring.sh
chmod +x monitoring.sh

# Cron job olarak ayarlayın (her 5 dakikada bir çalışır)
(crontab -l 2>/dev/null; echo "*/5 * * * * /path/to/monitoring.sh") | crontab -
```

## 🗂️ File Structure

```
/var/www/partner-management/
├── .env.production          # Environment variables
├── deploy.sh               # Deployment script
├── webhook-deploy.sh       # Webhook deployment
├── dist/                   # Built application
├── node_modules/           # Dependencies
└── ...                     # Application files
```

## 🔧 Useful Commands

### PM2 Commands
```bash
# Uygulama durumunu kontrol et
sudo -u partnerapp pm2 list

# Logları görüntüle
sudo -u partnerapp pm2 logs partner-app

# Uygulamayı yeniden başlat
sudo -u partnerapp pm2 restart partner-app

# Uygulamayı durdur
sudo -u partnerapp pm2 stop partner-app
```

### Nginx Commands
```bash
# Nginx durumunu kontrol et
sudo systemctl status nginx

# Nginx'i yeniden başlat
sudo systemctl restart nginx

# Nginx konfigürasyonunu test et
sudo nginx -t
```

### Database Commands
```bash
# PostgreSQL'e bağlan
sudo -u postgres psql -d partner_db

# Database backup
sudo -u postgres pg_dump partner_db > backup.sql

# Database restore
sudo -u postgres psql partner_db < backup.sql
```

## 🚨 Troubleshooting

### Uygulama Çalışmıyor
1. PM2 durumunu kontrol edin: `sudo -u partnerapp pm2 list`
2. Logları kontrol edin: `sudo -u partnerapp pm2 logs partner-app`
3. Environment variables'ları kontrol edin

### Database Bağlantı Sorunu
1. PostgreSQL çalışıyor mu: `sudo systemctl status postgresql`
2. Database credentials doğru mu: `.env.production` dosyasını kontrol edin
3. Database migrations çalıştı mı: `npm run db:push`

### SSL Sorunları
1. Domain DNS ayarları doğru mu?
2. Nginx konfigürasyonu doğru mu: `sudo nginx -t`
3. Certificate geçerli mi: `sudo certbot certificates`

## 📞 Support

Sorunlarınız için:
1. Application logs: `/var/log/partner-deployment.log`
2. Nginx logs: `/var/log/nginx/error.log`
3. PM2 logs: `sudo -u partnerapp pm2 logs`