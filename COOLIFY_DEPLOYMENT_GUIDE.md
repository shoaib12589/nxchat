# NxChat - Coolify Deployment Guide

Complete guide to deploy NxChat on Coolify platform with MySQL database.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Coolify Setup](#coolify-setup)
3. [MySQL Database Setup](#mysql-database-setup)
4. [Application Deployment](#application-deployment)
5. [Environment Variables Configuration](#environment-variables-configuration)
6. [Frontend Deployment](#frontend-deployment)
7. [Backend Deployment](#backend-deployment)
8. [Post-Deployment Configuration](#post-deployment-configuration)
9. [Troubleshooting](#troubleshooting)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Accounts & Services
- **Coolify Account** - Self-hosted Coolify instance or Coolify Cloud
- **Domain Name** - For production deployment (optional for testing)
- **OpenAI API Key** - For AI chatbot features
- **Stripe API Keys** - For payment processing (optional)
- **Email SMTP Credentials** - For email notifications (Gmail, SendGrid, etc.)
- **Cloudflare R2 or Wasabi** - For file storage (optional)

### Coolify Requirements
- Coolify instance running (v3.x or higher)
- Access to Coolify dashboard
- Docker support enabled
- At least 2GB RAM available for MySQL database
- At least 1GB RAM available for each application (Backend + Frontend)

---

## Coolify Setup

### Step 1: Access Coolify Dashboard

1. Navigate to your Coolify instance URL
2. Login with your credentials
3. Create a new project or select an existing one

### Step 2: Connect Your Repository

1. In Coolify, go to **Resources** → **Applications**
2. Click **New Resource**
3. Select **GitHub** or **GitLab** (or your Git provider)
4. Connect your repository containing NxChat
5. Select the repository branch (usually `main` or `master`)

---

## MySQL Database Setup

### Step 1: Create MySQL Database Service

1. In Coolify dashboard, go to **Resources** → **Databases**
2. Click **New Database**
3. Select **MySQL/MariaDB**
4. Configure the database:
   - **Database Name:** `nxchat` (or your preferred name)
   - **MySQL Version:** `8.0` (recommended) or `5.7`
   - **Root Password:** Set a strong password (save this!)
   - **Database Name:** `nxchat`
   - **Database User:** `nxchat_user` (or auto-generated)
   - **Database Password:** Set a strong password (save this!)

### Step 2: Note Database Connection Details

After creating the database, Coolify will provide:
- **Internal Host:** Usually `mysql` or `mysql.nxchat` (service name)
- **Port:** `3306`
- **Database Name:** `nxchat`
- **Username:** `nxchat_user` (or as configured)
- **Password:** (the password you set)

**Important:** For applications in the same Coolify network, use the service name as the host (e.g., `mysql`). For external connections, use the provided public host.

### Step 3: Database Initialization

The database tables will be created automatically when the backend application starts for the first time. The Sequelize ORM will handle all migrations.

---

## Application Deployment

### Backend Deployment

#### Step 1: Create Backend Application

1. In Coolify, go to **Resources** → **Applications**
2. Click **New Resource**
3. Select your Git repository
4. Configure the application:
   - **Name:** `nxchat-backend`
   - **Build Pack:** `Nixpacks` (default, auto-detects Node.js)
   - **Port:** `3001`
   - **Branch:** `main` (or your production branch)
   - **Root Directory:** `backend/` (important!)

#### Step 2: Configure Build Settings for Nixpacks

Nixpacks will automatically detect your Node.js application, but you can configure:

**Build Settings:**
- **Root Directory:** `backend/`
- **Build Command:** (auto-detected, but you can set: `npm install`)
- **Start Command:** (auto-detected from package.json: `node server.js`)
- **Node Version:** `18.x` or `20.x` (set in application settings if needed)

**Nixpacks Auto-Detection:**
- ✅ Detects Node.js from `package.json`
- ✅ Runs `npm install` automatically
- ✅ Uses `npm start` from package.json (which runs `node server.js`)

**⚠️ Important:** Set **Root Directory** to `backend/` in Coolify application settings. This tells Nixpacks where your application code is located.

**Optional:** Create `backend/nixpacks.toml` for custom configuration (see below)

#### Step 3: Configure Environment Variables

Go to **Environment Variables** section and add the following variables (see [Environment Variables Configuration](#environment-variables-configuration) section for details):

**Database Configuration:**
```env
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USER=nxchat_user
MYSQL_PASSWORD=your_database_password
MYSQL_DB=nxchat
```

**Application Configuration:**
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com
```

**Other required variables:**
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY` (if using Stripe)
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`
- And others as needed

#### Step 4: Configure Networking

1. In **Networking** section:
   - Ensure the backend can access the MySQL service
   - If MySQL is in the same project, it's automatically accessible via service name
   - Set up port `3001` for internal/external access

2. **Domain Configuration:**
   - Add your API domain (e.g., `api.yourdomain.com`)
   - Coolify will automatically provision SSL certificates

#### Step 5: Deploy Backend

1. Click **Deploy** or **Save & Deploy**
2. Monitor the build logs
3. Wait for deployment to complete
4. Check logs for any errors

### Frontend Deployment

#### Step 1: Create Frontend Application

1. In Coolify, go to **Resources** → **Applications**
2. Click **New Resource**
3. Select your Git repository (same repo)
4. Configure the application:
   - **Name:** `nxchat-frontend`
   - **Build Pack:** `Nixpacks` (default, auto-detects Next.js)
   - **Port:** `3000`
   - **Branch:** `main`
   - **Root Directory:** `frontend/` (important!)

#### Step 2: Configure Build Settings for Nixpacks

Nixpacks will automatically detect your Next.js application:

**Build Settings:**
- **Root Directory:** `frontend/`
- **Build Command:** (auto-detected: `npm run build`)
- **Start Command:** (auto-detected from package.json: `npm start`)
- **Node Version:** `18.x` or `20.x` (set in application settings if needed)

**Nixpacks Auto-Detection:**
- ✅ Detects Next.js from `package.json`
- ✅ Runs `npm install` automatically
- ✅ Runs `npm run build` automatically
- ✅ Uses `npm start` from package.json

**⚠️ Important:** Set **Root Directory** to `frontend/` in Coolify application settings. This tells Nixpacks where your application code is located.

**Note:** Next.js builds may take 5-10 minutes. Monitor the build logs.

#### Step 3: Configure Environment Variables

Add these environment variables:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_FRONTEND_URL=https://yourdomain.com
```

**Note:** Next.js requires `NEXT_PUBLIC_` prefix for client-side environment variables.

#### Step 4: Configure Domain

1. In **Domain** section, add your frontend domain (e.g., `yourdomain.com`)
2. Coolify will automatically set up SSL

#### Step 5: Deploy Frontend

1. Click **Deploy**
2. Monitor build process
3. Frontend build may take 5-10 minutes

---

## Environment Variables Configuration

### Complete Environment Variables List

Add these to your **Backend** application in Coolify:

#### Database Configuration
```env
# MySQL Database (from Coolify MySQL service)
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USER=nxchat_user
MYSQL_PASSWORD=your_database_password_here
MYSQL_DB=nxchat
```

#### Application Configuration
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com
```

#### JWT Configuration
```env
JWT_SECRET=generate-a-strong-random-string-minimum-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

#### OpenAI Configuration
```env
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
```

#### Stripe Configuration (Optional)
```env
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

#### Email Configuration
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=NxChat <noreply@yourdomain.com>
```

#### Cloudflare R2 Configuration (Optional)
```env
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=nxchat
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_REGION=auto
```

#### Wasabi Configuration (Alternative Storage)
```env
WASABI_ACCESS_KEY_ID=your-wasabi-access-key
WASABI_SECRET_ACCESS_KEY=your-wasabi-secret-key
WASABI_BUCKET_NAME=nxchat-storage
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_REGION=us-east-1
```

#### Super Admin Configuration
```env
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=your-secure-admin-password
```

#### Security Configuration
```env
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
DISABLE_RATE_LIMITING=false
```

#### WebRTC Configuration
```env
STUN_SERVER_URL=stun:stun.l.google.com:19302
TURN_SERVER_URL=
TURN_USERNAME=
TURN_CREDENTIAL=
```

#### File Upload Configuration
```env
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

#### AI Configuration
```env
AI_MAX_CONTEXT_LENGTH=4000
AI_TEMPERATURE=0.7
AI_CONFIDENCE_THRESHOLD=0.8
```

#### Widget Configuration
```env
WIDGET_DOMAIN=yourdomain.com
WIDGET_CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

### Frontend Environment Variables

Add these to your **Frontend** application:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_FRONTEND_URL=https://yourdomain.com
```

### Important Notes

1. **MySQL Host:** Use the service name provided by Coolify (usually `mysql` or `mysql.nxchat`)
2. **Secrets:** Never commit sensitive values. Always use Coolify's environment variables.
3. **Database Connection:** Coolify services in the same project can communicate via service names.
4. **SSL:** Coolify automatically provisions SSL certificates via Let's Encrypt.

---

## Post-Deployment Configuration

### Step 1: Verify Backend Deployment

1. Check backend logs in Coolify dashboard
2. Verify database connection:
   - Look for: `✅ Database connection established successfully.`
3. Test API endpoint:
   - Visit `https://api.yourdomain.com/health`
   - Should return status: `200 OK`

### Step 2: Verify Frontend Deployment

1. Check frontend logs
2. Visit your frontend domain
3. Verify it loads correctly

### Step 3: Initialize Application

1. Visit the frontend URL
2. Login with super admin credentials:
   - Email: (from `SUPER_ADMIN_EMAIL`)
   - Password: (from `SUPER_ADMIN_PASSWORD`)
3. Verify you can access the admin dashboard

### Step 4: Configure Domains

1. **Backend API Domain:**
   - In Coolify, go to backend application
   - Add domain: `api.yourdomain.com`
   - Coolify will provision SSL automatically

2. **Frontend Domain:**
   - In Coolify, go to frontend application
   - Add domain: `yourdomain.com`
   - Coolify will provision SSL automatically

3. **Update DNS:**
   - Point your domain's A record to Coolify's IP
   - Or use CNAME if Coolify provides one

### Step 5: Test Features

1. **Login Test:**
   - Login as super admin
   - Create a test company
   - Create test agents

2. **Chat Test:**
   - Open chat widget
   - Test real-time messaging
   - Test file uploads

3. **AI Test:**
   - Send messages to test AI chatbot
   - Verify OpenAI integration

4. **WebRTC Test:**
   - Test video/audio calls
   - Verify STUN/TURN configuration

---

## Nixpacks Configuration

### What is Nixpacks?

Nixpacks is Coolify's default build system that automatically detects your application type (Node.js, Next.js, Python, etc.) and builds it accordingly. It's based on Nix package manager and provides reproducible builds.

### Automatic Detection

Nixpacks will automatically:
- ✅ Detect Node.js from `package.json`
- ✅ Detect Next.js from `package.json` and dependencies
- ✅ Install Node.js (version from `.nvmrc` or `package.json` engines)
- ✅ Run `npm install` or `yarn install`
- ✅ Run build commands from `package.json`
- ✅ Use start commands from `package.json`

### Optional: Custom Nixpacks Configuration

If you need custom build steps, you can create `nixpacks.toml` files in your project:

#### Backend Nixpacks Configuration

Create `backend/nixpacks.toml` (optional):

```toml
[phases.setup]
nixPkgs = ["nodejs_18"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["echo 'No build step needed for backend'"]

[start]
cmd = "node server.js"
```

#### Frontend Nixpacks Configuration

Create `frontend/nixpacks.toml` (optional):

```toml
[phases.setup]
nixPkgs = ["nodejs_18"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

### Node.js Version

You can specify Node.js version in several ways:

1. **Create `.nvmrc` file:**
   ```
   18
   ```
   or
   ```
   20
   ```

2. **In `package.json` engines field:**
   ```json
   {
     "engines": {
       "node": ">=18.0.0"
     }
   }
   ```

3. **In Coolify Application Settings:**
   - Go to your application in Coolify
   - Navigate to **Settings** → **Build**
   - Set **Node Version** to `18` or `20`

### Build Environment Variables

Nixpacks will use environment variables set in Coolify during the build phase. Make sure to set:
- `NODE_ENV=production` (for optimized builds)
- Any build-time variables needed

### Troubleshooting Nixpacks Builds

**Problem: Build fails with "Cannot find module"**
- Solution: Ensure `package.json` has all dependencies listed
- Check that `npm install` completes successfully in logs

**Problem: Wrong Node.js version**
- Solution: Create `.nvmrc` file or set Node version in Coolify settings
- Verify version in build logs

**Problem: Build times out**
- Solution: Next.js builds can take 5-10 minutes, be patient
- Consider increasing build timeout in Coolify settings
- Check for memory issues in build logs

**Problem: Nixpacks doesn't detect Next.js**
- Solution: Ensure `next` is in `package.json` dependencies
- Check that `package.json` has `build` and `start` scripts

---

## Troubleshooting

### Database Connection Issues

#### Problem: Backend can't connect to MySQL

**Solutions:**
1. Verify MySQL service is running in Coolify
2. Check `MYSQL_HOST` environment variable:
   - Should be service name (e.g., `mysql`) not `localhost`
   - For same project services, use service name
3. Verify database credentials:
   - Check `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DB`
4. Check network connectivity:
   - Ensure backend and MySQL are in the same Coolify project
5. Check MySQL logs in Coolify dashboard

#### Problem: Database tables not created

**Solutions:**
1. Check backend logs for Sequelize errors
2. Verify database user has CREATE privileges
3. Manually create database if needed:
   ```sql
   CREATE DATABASE nxchat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
4. Restart backend application

### Application Build Issues

#### Problem: Backend build fails

**Solutions:**
1. Check build logs in Coolify
2. Verify Node.js version (should be 18+)
3. Check for missing dependencies in `package.json`
4. Verify build command is correct

#### Problem: Frontend build fails

**Solutions:**
1. Check Next.js build logs
2. Verify all environment variables are set
3. Check for TypeScript errors
4. Increase build timeout if needed

### Port and Network Issues

#### Problem: Services can't communicate

**Solutions:**
1. Ensure all services are in the same Coolify project
2. Use service names for internal communication
3. Check firewall settings in Coolify
4. Verify port configurations

### SSL Certificate Issues

#### Problem: SSL certificate not provisioning

**Solutions:**
1. Verify domain DNS is pointing to Coolify
2. Wait 5-10 minutes for Let's Encrypt provisioning
3. Check domain configuration in Coolify
4. Manually trigger SSL renewal if needed

### Performance Issues

#### Problem: Slow application response

**Solutions:**
1. Check resource allocation:
   - Increase RAM for applications
   - Increase CPU limits
2. Enable Redis caching (if available)
3. Optimize database queries
4. Check application logs for errors

---

## Monitoring & Maintenance

### Application Logs

1. **Backend Logs:**
   - Access via Coolify dashboard → Backend Application → Logs
   - Monitor for errors and warnings
   - Check database connection status

2. **Frontend Logs:**
   - Access via Coolify dashboard → Frontend Application → Logs
   - Monitor build and runtime errors

3. **MySQL Logs:**
   - Access via Coolify dashboard → MySQL Database → Logs
   - Monitor for connection issues and slow queries

### Database Maintenance

1. **Backup Database:**
   - Use Coolify's built-in backup feature
   - Or export via MySQL client:
     ```bash
     mysqldump -h mysql -u nxchat_user -p nxchat > backup.sql
     ```

2. **Monitor Database Size:**
   - Check database usage in Coolify dashboard
   - Set up alerts for storage limits

3. **Optimize Database:**
   - Run periodic optimizations
   - Monitor slow queries

### Application Updates

1. **Update Backend:**
   - Push changes to Git repository
   - Coolify will automatically detect and redeploy
   - Or manually trigger deployment in dashboard

2. **Update Frontend:**
   - Push changes to Git repository
   - Coolify will rebuild and redeploy
   - Frontend builds may take 5-10 minutes

3. **Update Environment Variables:**
   - Update variables in Coolify dashboard
   - Restart application to apply changes

### Health Checks

1. **Backend Health:**
   - Monitor: `https://api.yourdomain.com/health`
   - Should return: `{ status: 'ok' }`

2. **Frontend Health:**
   - Monitor frontend URL availability
   - Check for runtime errors in browser console

3. **Database Health:**
   - Monitor MySQL service status
   - Check connection pool usage

### Scaling

1. **Horizontal Scaling:**
   - Coolify supports scaling applications
   - Increase instance count in application settings
   - Ensure database can handle increased connections

2. **Vertical Scaling:**
   - Increase RAM/CPU allocation
   - Monitor resource usage
   - Adjust based on traffic

### Backup Strategy

1. **Database Backups:**
   - Enable automatic backups in Coolify
   - Set backup frequency (daily recommended)
   - Test restore process periodically

2. **Application Backups:**
   - Git repository serves as code backup
   - Environment variables are stored in Coolify
   - Document all configuration changes

---

## Quick Reference

### Coolify Commands (via Dashboard)

- **Deploy:** Applications → Select App → Deploy
- **View Logs:** Applications → Select App → Logs
- **Restart:** Applications → Select App → Restart
- **Update Env Vars:** Applications → Select App → Environment Variables
- **View Metrics:** Applications → Select App → Metrics

### Important URLs

- **Frontend:** `https://yourdomain.com`
- **Backend API:** `https://api.yourdomain.com`
- **Health Check:** `https://api.yourdomain.com/health`
- **Widget:** `https://api.yourdomain.com/widget/{tenant_id}`

### Default Credentials

After first deployment, login with:
- **Email:** (from `SUPER_ADMIN_EMAIL` env var)
- **Password:** (from `SUPER_ADMIN_PASSWORD` env var)

**⚠️ Important:** Change default admin password after first login!

---

## Security Checklist

- [ ] Strong JWT secret (32+ characters)
- [ ] Strong database passwords
- [ ] Strong super admin password
- [ ] SSL/HTTPS enabled (automatic in Coolify)
- [ ] Environment variables secured (not in Git)
- [ ] Rate limiting enabled (`DISABLE_RATE_LIMITING=false`)
- [ ] CORS properly configured
- [ ] Database access restricted to application
- [ ] Regular security updates
- [ ] Backup strategy implemented

---

## Support & Resources

### Coolify Resources
- [Coolify Documentation](https://coolify.io/docs)
- [Coolify GitHub](https://github.com/coollabsio/coolify)

### NxChat Resources
- Check repository README.md
- Review application logs for errors
- Check database connection status

### Common Issues

**Q: How do I find the MySQL service name?**
A: In Coolify, go to your MySQL database resource. The service name is usually the resource name or displayed in the connection details.

**Q: Can I use an external MySQL database?**
A: Yes, update `MYSQL_HOST` to the external host and ensure firewall allows connections.

**Q: How do I update the application?**
A: Push changes to Git. Coolify will auto-detect and redeploy, or manually trigger deployment in dashboard.

**Q: How do I access MySQL directly?**
A: Use Coolify's database management tools or connect via MySQL client using the provided connection details.

**Q: How does Nixpacks work?**
A: Nixpacks automatically detects your application type from `package.json` and builds it. For Node.js/Next.js apps, it runs `npm install`, `npm run build` (if exists), and `npm start`. No configuration needed unless you want custom build steps.

**Q: Do I need to create nixpacks.toml files?**
A: No, it's optional. Nixpacks will auto-detect your application. The `nixpacks.toml` files are provided for custom configurations if needed.

**Q: How do I specify Node.js version?**
A: You can use `.nvmrc` file (already created), set it in `package.json` engines field, or configure it in Coolify application settings.

**Q: Why is my build taking so long?**
A: Next.js builds typically take 5-10 minutes. This is normal. Backend builds are faster (1-2 minutes). Monitor the build logs for progress.

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**For Support:** Create an issue in the repository or check Coolify documentation

---

**Happy Deploying! 🚀**

