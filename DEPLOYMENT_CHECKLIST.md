# Ubuntu Nginx Deployment Checklist

Quick checklist to deploy NXChat on Ubuntu with MySQL, phpMyAdmin 8.3, and Nginx.

## Pre-Deployment Checklist

- [ ] Ubuntu 22.04+ server ready
- [ ] Root or sudo access available
- [ ] Domain name registered (konnectbot.com)
- [ ] DNS records configured:
  - [ ] A record: konnectbot.com → Server IP
  - [ ] A record: www.konnectbot.com → Server IP
  - [ ] A record: api.konnectbot.com → Server IP
  - [ ] A record: phpmyadmin.konnectbot.com → Server IP
- [ ] SSH access to server
- [ ] Application files ready or repository URL

## Installation Checklist

### Initial Setup
- [ ] Update system packages (`sudo apt update && sudo apt upgrade -y`)
- [ ] Install essential tools
- [ ] Configure firewall (allow SSH, HTTP, HTTPS)
- [ ] Verify firewall rules

### MySQL Installation
- [ ] Install MySQL server
- [ ] Run MySQL secure installation
- [ ] Create database `nxchat`
- [ ] Create user `nxchat_user` with password
- [ ] Grant privileges
- [ ] Test MySQL connection

### PHP & phpMyAdmin 8.3
- [ ] Add PHP repository (ppa:ondrej/php)
- [ ] Install PHP 8.3 and extensions
- [ ] Configure PHP-FPM (upload limits, memory)
- [ ] Download phpMyAdmin 8.3
- [ ] Extract to /usr/share/phpmyadmin
- [ ] Set proper permissions
- [ ] Configure phpMyAdmin config.inc.php
- [ ] Generate blowfish secret
- [ ] Create temp directory

### Nginx Installation
- [ ] Install Nginx
- [ ] Remove default site
- [ ] Create nxchat configuration
- [ ] Create phpmyadmin configuration
- [ ] Enable sites
- [ ] Test Nginx configuration
- [ ] Restart Nginx

### Node.js Installation
- [ ] Add NodeSource repository (Node.js 20.x)
- [ ] Install Node.js
- [ ] Install PM2 globally
- [ ] Setup PM2 startup script
- [ ] Install build tools

### Application Deployment
- [ ] Create /var/www/nxchat directory
- [ ] Upload/clone application files
- [ ] Install backend dependencies (`npm install` in backend/)
- [ ] Install frontend dependencies (`npm install` in frontend/)
- [ ] Configure .env files (backend/.env)
- [ ] Set database credentials
- [ ] Set domain configuration
- [ ] Build frontend (`npm run build`)
- [ ] Initialize database (run migrations if any)
- [ ] Start backend with PM2
- [ ] Start frontend with PM2
- [ ] Save PM2 configuration

### SSL/HTTPS Setup
- [ ] Install Certbot
- [ ] Obtain SSL certificates for all domains
- [ ] Verify certificates
- [ ] Test certificate renewal
- [ ] Update phpMyAdmin ForceSSL setting

### Domain Configuration
- [ ] Verify DNS records
- [ ] Update application .env files with HTTPS URLs
- [ ] Restart all services (PM2, Nginx, PHP-FPM)

### Security Hardening
- [ ] Secure phpMyAdmin (IP restrictions if needed)
- [ ] Configure MySQL security settings
- [ ] Configure firewall (deny MySQL port if not needed)
- [ ] Setup automatic security updates

## Post-Deployment Verification

- [ ] Frontend accessible at https://konnectbot.com
- [ ] API accessible at https://api.konnectbot.com
- [ ] phpMyAdmin accessible at https://phpmyadmin.konnectbot.com
- [ ] Can login to phpMyAdmin with MySQL credentials
- [ ] Can access database through phpMyAdmin
- [ ] Application connects to database
- [ ] SSL certificates valid
- [ ] All services running (check with `pm2 status` and `systemctl status`)
- [ ] Logs show no errors

## Quick Command Reference

```bash
# Check all services
sudo systemctl status nginx mysql php8.3-fpm
pm2 status

# View logs
sudo tail -f /var/log/nginx/error.log
pm2 logs

# Test Nginx config
sudo nginx -t

# Restart services
sudo systemctl restart nginx
pm2 restart all
```

## Troubleshooting Checklist

If something doesn't work:

- [ ] Check service statuses
- [ ] Review error logs
- [ ] Verify DNS records
- [ ] Check firewall rules
- [ ] Verify ports are open
- [ ] Check file permissions
- [ ] Verify environment variables
- [ ] Test database connection
- [ ] Check SSL certificate status

---

**Use this checklist alongside the main deployment guide for systematic deployment.**

