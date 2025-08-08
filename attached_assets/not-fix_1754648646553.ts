#Server Port Configuration Düzeltmesi
#server/index.ts dosyası için.

import express from 'express';
import dotenv from 'dotenv';

// Environment variables'ı yükle
dotenv.config();

const app = express();

// PORT'u dinamik olarak al - ÇOK ÖNEMLİ!
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Tüm interface'leri dinle

// ... diğer middleware'ler ...

// Server'ı başlat - KRİTİK BÖLÜM
app.listen(PORT, HOST, () => {
	console.log(`✅ Server is running on ${HOST}:${PORT}`);
	console.log(`📍 Environment: ${process.env.NODE_ENV}`);
	console.log(`🔗 URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
	console.log('SIGTERM signal received: closing HTTP server');
	process.exit(0);
});

------------------------

#Package.json Scripts Güncelleme

{
	"scripts": {
		"dev": "nodemon server/index.ts",
		"build": "tsc",
		"start": "node dist/server/index.js",
		"start:prod": "NODE_ENV=production node dist/server/index.js",
		"pm2:start": "pm2 start ecosystem.config.js",
		"pm2:restart": "pm2 restart ecosystem.config.js --update-env"
	}
}

-------------------------

#Replit Configuration (replit.toml)

run = "npm run start"
entrypoint = "server/index.ts"

[env]
PORT = "8080"
NODE_ENV = "development"

[nix]
channel = "stable-22_11"

[languages.typescript]
pattern = "**/*.{ts,tsx}"
syntax = "typescript"

[[ports]]
localPort = 8080
externalPort = 80

--------------------------

#Production PM2 Configuration

module.exports = {
	apps: [{
		name: 'dip-partner',
		script: './dist/server/index.js',
		instances: 1,
		exec_mode: 'fork',
		autorestart: true,
		watch: false,
		max_memory_restart: '1G',
		env: {
			NODE_ENV: 'production',
			PORT: process.env.PORT || 3001, // Hosting provider'ın PORT'unu kullan
			HOST: '0.0.0.0',
			SESSION_SECRET: 'your-secret-key',
			DATABASE_URL: 'postgresql://...',
		},
		error_file: './logs/err.log',
		out_file: './logs/out.log',
		time: true,
		// Port binding için önemli
		listen_timeout: 3000,
		kill_timeout: 5000
	}]
};

---------------------------

#Nginx Proxy Configuration (Port doğru yönleniyor mu?)

server {
	listen 443 ssl http2;
	server_name partner.dip.tc;
	
	location / {
		# Backend port'unu kontrol edin
		proxy_pass http://127.0.0.1:3001; # veya dinamik PORT
		proxy_http_version 1.1;
		
		# Headers
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
		
		# WebSocket için
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
		
		# Timeout settings
		proxy_connect_timeout 60s;
		proxy_send_timeout 60s;
		proxy_read_timeout 60s;
	}
}

#Health Check

// server/routes/health.ts
app.get('/api/health', (req, res) => {
	res.json({
		status: 'OK',
		port: process.env.PORT || 3001,
		environment: process.env.NODE_ENV,
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		memory: process.memoryUsage(),
	});
});