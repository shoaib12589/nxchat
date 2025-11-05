# Complete Ubuntu Nginx Deployment Guide - MySQL, phpMyAdmin 8.3 & Node.js

Complete step-by-step guide to deploy NXChat on Ubuntu with Nginx, MySQL, phpMyAdmin 8.3, and Node.js, including subdomain setup for phpMyAdmin.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Server Setup](#initial-server-setup)
3. [MySQL Installation & Configuration](#mysql-installation--configuration)
4. [PHP & phpMyAdmin 8.3 Installation](#php--phpmyadmin-83-installation)
5. [Nginx Installation & Configuration](#nginx-installation--configuration)
6. [Node.js Installation](#nodejs-installation)
7. [Application Deployment](#application-deployment)
8. [SSL/HTTPS Setup with Let's Encrypt](#sslhttps-setup-with-lets-encrypt)
9. [Domain Configuration](#domain-configuration)
10. [Security Hardening](#security-hardening)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- **Ubuntu 22.04 LTS** or **Ubuntu 24.04 LTS** (recommended)
- **Root or sudo access** to the server
- **Domain name** (e.g., `konnectbot.com`) pointing to your server IP
- **SSH access** to your server

### DNS Records Required
Before starting, ensure these DNS records are configured:
- `A` record: `konnectbot.com` → Your server IP
- `A` record: `www.konnectbot.com` → Your server IP
- `A` record: `api.konnectbot.com` → Your server IP
- `A` record: `phpmyadmin.konnectbot.com` → Your server IP

---

## Initial Server Setup

### Step 1: Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Essential Tools

```bash
sudo apt install -y curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

### Step 3: Configure Firewall

```bash
# Check firewall status
sudo ufw status

# Allow SSH (important - do this first!)
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS (will configure later)
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Verify firewall status
sudo ufw status
```

---

## MySQL Installation & Configuration

### Step 1: Install MySQL Server

```bash
# Install MySQL Server
sudo apt install mysql-server -y

# Check MySQL version
mysql --version
```

### Step 2: Secure MySQL Installation

```bash
# Run MySQL secure installation
sudo mysql_secure_installation
```

Follow the prompts:
- **Set root password?** → Yes (or press Enter if using auth_socket)
- **Remove anonymous users?** → Yes
- **Disallow root login remotely?** → Yes (unless you need remote access)
- **Remove test database?** → Yes
- **Reload privilege tables?** → Yes

### Step 3: Create Database and User

```bash
# Login to MySQL as root
sudo mysql -u root -p
```

Once in MySQL prompt, run:

```sql
-- Create database
CREATE DATABASE nxchat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (replace 'your_secure_password' with a strong password)
CREATE USER 'nxchat_user'@'localhost' IDENTIFIED BY 'shoaib125890000S$';

-- Grant privileges
GRANT ALL PRIVILEGES ON nxchat.* TO 'nxchat_user'@'localhost';

-- Grant privileges for phpMyAdmin (optional but recommended)
GRANT SELECT, INSERT, UPDATE, DELETE ON nxchat.* TO 'nxchat_user'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
EXIT;
```

### Step 4: Configure MySQL for Remote Access (Optional)

If you need remote MySQL access:

```bash
# Edit MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Find and comment out or modify:
```ini
# bind-address = 127.0.0.1
bind-address = 0.0.0.0
```

Then restart MySQL:
```bash
sudo systemctl restart mysql
```

**Important**: Only enable remote access if necessary and secure it with firewall rules.

### Step 5: Test MySQL Connection

```bash
# Test connection
mysql -u nxchat_user -p nxchat

# Should connect successfully
# Type EXIT to leave
```

---

## PHP & phpMyAdmin 8.3 Installation

### Step 1: Install PHP 8.3 and Required Extensions

```bash
# Add PHP repository
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Install PHP 8.3 and required extensions
sudo apt install -y php8.3 php8.3-fpm php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-gd php8.3-bcmath php8.3-intl php8.3-readline
```

### Step 2: Configure PHP-FPM

```bash
# Edit PHP-FPM configuration
sudo nano /etc/php/8.3/fpm/php.ini
```

Find and update these settings:
```ini
upload_max_filesize = 64M
post_max_size = 64M
memory_limit = 256M
max_execution_time = 300
max_input_time = 300
```

Save and restart PHP-FPM:
```bash
sudo systemctl restart php8.3-fpm
sudo systemctl enable php8.3-fpm
```

### Step 3: Download and Install phpMyAdmin 8.3

```bash
# Navigate to web root
cd /usr/share

# Download phpMyAdmin 8.3 (check latest version at https://www.phpmyadmin.net/downloads/)
cd /tmp
wget https://files.phpmyadmin.net/phpMyAdmin/5.2.3/phpMyAdmin-5.2.3-all-languages.tar.gz

# Extract
tar -xzf phpMyAdmin-5.2.3-all-languages.tar.gz

# Move to web directory
sudo mv phpMyAdmin-5.2.3-all-languages /usr/share/phpmyadmin

# Set permissions
sudo chown -R www-data:www-data /usr/share/phpmyadmin
sudo chmod -R 755 /usr/share/phpmyadmin
```

### Step 4: Configure phpMyAdmin

```bash
# Copy sample configuration
sudo cp /usr/share/phpmyadmin/config.sample.inc.php /usr/share/phpmyadmin/config.inc.php

# Edit configuration
sudo nano /usr/share/phpmyadmin/config.inc.php
```

Add or modify these settings:

```php
<?php
/**
 * phpMyAdmin configuration
 */

$cfg['blowfish_secret'] = 'your-random-32-character-string-here'; // Generate a random 32-character string

/* Servers configuration */
$i = 0;
$i++;
$cfg['Servers'][$i]['host'] = 'localhost';
$cfg['Servers'][$i]['compress'] = false;
$cfg['Servers'][$i]['AllowNoPassword'] = false;

/* Directories for saving/loading files from server */
$cfg['UploadDir'] = '';
$cfg['SaveDir'] = '';

/* Security settings */
$cfg['ForceSSL'] = true; // Force HTTPS (enable after SSL setup)
$cfg['AllowArbitraryServer'] = false;
$cfg['LoginCookieValidity'] = 14400; // 4 hours

/* UI Settings */
$cfg['MaxRows'] = 50;
$cfg['DefaultCharset'] = 'utf8mb4';
$cfg['DefaultConnectionCollation'] = 'utf8mb4_unicode_ci';
```

Generate blowfish secret:
```bash
# Generate random 32-character string
openssl rand -base64 32
```

### Step 5: Create phpMyAdmin Temporary Directory

```bash
# Create temp directory
sudo mkdir -p /usr/share/phpmyadmin/tmp
sudo chown -R www-data:www-data /usr/share/phpmyadmin/tmp
sudo chmod 777 /usr/share/phpmyadmin/tmp
```

---

## Nginx Installation & Configuration

### Step 1: Install Nginx

```bash
# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Step 2: Remove Default Configuration

```bash
# Remove default site
sudo rm /etc/nginx/sites-enabled/default
```

### Step 3: Create Nginx Configuration for Main Application

```bash
# Create configuration file
sudo nano /etc/nginx/sites-available/nxchat
```

Paste this configuration:

```nginx
# Upstream servers
upstream backend {
    server localhost:3001;
    keepalive 64;
}

upstream frontend {
    server localhost:3000;
    keepalive 64;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=50r/s;

# Backend API Server (api.konnectbot.com)
server {
    listen 80;
    listen [::]:80;
    server_name api.konnectbot.com;

    # Logging
    access_log /var/log/nginx/api-access.log;
    error_log /var/log/nginx/api-error.log;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API endpoints
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.io configuration
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 7d;
    }

    # Default backend location
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # File upload size limit
    client_max_body_size 10M;
}

# Frontend Server (konnectbot.com)
server {
    listen 80;
    listen [::]:80;
    server_name konnectbot.com www.konnectbot.com;

    # Logging
    access_log /var/log/nginx/frontend-access.log;
    error_log /var/log/nginx/frontend-error.log;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend application
    location / {
        limit_req zone=general_limit burst=50 nodelay;
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # File upload size limit
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
}
```

Save and exit (Ctrl+X, then Y, then Enter).

### Step 4: Create Nginx Configuration for phpMyAdmin Subdomain

```bash
# Create phpMyAdmin configuration
sudo nano /etc/nginx/sites-available/phpmyadmin
```

Paste this configuration:

```nginx
# phpMyAdmin Server (phpmyadmin.konnectbot.com)
server {
    listen 80;
    listen [::]:80;
    server_name phpmyadmin.konnectbot.com;

    root /usr/share/phpmyadmin;
    index index.php index.html index.htm;

    # Logging
    access_log /var/log/nginx/phpmyadmin-access.log;
    error_log /var/log/nginx/phpmyadmin-error.log;

    # Security: Restrict access by IP (optional - uncomment and add your IP)
    # allow 1.2.3.4;  # Replace with your IP address
    # deny all;

    # Main location
    location / {
        try_files $uri $uri/ =404;
    }

    # PHP processing
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        
        # Security headers
        fastcgi_read_timeout 300;
    }

    # Deny access to sensitive files and directories
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ ^/(config|tmp|libraries|setup/frames|setup/libs|vendor) {
        deny all;
        return 404;
    }

    # Deny access to SQL files
    location ~ \.sql$ {
        deny all;
        return 404;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

Save and exit.

### Step 5: Enable Sites and Test Configuration

```bash
# Enable sites
sudo ln -s /etc/nginx/sites-available/nxchat /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/phpmyadmin /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# If test is successful, restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

---

## Node.js Installation

### Step 1: Install Node.js 20.x (LTS)

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version

# Setup PM2 startup script
pm2 startup systemd
# Follow the command it outputs (usually: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your_user --hp /home/your_user)
```

### Step 3: Install Build Tools (if needed)

```bash
# Install build tools for native modules
sudo apt install -y build-essential python3
```

---

## Application Deployment

### Step 1: Clone or Upload Application

```bash
# Create application directory
sudo mkdir -p /var/www/nxchat
sudo chown -R $USER:$USER /var/www/nxchat

# Navigate to directory
cd /var/www/nxchat

# If using git, clone your repository
git clone https://your-repo-url.git .

sudo git clone https://github.com/shoaib12589/nxchat.git

# Or upload your files via SCP/SFTP
```

### Step 2: Install Application Dependencies

```bash
# Install backend dependencies
cd /var/www/nxchat/backend
npm install

# Install frontend dependencies
cd /var/www/nxchat/frontend
npm install
```

### Step 3: Configure Environment Variables

```bash
# Copy .env files
cd /var/www/nxchat
cp .env.example .env
cp backend/.env.example backend/.env

# Edit backend .env file
nano backend/.env
```

Update with your production values:

```env
# Database Configuration
MYSQL_HOST=localhost
MYSQL_USER=nxchat_user
MYSQL_PASSWORD=your_secure_password
MYSQL_DB=nxchat
MYSQL_PORT=3306

# Domain Configuration
DOMAIN=konnectbot.com
USE_HTTPS=true

# Server Configuration
PORT=3001
NODE_ENV=production

# URLs (auto-generated from DOMAIN)
FRONTEND_URL=https://konnectbot.com
BACKEND_URL=https://api.konnectbot.com
SOCKET_URL=https://api.konnectbot.com
API_URL=https://api.konnectbot.com/api

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Add your other API keys (OpenAI, Stripe, etc.)
```

### Step 4: Build Frontend

```bash
# Build frontend for production
cd /var/www/nxchat/frontend
npm run build
```

### Step 5: Initialize Database

```bash
# Navigate to backend
cd /var/www/nxchat/backend

# Run database migrations (if you have any)
# node scripts/fix-and-optimize-database.js

# Or manually create tables using Sequelize
# The application should auto-create tables on first run
```

### Step 6: Start Application with PM2

```bash
# Navigate to project root
cd /var/www/nxchat

# Start backend
cd backend
pm2 start server.js --name nxchat-backend

# Start frontend (if using Next.js standalone)
cd ../frontend
pm2 start npm --name nxchat-frontend -- start

# Or if frontend is built static, serve it with Nginx directly
# (Update Nginx config to serve static files)

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs
```

### Step 7: Configure PM2 for Auto-restart

```bash
# Generate PM2 startup script
pm2 startup

# Follow the command it outputs
# Example: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# Save PM2 process list
pm2 save
```

---

## SSL/HTTPS Setup with Let's Encrypt

### Step 1: Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Step 2: Obtain SSL Certificates

```bash
# Obtain certificates for all domains
sudo certbot --nginx -d konnectbot.com -d www.konnectbot.com -d api.konnectbot.com -d phpmyadmin.konnectbot.com
```

Follow the prompts:
- **Enter your email address** → Your email
- **Agree to terms** → A
- **Share email with EFF** → Y or N (your choice)
- **Redirect HTTP to HTTPS** → 2 (redirect all traffic)

### Step 3: Verify SSL Certificates

```bash
# List certificates
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run
```

### Step 4: Update phpMyAdmin Configuration for HTTPS

```bash
# Edit phpMyAdmin config
sudo nano /usr/share/phpmyadmin/config.inc.php
```

Ensure this is set:
```php
$cfg['ForceSSL'] = true;
```

### Step 5: Auto-renewal Setup

Certbot automatically creates a renewal cron job. Verify it:

```bash
# Check renewal configuration
sudo systemctl status certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

---

## Domain Configuration

### Step 1: Verify DNS Records

Ensure all DNS records are properly configured:

```bash
# Check DNS records
dig konnectbot.com
dig api.konnectbot.com
dig phpmyadmin.konnectbot.com
```

### Step 2: Update Application Environment Variables

After SSL is configured, ensure your `.env` files use HTTPS:

```env
USE_HTTPS=true
FRONTEND_URL=https://konnectbot.com
BACKEND_URL=https://api.konnectbot.com
SOCKET_URL=https://api.konnectbot.com
API_URL=https://api.konnectbot.com/api
```

### Step 3: Restart Services

```bash
# Restart PM2 processes
pm2 restart all

# Restart Nginx
sudo systemctl restart nginx

# Restart PHP-FPM
sudo systemctl restart php8.3-fpm
```

---

## Security Hardening

### Step 1: Secure phpMyAdmin

```bash
# Create additional security file
sudo nano /usr/share/phpmyadmin/.htaccess
```

Add:
```apache
# Only allow access from specific IPs (uncomment and add your IP)
# Order Deny,Allow
# Deny from all
# Allow from 1.2.3.4
```

### Step 2: Configure MySQL Security

```bash
# Edit MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add security settings:
```ini
[mysqld]
# Disable remote access (if not needed)
bind-address = 127.0.0.1

# Security settings
local-infile = 0
```

Restart MySQL:
```bash
sudo systemctl restart mysql
```

### Step 3: Configure Firewall

```bash
# Allow only necessary ports
sudo ufw status

# Deny MySQL port from external access (if not needed)
sudo ufw deny 3306

# Check firewall rules
sudo ufw status verbose
```

### Step 4: Regular Security Updates

```bash
# Set up automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Troubleshooting

### Common Issues

#### 1. Nginx 502 Bad Gateway

```bash
# Check if Node.js app is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if ports are in use
sudo netstat -tulpn | grep :3001
sudo netstat -tulpn | grep :3000
```

#### 2. phpMyAdmin Not Loading

```bash
# Check PHP-FPM status
sudo systemctl status php8.3-fpm

# Check PHP-FPM error logs
sudo tail -f /var/log/php8.3-fpm.log

# Check Nginx error logs
sudo tail -f /var/log/nginx/phpmyadmin-error.log

# Verify PHP-FPM socket
ls -la /var/run/php/php8.3-fpm.sock
```

#### 3. MySQL Connection Issues

```bash
# Check MySQL status
sudo systemctl status mysql

# Test MySQL connection
mysql -u nxchat_user -p nxchat

# Check MySQL error logs
sudo tail -f /var/log/mysql/error.log
```

#### 4. SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew

# Check Nginx SSL configuration
sudo nginx -t
```

#### 5. PM2 Process Issues

```bash
# Check PM2 logs
pm2 logs

# Restart all processes
pm2 restart all

# Check PM2 status
pm2 status

# View detailed info
pm2 show nxchat-backend
```

### Useful Commands

```bash
# Check all service statuses
sudo systemctl status nginx
sudo systemctl status mysql
sudo systemctl status php8.3-fpm
pm2 status

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
pm2 logs nxchat-backend

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Quick Reference

### Service Management

```bash
# Nginx
sudo systemctl start/stop/restart/reload nginx
sudo systemctl status nginx

# MySQL
sudo systemctl start/stop/restart mysql
sudo systemctl status mysql

# PHP-FPM
sudo systemctl start/stop/restart php8.3-fpm
sudo systemctl status php8.3-fpm

# PM2
pm2 start/stop/restart/delete all
pm2 status
pm2 logs
```

### Important File Locations

```
Application:     /var/www/nxchat
Nginx config:    /etc/nginx/sites-available/
phpMyAdmin:      /usr/share/phpmyadmin
MySQL data:      /var/lib/mysql
Nginx logs:      /var/log/nginx/
PM2 logs:        ~/.pm2/logs/
```

### URLs

- **Frontend**: https://konnectbot.com
- **API**: https://api.konnectbot.com
- **phpMyAdmin**: https://phpmyadmin.konnectbot.com

---

## Next Steps

1. ✅ Configure backup strategy for MySQL database
2. ✅ Set up monitoring (e.g., PM2 monitoring, server monitoring)
3. ✅ Configure email notifications for errors
4. ✅ Set up automated backups
5. ✅ Review and update security settings regularly

---

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review service logs
3. Verify DNS settings
4. Check firewall rules
5. Ensure all services are running

---

**Last Updated**: $(date)
**Tested on**: Ubuntu 22.04 LTS & Ubuntu 24.04 LTS

