#!/bin/bash

# Monitoring and Maintenance Script for Partner Management System
# Run this script periodically (via cron) to monitor application health

LOG_FILE="/var/log/partner-monitoring.log"
APP_DIR="/var/www/partner-management"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Function to send alert (customize as needed)
send_alert() {
    local message="$1"
    log "🚨 ALERT: $message"
    
    # Optional: Send email alert
    # echo "$message" | mail -s "Partner Management System Alert" admin@yourdomain.com
    
    # Optional: Send Slack notification
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"🚨 Alert: $message\"}" \
    #     YOUR_SLACK_WEBHOOK_URL
}

log "🔍 Starting health check..."

# Check if PM2 process is running
if ! sudo -u partnerapp pm2 list | grep -q "partner-app.*online"; then
    send_alert "PM2 process 'partner-app' is not running"
    
    # Attempt to restart
    log "🔄 Attempting to restart application..."
    sudo -u partnerapp pm2 restart partner-app
    
    sleep 10
    
    if sudo -u partnerapp pm2 list | grep -q "partner-app.*online"; then
        log "✅ Application restarted successfully"
    else
        send_alert "Failed to restart application - manual intervention required"
        exit 1
    fi
fi

# Check HTTP endpoint health
if ! curl -f http://localhost:3000/api/init > /dev/null 2>&1; then
    send_alert "HTTP health check failed - application not responding"
    
    # Check PM2 logs for errors
    log "📋 Recent PM2 logs:"
    sudo -u partnerapp pm2 logs partner-app --lines 10 | tee -a $LOG_FILE
    
    exit 1
fi

# Check database connectivity
cd $APP_DIR
if ! sudo -u partnerapp timeout 10 npm run db:check > /dev/null 2>&1; then
    send_alert "Database connectivity check failed"
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    send_alert "Disk usage is at ${DISK_USAGE}% - consider cleaning up"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 90 ]; then
    send_alert "Memory usage is at ${MEMORY_USAGE}% - consider investigating"
fi

# Check for application errors in PM2 logs
ERROR_COUNT=$(sudo -u partnerapp pm2 logs partner-app --lines 100 --nostream | grep -i "error" | wc -l)
if [ $ERROR_COUNT -gt 10 ]; then
    send_alert "High number of errors detected in application logs ($ERROR_COUNT errors in last 100 log lines)"
fi

# Check Nginx status
if ! systemctl is-active --quiet nginx; then
    send_alert "Nginx is not running"
    sudo systemctl start nginx
fi

# Check PostgreSQL status
if ! systemctl is-active --quiet postgresql; then
    send_alert "PostgreSQL is not running"
    sudo systemctl start postgresql
fi

log "✅ Health check completed - all systems operational"

# Log system stats
log "📊 System Stats:"
log "   CPU Usage: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
log "   Memory Usage: ${MEMORY_USAGE}%"
log "   Disk Usage: ${DISK_USAGE}%"
log "   Load Average: $(uptime | awk -F'load average:' '{ print $2 }')"