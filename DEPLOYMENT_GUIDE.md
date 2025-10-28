# NXChat Deployment Guide

Complete guide to deploy NXChat on Linux and Windows hosting platforms.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Linux Deployment](#linux-deployment)
4. [Windows Deployment](#windows-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Production Build](#production-build)
8. [Process Management](#process-management)
9. [SSL/HTTPS Setup](#sslhttps-setup)
10. [Domain Configuration](#domain-configuration)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** (v18.0.0 or higher)
- **MySQL** (5.7 or higher)
- **npm** or **yarn**
- **Git**

### Required Accounts & Keys
- OpenAI API Key (for AI features)
- Stripe API Keys (for payments)
- Email SMTP Credentials (Gmail, SendGrid, etc.)
- Domain name (optional but recommended)

---

## Server Requirements

### Minimum Requirements
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Storage:** 20 GB SSD
- **Bandwidth:** 1 TB/month

### Recommended for Production
- **CPU:** 4+ cores
- **RAM:** 8 GB or higher
- **Storage:** 50 GB SSD
- **Bandwidth:** 5 TB/month

---

## Linux Deployment

### Option 1: Ubuntu/Debian Server (Recommended)

#### Step 1: Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### Step 2: Install Node.js
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

#### Step 3: Install MySQL
```bash
sudo apt install mysql-server -y

# Secure MySQL installation
sudo mysql_secure_installation

# Create database
sudo mysql -u root -p
```

```sql
CREATE DATABASE nxchat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nxchat_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON nxchat.* TO 'nxchat_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Step 4: Install Nginx
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### Step 5: Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

#### Step 6: Clone and Setup Project
```bash
# Navigate to web directory
cd /var/www

# Clone repository
sudo git clone <your-repository-url> nxchat
cd nxchat

# Install all dependencies
sudo npm install
sudo npm run install:all

# Make logs directory writable
sudo mkdir -p backend/logs
sudo chmod 755 backend/logs
```

#### Step 7: Configure Environment
```bash
# Create production .env file
sudo nano .env
```

Paste the following configuration (see [Environment Configuration](#environment-configuration) section):
```env
# Production Configuration
NODE_ENV=production

# Server Configuration
PORT=3001
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com

# Database Configuration
MYSQL_HOST=localhost
MYSQL_USER=nxchat_user
MYSQL_PASSWORD=your_secure_password
MYSQL_DB=nxchat

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Stripe
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
```

#### Step 8: Build Production Frontend
```bash
cd frontend
sudo npm run build
cd ..
```

#### Step 9: Configure Nginx

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/nxchat
```

Paste this configuration:
```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

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

# Frontend
server {
    listen 80;
    server_name yourdomain.com;

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
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/nxchat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 10: Start Application with PM2
```bash
# Navigate to project root
cd /var/www/nxchat

# Start backend
cd backend
pm2 start server.js --name nxchat-backend

# Start frontend (in a new terminal)
cd ../frontend
pm2 start npm --name nxchat-frontend -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

#### Step 11: Install SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

### Option 2: Using Docker (Alternative)

#### Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y
```

#### Create docker-compose.yml
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: nxchat
      MYSQL_USER: nxchat_user
      MYSQL_PASSWORD: nxchat_password
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      MYSQL_HOST: mysql
      MYSQL_USER: nxchat_user
      MYSQL_PASSWORD: nxchat_password
      MYSQL_DB: nxchat
    depends_on:
      - mysql

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: http://localhost:3001
    depends_on:
      - backend

volumes:
  mysql_data:
```

Build and run:
```bash
docker-compose up -d
```

---

## Windows Deployment

### Option 1: Windows Server with IIS

#### Step 1: Install Node.js
1. Download Node.js v18.x from [nodejs.org](https://nodejs.org/)
2. Run installer and follow wizard
3. Verify installation: `node --version`

#### Step 2: Install MySQL
1. Download MySQL from [mysql.com](https://dev.mysql.com/downloads/installer/)
2. Run installer with Server installation
3. Note the root password during installation
4. Create database and user (use MySQL Workbench or command line)

#### Step 3: Install PM2 for Windows
```powershell
npm install -g pm2-windows-startup pm2
```

#### Step 4: Setup Project
```powershell
# Navigate to your web directory (e.g., C:\inetpub\wwwroot)
cd C:\inetpub\wwwroot

# Clone repository
git clone <your-repository-url> nxchat
cd nxchat

# Install dependencies
npm install
npm run install:all

# Create .env file with production settings
notepad .env
```

#### Step 5: Build Frontend
```powershell
cd frontend
npm run build
cd ..
```

#### Step 6: Configure IIS with URL Rewrite

1. Install IIS with URL Rewrite module
2. Create two application pools:
   - **nxchat-backend** (No Managed Code)
   - **nxchat-frontend** (No Managed Code)

3. Create two websites:
   - **Backend** pointing to `http://localhost:3001`
   - **Frontend** pointing to `http://localhost:3000`

4. Or use Node.js iisnode module (advanced)

#### Step 7: Start with PM2
```powershell
# Start backend
cd backend
pm2 start server.js --name nxchat-backend

# Start frontend
cd ../frontend
pm2 start npm --name nxchat-frontend -- start

# Save configuration
pm2 save

# Setup startup
pm2-startup install
```

### Option 2: Windows Using Always Up (Commercial)

1. Download Always Up from [alwaysup.com](http://www.coretechnologies.com/products/AlwaysUp/)
2. Install the application
3. Add backend service:
   - Executable: `C:\Program Files\nodejs\node.exe`
   - Arguments: `server.js`
   - Working Directory: `C:\nxchat\backend`
4. Add frontend service:
   - Executable: `C:\Program Files\nodejs\node.exe`
   - Arguments: `node_modules/next/dist/bin/next start`
   - Working Directory: `C:\nxchat\frontend`

---

## Environment Configuration

### Complete .env Example

```env
# ============================================
# NXChat Production Configuration
# ============================================

# Environment
NODE_ENV=production

# Server Ports
PORT=3001
FRONTEND_PORT=3000

# URLs (update with your domain)
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com

# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=nxchat_user
MYSQL_PASSWORD=your_secure_password_here
MYSQL_DB=nxchat

# JWT Configuration
JWT_SECRET=generate-a-strong-random-string-minimum-32-characters
JWT_EXPIRES_IN=7d

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
OPENAI_MODEL=gpt-4

# Stripe Configuration (Use Live Keys)
STRIPE_SECRET_KEY=sk_live_your-live-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-live-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email Configuration (Gmail Example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=noreply@yourdomain.com

# Redis Configuration (Optional but Recommended)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# File Storage (Choose one)
# Cloudflare R2
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=nxchat-files
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com

# OR Wasabi
WASABI_ACCESS_KEY_ID=your-wasabi-access-key
WASABI_SECRET_ACCESS_KEY=your-wasabi-secret-key
WASABI_BUCKET_NAME=nxchat-files
WASABI_ENDPOINT=https://s3.wasabisys.com

# Super Admin
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=your-secure-admin-password

# Security
BCRYPT_ROUNDS=10
SESSION_SECRET=another-strong-random-string

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

---

## Database Setup

### Create Database Schema

The application will auto-create tables on first run, but you can also manually run:

```sql
USE nxchat;

-- The Sequelize models will create these tables automatically
-- But you can verify with:
SHOW TABLES;

-- Expected tables:
-- users, companies, plans, departments, chats, messages, 
-- tickets, notifications, agentsettings, etc.
```

### Run Migrations

```bash
cd backend
node migrations/add-visits-count-to-visitors.js
```

---

## Production Build

### Build Frontend
```bash
cd frontend
npm run build

# This creates an optimized production build in .next folder
```

### Test Production Build Locally
```bash
# Frontend
cd frontend
npm start

# Backend
cd backend
npm start
```

---

## Process Management

### Using PM2 (Recommended)

#### Basic Commands
```bash
# List processes
pm2 list

# Stop process
pm2 stop nxchat-backend
pm2 stop nxchat-frontend

# Restart process
pm2 restart nxchat-backend

# Delete process
pm2 delete nxchat-backend

# View logs
pm2 logs nxchat-backend

# Monitor
pm2 monit

# Save configuration
pm2 save

# Startup on boot (one-time setup)
pm2 startup
```

#### PM2 Ecosystem File (Alternative)

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'nxchat-backend',
      script: './backend/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'nxchat-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

Start with ecosystem:
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Free)

#### Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### Get Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

### Using Cloudflare (Recommended)

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Add your domain
3. Update DNS nameservers
4. Enable SSL/TLS (Full mode)
5. Automatic HTTPS redirect

---

## Domain Configuration

### DNS Records Example

```
Type    Name    Value               TTL
A       @       your.server.ip      3600
A       api     your.server.ip      3600
CNAME   www     yourdomain.com      3600
```

### Nginx Configuration Update

After SSL setup, Certbot auto-updates your Nginx config, but ensure:

```nginx
# Force HTTPS
server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3001;
        # ... rest of proxy configuration
    }
}
```

---

## Monitoring & Maintenance

### System Monitoring

#### Using PM2
```bash
pm2 monit
```

#### Using Node Exporter (Linux)
```bash
# Install
wget https://github.com/prometheus/node_exporter/releases/download/v1.x.x/node_exporter.tar.gz
tar xvfz node_exporter.tar.gz

# Run
./node_exporter &
```

### Log Management

```bash
# View backend logs
tail -f /var/www/nxchat/backend/logs/app.log

# View PM2 logs
pm2 logs nxchat-backend --lines 100

# Rotate logs
pm2 flush
```

### Database Maintenance

```sql
# Backup database
mysqldump -u nxchat_user -p nxchat > nxchat_backup.sql

# Restore database
mysql -u nxchat_user -p nxchat < nxchat_backup.sql

# Optimize tables
mysqlcheck -u nxchat_user -p --optimize nxchat
```

### Update Deployment

```bash
cd /var/www/nxchat

# Pull latest changes
git pull origin main

# Reinstall dependencies if needed
cd backend && npm install
cd ../frontend && npm install && npm run build

# Restart services
pm2 restart all
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
lsof -i :3001
netstat -tulpn | grep :3001

# Kill process
kill -9 <PID>
```

#### 2. Database Connection Failed
```bash
# Test MySQL connection
mysql -u nxchat_user -p -h localhost nxchat

# Check MySQL status
sudo systemctl status mysql

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

#### 3. Permission Issues
```bash
# Fix file permissions
sudo chown -R www-data:www-data /var/www/nxchat
sudo chmod -R 755 /var/www/nxchat

# Fix logs directory
sudo chmod 755 /var/www/nxchat/backend/logs
```

#### 4. Memory Issues
```bash
# Check memory usage
free -h

# Increase Node.js memory limit
pm2 delete all
pm2 start ecosystem.config.js --node-args="--max-old-space-size=4096"
```

#### 5. SSL Certificate Issues
```bash
# Test SSL configuration
sudo nginx -t

# Check certificate expiration
sudo certbot certificates

# Renew certificate
sudo certbot renew
```

### Performance Optimization

#### Enable Gzip Compression
Add to Nginx config:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

#### Enable Redis Caching
```bash
sudo apt install redis-server
```

Update `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Database Optimization
```sql
-- Add indexes
CREATE INDEX idx_chats_tenant ON chats(tenant_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_users_email ON users(email);

-- Analyze tables
ANALYZE TABLE chats, messages, users;
```

---

## Security Checklist

- [ ] Use strong JWT secrets (32+ characters)
- [ ] Use production database credentials
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall (UFW for Linux)
- [ ] Set up automatic backups
- [ ] Configure rate limiting
- [ ] Use environment variables (never commit .env)
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Set up fail2ban for SSH protection

### Firewall Setup (UFW)
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Support & Resources

### Useful Commands Summary

```bash
# Check application status
pm2 status

# View logs
pm2 logs nxchat-backend --lines 50

# Restart services
pm2 restart all

# Database backup
mysqldump -u nxchat_user -p nxchat > backup_$(date +%Y%m%d).sql

# Check disk space
df -h

# Check memory
free -h

# Monitor CPU
htop

# Check network
netstat -tulpn
```

---

## Post-Deployment Steps

1. **Test All Features**
   - Login as different user roles
   - Test real-time chat
   - Test file uploads
   - Test AI chatbot
   - Test payments (if enabled)

2. **Monitor Performance**
   - Check PM2 logs
   - Monitor server resources
   - Check database performance

3. **Set Up Backups**
   - Configure automated database backups
   - Test restore process

4. **Document Access**
   - Save all credentials securely
   - Document server access methods
   - Keep configuration files backed up

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**For Support:** Create an issue in the repository or contact support@nxchat.com

