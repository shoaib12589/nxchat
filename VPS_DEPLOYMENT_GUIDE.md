# NXChat VPS Deployment Guide - Ubuntu with phpMyAdmin

Complete guide to deploy NXChat on Ubuntu VPS with MySQL and phpMyAdmin, including centralized URL configuration.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Centralized URL Configuration](#centralized-url-configuration)
4. [MySQL Installation & Configuration](#mysql-installation--configuration)
5. [phpMyAdmin Installation & Setup](#phpmyadmin-installation--setup)
6. [Node.js & Application Setup](#nodejs--application-setup)
7. [Nginx Configuration](#nginx-configuration)
8. [SSL/HTTPS Setup](#sslhttps-setup)
9. [Domain Configuration](#domain-configuration)
10. [Production Deployment](#production-deployment)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Ubuntu 20.04+** or **Ubuntu 22.04+** (recommended)
- **Root or sudo access** to the server
- **Domain name** pointing to your server IP
- **SSH access** to your server

### Required Accounts & Keys
- Domain name registered and DNS configured
- OpenAI API Key (for AI features)
- Stripe API Keys (for payments)
- Email SMTP Credentials (Gmail, SendGrid, etc.)

---

## Server Setup

### Step 1: Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Essential Tools

```bash
sudo apt install -y curl wget git build-essential software-properties-common
```

---

## Centralized URL Configuration

NXChat uses a **centralized URL configuration system** that allows you to change from localhost to your domain in one place.

### How It Works

The application uses a centralized config file (`config/urls.js`) that reads from environment variables. To switch from localhost to your domain, you only need to update the `DOMAIN` variable in your `.env` file.

### Configuration File

The configuration file is located at: `config/urls.js`

This file automatically generates all URLs based on the `DOMAIN` environment variable:

- **Frontend URL**: `https://yourdomain.com` (or `http://localhost:3000` for development)
- **Backend/API URL**: `https://api.yourdomain.com` (or `http://localhost:3001` for development)
- **Socket URL**: Same as backend URL
- **phpMyAdmin URL**: `https://phpmyadmin.yourdomain.com` (or `http://localhost:8080` for development)

### Environment Variables

Update your `.env` file (in both root and `backend/` directory):

```env
# ============================================
# DOMAIN CONFIGURATION - Change this to switch from localhost to your domain
# ============================================
DOMAIN=yourdomain.com

# Use HTTPS in production
USE_HTTPS=true

# Ports (usually don't need to change)
BACKEND_PORT=3001
FRONTEND_PORT=3000
PHPMYADMIN_PORT=8080
```

**For localhost development:**
```env
DOMAIN=localhost
USE_HTTPS=false
```

**For production:**
```env
DOMAIN=yourdomain.com
USE_HTTPS=true
```

### Frontend Environment Variables

For Next.js frontend, create `frontend/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

**For localhost:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

## MySQL Installation & Configuration

### Step 1: Install MySQL

```bash
sudo apt install mysql-server -y
```

### Step 2: Secure MySQL Installation

```bash
sudo mysql_secure_installation
```

Follow the prompts:
- Set root password (or press Enter to skip if using auth_socket)
- Remove anonymous users: **Yes**
- Disallow root login remotely: **Yes**
- Remove test database: **Yes**
- Reload privilege tables: **Yes**

### Step 3: Create Database and User

```bash
sudo mysql -u root -p
```

```sql
-- Create database
CREATE DATABASE nxchat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'nxchat_user'@'localhost' IDENTIFIED BY 'shoaib125890000ss';

-- Grant privileges
GRANT ALL PRIVILEGES ON nxchat.* TO 'nxchat_user'@'localhost';

-- Grant privileges for remote access (if needed)
CREATE USER 'nxchat_user'@'%' IDENTIFIED BY 'shoaib125890000ss';
GRANT ALL PRIVILEGES ON nxchat.* TO 'nxchat_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;
EXIT;
```

### Step 4: Verify MySQL Installation

```bash
mysql -u nxchat_user -p -e "SHOW DATABASES;"
```

---

## phpMyAdmin Installation & Setup

### Step 1: Install phpMyAdmin

```bash
sudo apt install phpmyadmin php-mbstring php-zip php-gd php-json php-curl -y
```

During installation, you'll be prompted:
- **Web server**: Select `apache2` (we'll configure Nginx manually)
- **Configure database**: Select **Yes**
- **phpMyAdmin password**: Enter a secure password

### Step 2: Configure phpMyAdmin for Nginx

Since we're using Nginx, we need to configure phpMyAdmin manually:

```bash
# Create symlink for phpMyAdmin
sudo ln -s /usr/share/phpmyadmin /var/www/phpmyadmin

# Set proper permissions
sudo chown -R www-data:www-data /var/www/phpmyadmin
sudo chmod -R 755 /var/www/phpmyadmin
```

### Step 3: Install PHP-FPM (if not already installed)

```bash
sudo apt install php-fpm -y
```

### Step 4: Configure phpMyAdmin Blowfish Secret

```bash
sudo nano /usr/share/phpmyadmin/config.inc.php
```

Find the line with `$cfg['blowfish_secret']` and set a random 32-character string:

```php
$cfg['blowfish_secret'] = 'a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4p'; /* YOU MUST FILL IN THIS FOR COOKIE AUTH! */
```

### Step 5: Configure PHP-FPM for phpMyAdmin

```bash
sudo nano /etc/php/8.1/fpm/php.ini
```

(Adjust the PHP version number as needed. Check with `php -v`)

Find and update these settings:

```ini
upload_max_filesize = 64M
post_max_size = 64M
max_execution_time = 300
memory_limit = 256M
```

Restart PHP-FPM:

```bash
sudo systemctl restart php8.3-fpm
```

### Step 6: Test phpMyAdmin

Before configuring Nginx, test if phpMyAdmin files are accessible:

```bash
ls -la /usr/share/phpmyadmin/
```

---

## Node.js & Application Setup

### Step 1: Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### Step 3: Clone and Setup Project

```bash
# Navigate to web directory
cd /var/www

# Clone repository (replace with your repository URL)
sudo git clone https://github.com/shoaib12589/nxchat.git nxchat
cd nxchat

# Install all dependencies
sudo npm install
sudo npm run install:all

# Make logs directory writable
sudo mkdir -p backend/logs
sudo chmod 755 backend/logs
```

### Step 4: Configure Environment Variables

Update the `.env` file in the root directory:

```bash
sudo nano .env
```

Update the domain configuration:

```env
# ============================================
# DOMAIN CONFIGURATION
# ============================================
DOMAIN=yourdomain.com
USE_HTTPS=true

# Database Configuration
MYSQL_HOST=localhost
MYSQL_USER=nxchat_user
MYSQL_PASSWORD=your_secure_password_here
MYSQL_DB=nxchat
MYSQL_PORT=3306

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Stripe (Use Live Keys for Production)
STRIPE_SECRET_KEY=sk_live_your-stripe-live-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-live-publishable-key

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Super Admin
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=your-secure-admin-password

# phpMyAdmin Configuration
PHPMYADMIN_PORT=8080
PHPMYADMIN_URL=https://phpmyadmin.yourdomain.com
```

Also update `backend/.env` with the same domain configuration:

```bash
sudo nano backend/.env
```

### Step 5: Configure Frontend Environment

Create `frontend/.env.local`:

```bash
sudo nano frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

### Step 6: Build Production Frontend

```bash
cd frontend
sudo npm run build
cd ..
```

### Step 7: Start Application with PM2

```bash
# Navigate to project root
cd /var/www/nxchat

# Start backend
cd backend
pm2 start server.js --name nxchat-backend

# Start frontend (in a new terminal or after backend)
cd ../frontend
pm2 start npm --name nxchat-frontend -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command output to complete the setup
```

---

## Nginx Configuration

### Step 1: Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Step 2: Create Nginx Configuration for NXChat

Create the main Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/nxchat
```

Paste the following configuration:

```nginx
# ============================================
# NXChat Nginx Configuration
# ============================================

# Backend API Server
server {
    listen 80;
    server_name api.konnectbot.com;

    # Logging
    access_log /var/log/nginx/api-access.log;
    error_log /var/log/nginx/api-error.log;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.io configuration
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend Server
server {
    listen 80;
    server_name konnectbot.com www.konnectbot.com;

    # Logging
    access_log /var/log/nginx/frontend-access.log;
    error_log /var/log/nginx/frontend-error.log;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# phpMyAdmin Server
server {
    listen 80;
    server_name phpmyadmin.konnectbot.com;

    root /usr/share/phpmyadmin;
    index index.php index.html index.htm;

    # Security: Restrict access (optional - remove if you want public access)
    # Uncomment the following lines to restrict access by IP
    # allow 1.2.3.4;  # Your IP address
    # deny all;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ /(config|tmp|libraries|setup/frames|setup/libs) {
        deny all;
        return 404;
    }
}
```

**Important**: Replace `yourdomain.com` with your actual domain name in all three server blocks.

### Step 3: Enable the Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/nxchat /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test is successful, restart Nginx
sudo systemctl restart nginx
```

### Step 4: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## SSL/HTTPS Setup

### Step 1: Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Step 2: Obtain SSL Certificates

```bash
sudo certbot --nginx -d konnectbot.com -d www.konnectbot.com -d api.konnectbot.com -d phpmyadmin.konnectbot.com
```

Follow the prompts:
- Enter your email address
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: **Yes**)

### Step 3: Auto-renewal Setup

Certbot automatically sets up a renewal cron job. Test it:

```bash
sudo certbot renew --dry-run
```

### Step 4: Update Environment Variables

After SSL is set up, update your `.env` files to use HTTPS:

```env
USE_HTTPS=true
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
PHPMYADMIN_URL=https://phpmyadmin.yourdomain.com
```

Restart your application:

```bash
pm2 restart all
```

---

## Domain Configuration

### DNS Records Setup

Configure the following DNS records with your domain provider:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | Your Server IP | 3600 |
| A | www | Your Server IP | 3600 |
| A | api | Your Server IP | 3600 |
| A | phpmyadmin | Your Server IP | 3600 |

### Verify DNS Propagation

```bash
# Check DNS records
dig yourdomain.com
dig api.yourdomain.com
dig phpmyadmin.yourdomain.com
```

---

## Production Deployment

### Step 1: Final Environment Configuration

Ensure all environment variables are set correctly:

```bash
# Check environment variables
cat .env | grep DOMAIN
cat .env | grep USE_HTTPS
```

### Step 2: Rebuild Frontend with Production URLs

```bash
cd frontend
rm -rf .next
npm run build
cd ..
```

### Step 3: Restart Services

```bash
# Restart PM2 processes
pm2 restart all

# Restart Nginx
sudo systemctl restart nginx

# Check status
pm2 status
sudo systemctl status nginx
```

### Step 4: Verify Deployment

1. **Frontend**: Visit `https://yourdomain.com`
2. **Backend API**: Visit `https://api.yourdomain.com/health`
3. **phpMyAdmin**: Visit `https://phpmyadmin.yourdomain.com`

---

## Switching Between Localhost and Domain

### To Switch from Localhost to Domain

1. **Update `.env` file** (root and `backend/`):
   ```env
   DOMAIN=yourdomain.com
   USE_HTTPS=true
   ```

2. **Update `frontend/.env.local`**:
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
   NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
   ```

3. **Rebuild frontend**:
   ```bash
   cd frontend
   npm run build
   ```

4. **Restart services**:
   ```bash
   pm2 restart all
   ```

### To Switch from Domain to Localhost

1. **Update `.env` file**:
   ```env
   DOMAIN=localhost
   USE_HTTPS=false
   ```

2. **Update `frontend/.env.local`**:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   ```

3. **Rebuild and restart**:
   ```bash
   cd frontend
   npm run build
   pm2 restart all
   ```

---

## Troubleshooting

### Common Issues

#### 1. phpMyAdmin Not Accessible

**Problem**: Can't access phpMyAdmin via domain.

**Solutions**:
- Check Nginx configuration: `sudo nginx -t`
- Verify PHP-FPM is running: `sudo systemctl status php8.3-fpm`
- Check file permissions: `sudo chown -R www-data:www-data /usr/share/phpmyadmin`
- Verify symlink exists: `ls -la /var/www/phpmyadmin`

#### 2. 502 Bad Gateway

**Problem**: Nginx returns 502 error.

**Solutions**:
- Check if backend/frontend is running: `pm2 status`
- Check application logs: `pm2 logs nxchat-backend`
- Verify ports are correct in `.env` file
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

#### 3. CORS Errors

**Problem**: Frontend can't connect to backend API.

**Solutions**:
- Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local` matches backend URL
- Check CORS configuration in `backend/middleware/security.js`
- Ensure domain is in allowed origins list
- Check browser console for specific error messages

#### 4. Database Connection Failed

**Problem**: Application can't connect to MySQL.

**Solutions**:
- Verify MySQL is running: `sudo systemctl status mysql`
- Check database credentials in `.env` file
- Test connection: `mysql -u nxchat_user -p nxchat`
- Check MySQL user privileges: `SHOW GRANTS FOR 'nxchat_user'@'localhost';`

#### 5. SSL Certificate Issues

**Problem**: SSL certificate not working or expired.

**Solutions**:
- Check certificate status: `sudo certbot certificates`
- Renew certificate: `sudo certbot renew`
- Verify Nginx SSL configuration: `sudo nginx -t`
- Check certificate expiration: `echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates`

#### 6. Socket.io Connection Issues

**Problem**: Real-time features not working.

**Solutions**:
- Verify `NEXT_PUBLIC_SOCKET_URL` is set correctly
- Check Nginx WebSocket configuration (upgrade headers)
- Check firewall allows WebSocket connections
- Verify Socket.io server is running: `pm2 logs nxchat-backend | grep socket`

### Log Locations

```bash
# Application logs
pm2 logs nxchat-backend
pm2 logs nxchat-frontend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PHP-FPM logs
sudo tail -f /var/log/php8.3-fpm.log

# MySQL logs
sudo tail -f /var/log/mysql/error.log
```

### Useful Commands

```bash
# Check all services status
pm2 status
sudo systemctl status nginx
sudo systemctl status mysql
sudo systemctl status php8.3-fpm

# Restart all services
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart mysql
sudo systemctl restart php8.3-fpm

# Check disk space
df -h

# Check memory usage
free -h

# Check network connections
netstat -tulpn | grep -E ':(3000|3001|80|443|3306|8080)'

# Test database connection
mysql -u nxchat_user -p -e "SELECT 1;"

# Test API endpoint
curl https://api.yourdomain.com/health

# View PM2 logs
pm2 logs --lines 100
```

---

## Security Best Practices

### 1. phpMyAdmin Security

**Option 1: Restrict by IP (Recommended)**

Add to phpMyAdmin Nginx configuration:

```nginx
location / {
    allow 1.2.3.4;  # Your IP address
    deny all;
    try_files $uri $uri/ =404;
}
```

**Option 2: Use Strong Authentication**

- Use strong MySQL passwords
- Enable two-factor authentication if available
- Regularly update phpMyAdmin

**Option 3: Use HTTPS Only**

Ensure SSL is properly configured and HTTP is redirected to HTTPS.

### 2. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Deny MySQL from external access (if not needed)
sudo ufw deny 3306
```

### 3. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
cd /var/www/nxchat
npm update
```

### 4. Backup Strategy

```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u nxchat_user -p nxchat > /backups/nxchat_$DATE.sql
```

---

## Monitoring & Maintenance

### 1. Monitor Application

```bash
# PM2 monitoring
pm2 monit

# Check logs
pm2 logs --lines 50
```

### 2. Monitor Server Resources

```bash
# CPU and memory
htop

# Disk usage
df -h
du -sh /var/www/nxchat
```

### 3. Database Maintenance

```bash
# Optimize database
mysqlcheck -u nxchat_user -p --optimize nxchat

# Backup database
mysqldump -u nxchat_user -p nxchat > backup_$(date +%Y%m%d).sql
```

---

## Quick Reference

### Environment Variables Summary

| Variable | Localhost | Production |
|----------|-----------|------------|
| `DOMAIN` | `localhost` | `yourdomain.com` |
| `USE_HTTPS` | `false` | `true` |
| `FRONTEND_URL` | `http://localhost:3000` | `https://yourdomain.com` |
| `BACKEND_URL` | `http://localhost:3001` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | `https://api.yourdomain.com/api` |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` | `https://api.yourdomain.com` |
| `PHPMYADMIN_URL` | `http://localhost:8080` | `https://phpmyadmin.yourdomain.com` |

### File Locations

- **Project**: `/var/www/nxchat`
- **Nginx config**: `/etc/nginx/sites-available/nxchat`
- **Environment file**: `/var/www/nxchat/.env`
- **Frontend env**: `/var/www/nxchat/frontend/.env.local`
- **phpMyAdmin**: `/usr/share/phpmyadmin`
- **Logs**: `/var/log/nginx/`

---

## Support

For issues or questions:
- Check application logs: `pm2 logs`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Review this guide's troubleshooting section
- Check project documentation

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**For Support**: Create an issue in the repository

