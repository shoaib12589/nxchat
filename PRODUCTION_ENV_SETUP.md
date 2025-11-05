# Production Environment Setup Guide

## ⚠️ Important: Next.js Environment Variables

Next.js bakes `NEXT_PUBLIC_*` environment variables into the build at **build time**, not runtime. This means you must:

1. **Update `.env` file with production URLs**
2. **Rebuild the frontend** after updating environment variables

## Quick Fix Steps

### Step 1: Update Root `.env` File

Edit the root `.env` file on your server:

```bash
nano /var/www/nxchat/.env
```

Update these critical sections:

```env
# ============================================
# DOMAIN CONFIGURATION
# ============================================
DOMAIN=konnectbot.com
USE_HTTPS=true

# ============================================
# FRONTEND ENVIRONMENT VARIABLES
# ============================================
# These MUST be updated for production - Next.js bakes these into the build!
NEXT_PUBLIC_API_URL=https://api.konnectbot.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.konnectbot.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51NXWwoARNYeIn6yO6kNmYK3JOhCmHPcsmCNDC4u6C1x7olE5e3q18KPoE3xpIRApldW6pg21AD6Lu3v8XkJUXnW6003yIz9LH2

# URL Configuration
FRONTEND_URL=https://konnectbot.com
BACKEND_URL=https://api.konnectbot.com
SOCKET_URL=https://api.konnectbot.com
API_URL=https://api.konnectbot.com/api

# Database Configuration (update with your production database)
MYSQL_HOST=localhost
MYSQL_USER=nxchat_user
MYSQL_PASSWORD=your_secure_password
MYSQL_DB=nxchat
MYSQL_PORT=3306

# Server Configuration
PORT=3001
NODE_ENV=production
```

**Important**: Replace `konnectbot.com` with your actual domain name!

### Step 2: Rebuild Frontend

After updating the `.env` file, you MUST rebuild the frontend:

```bash
cd /var/www/nxchat/frontend
npm run build
```

### Step 3: Restart PM2

After rebuilding, restart your PM2 processes:

```bash
pm2 restart nxchat-frontend
pm2 restart nxchat-backend
```

## Why This Happens

Next.js replaces `process.env.NEXT_PUBLIC_*` variables at **build time** and embeds them directly into the JavaScript bundle. This means:

- ❌ **Changing `.env` after build won't work** - you must rebuild
- ✅ **The values are embedded in the compiled code**
- ✅ **This is by design for performance and security**

## Alternative: Runtime Environment Variables (Advanced)

If you need to change URLs without rebuilding, you would need to:

1. Use a different approach (not `NEXT_PUBLIC_*` variables)
2. Fetch configuration from an API endpoint
3. Use a configuration service

However, for most use cases, rebuilding with the correct URLs is the standard approach.

## Verification

After rebuilding, check the browser console. You should see:
- ✅ API calls going to `https://api.konnectbot.com/api` (not localhost)
- ✅ Socket connections to `https://api.konnectbot.com` (not localhost)
- ✅ No more `ERR_CONNECTION_REFUSED` errors

## Troubleshooting

### Still seeing localhost URLs?

1. **Clear browser cache** - Old JavaScript might be cached
2. **Verify build output** - Check that new build was created
3. **Check PM2 logs** - Ensure frontend restarted properly
4. **Verify .env file** - Ensure production URLs are correct

### Check Current Environment Variables

```bash
# On server, check what Next.js will use
cd /var/www/nxchat/frontend
node -e "require('dotenv').config({ path: '../.env' }); console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);"
```

---

**Remember**: Always rebuild the frontend after changing `NEXT_PUBLIC_*` environment variables!

