# DIP Partner Portal - DigitalOcean Deployment Guide

Bu guide, DIP Partner Portal projesini DigitalOcean droplet'ine deploy etmek için gerekli tüm adımları içerir.

## 🚀 Hızlı Başlangıç

### 1. Script'leri İndirin

DigitalOcean droplet'inize SSH ile bağlanın ve aşağıdaki komutu çalıştırın:

```bash
wget -O install-scripts.sh https://raw.githubusercontent.com/eryigitsin/dip-partner-portal/main/deploy/install-scripts.sh
chmod +x install-scripts.sh
./install-scripts.sh
cd dip-deploy
```

### 2. Tek Tıkla Kurulum (Önerilen)

```bash
sudo ./one-click-setup.sh
```

Bu script sizden şunları soracak:
- ✅ Repository URL'i (otomatik dolu gelecek)
- ✅ Domain adınız (opsiyonel)
- ✅ Email adresiniz
- ✅ Database şifreniz
- ✅ SendGrid API key'iniz

## 📋 Manuel Kurulum

Adım adım kurulum yapmak isterseniz:

### Adım 1: Sunucu Kurulumu
```bash
sudo ./setup-droplet.sh
```

### Adım 2: Environment Konfigürasyonu
```bash
sudo ./env-setup.sh
```

### Adım 3: İlk Deployment
```bash
sudo -u partnerapp /var/www/partner-management/deploy.sh
```

### Adım 4: SSL Sertifikası (Opsiyonel)
```bash
sudo ./ssl-setup.sh yourdomain.com admin@yourdomain.com
```

## 🔄 Güncellemeler

Replit'te değişiklik yaptıktan sonra:

```bash
# 1. Replit'te GitHub'a push edin
git add .
git commit -m "Yeni değişiklikler"
git push origin main

# 2. Droplet'te deploy edin
sudo -u partnerapp /var/www/partner-management/deploy.sh
```

## 📊 Sistem Yönetimi

### Uygulama Durumu
```bash
# PM2 ile uygulama durumunu kontrol edin
sudo -u partnerapp pm2 list

# Logları görüntüleyin
sudo -u partnerapp pm2 logs partner-app

# Uygulamayı yeniden başlatın
sudo -u partnerapp pm2 restart partner-app
```

### Database Yönetimi
```bash
# PostgreSQL'e bağlanın
sudo -u postgres psql -d partner_db

# Database backup alın
sudo -u postgres pg_dump partner_db > backup_$(date +%Y%m%d).sql

# Database'i restore edin
sudo -u postgres psql partner_db < backup_20240101.sql
```

### Monitoring
```bash
# Monitoring loglarını kontrol edin
tail -f /var/log/partner-monitoring.log

# Manuel health check
curl http://localhost:3000/api/init
```

## 🔧 Troubleshooting

### Uygulama Çalışmıyor
1. PM2 durumunu kontrol edin: `sudo -u partnerapp pm2 list`
2. Environment variables'ları kontrol edin: `cat /var/www/partner-management/.env.production`
3. Build'in başarılı olduğunu kontrol edin: `ls -la /var/www/partner-management/dist/`

### Database Bağlantı Sorunu
1. PostgreSQL çalışıyor mu: `sudo systemctl status postgresql`
2. Database credentials doğru mu: `.env.production` dosyasını kontrol edin
3. Database test edin: `node /var/www/partner-management/deploy/db-check.js`

### SSL Sorunları
1. Domain DNS ayarları doğru mu?
2. Nginx konfigürasyonu: `sudo nginx -t`
3. Certificate durumu: `sudo certbot certificates`

## 🛡️ Güvenlik

### Firewall Ayarları
```bash
# Mevcut kuralları kontrol edin
sudo ufw status

# Yeni kural ekleyin
sudo ufw allow from YOUR_IP to any port 22
```

### Backup Stratejisi
```bash
# Otomatik backup için cron job
echo "0 2 * * * /var/www/partner-management/backup.sh" | sudo crontab -
```

## 🔔 Webhook Setup (Otomatik Deploy)

GitHub repository'nizde webhook kurarak otomatik deployment yapabilirsiniz:

1. GitHub'da Settings > Webhooks > Add webhook
2. Payload URL: `http://your-server-ip:9000/hooks/deploy`
3. Content type: `application/json`
4. Events: `push` events

## 📞 Destek

Sorunlarınız için log dosyalarını kontrol edin:
- Application logs: `sudo -u partnerapp pm2 logs partner-app`
- Deployment logs: `/var/log/partner-deployment.log`
- Monitoring logs: `/var/log/partner-monitoring.log`
- Nginx logs: `/var/log/nginx/error.log`

## 🎯 Production Checklist

Deploy öncesi kontrol listesi:

- [ ] Repository URL'i doğru ayarlandı
- [ ] Environment variables ayarlandı
- [ ] SendGrid API key eklendi
- [ ] Database şifresi güçlü
- [ ] Domain DNS ayarları yapıldı
- [ ] SSL sertifikası kuruldu
- [ ] Firewall kuralları ayarlandı
- [ ] Monitoring aktif
- [ ] Backup stratejisi oluşturuldu

## 🚀 Son Adımlar

Deploy tamamlandıktan sonra:
1. Browser'da sitenizi test edin
2. Partner kayıt işlemini test edin
3. Email gönderimini test edin
4. SSL sertifikasını kontrol edin
5. Performance testleri yapın

Başarılar! DIP Partner Portal'ınız artık canlıda! 🎉