# Fix Production Network Errors - Quick Guide

## Problem

The frontend is trying to connect to `http://localhost:3001` on your live server, causing:
- `ERR_CONNECTION_REFUSED` errors
- Network errors when trying to fetch data
- Login page not working properly

## Root Cause

**Next.js bakes `NEXT_PUBLIC_*` environment variables into the build at BUILD TIME.**

This means:
- ❌ The frontend was built with `localhost` URLs
- ❌ Changing `.env` after build won't work
- ✅ You MUST rebuild the frontend after updating environment variables

## Solution - 3 Steps

### Step 1: Update `.env` File on Your Server

SSH into your server and edit the `.env` file:

```bash
cd /var/www/nxchat
nano .env
```

Update these critical values:

```env
# Domain
DOMAIN=konnectbot.com
USE_HTTPS=true

# URLs
FRONTEND_URL=https://konnectbot.com
BACKEND_URL=https://api.konnectbot.com
SOCKET_URL=https://api.konnectbot.com
API_URL=https://api.konnectbot.com/api

# Frontend Environment Variables (CRITICAL - these are baked into build)
NEXT_PUBLIC_API_URL=https://api.konnectbot.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.konnectbot.com

# Database (update with your production database credentials)
MYSQL_HOST=localhost
MYSQL_USER=nxchat_user
MYSQL_PASSWORD=your_secure_password
MYSQL_DB=nxchat

# Server
NODE_ENV=production
```

**Important**: Replace `konnectbot.com` with your actual domain name!

### Step 2: Rebuild Frontend (CRITICAL!)

After updating `.env`, you MUST rebuild the frontend:

```bash
cd /var/www/nxchat/frontend
npm run build
```

This step is **essential** because Next.js embeds `NEXT_PUBLIC_*` variables directly into the compiled JavaScript.

### Step 3: Restart Services

After rebuilding, restart your PM2 processes:

```bash
pm2 restart nxchat-frontend
pm2 restart nxchat-backend
```

Or restart all:

```bash
pm2 restart all
```

## Verification

After completing these steps:

1. **Check browser console** - Should see API calls to `https://api.konnectbot.com/api` (not localhost)
2. **Test login** - Should work without network errors
3. **Check network tab** - All requests should go to your production domain

## Quick Command Summary

```bash
# 1. Update .env file
nano /var/www/nxchat/.env

# 2. Rebuild frontend (CRITICAL!)
cd /var/www/nxchat/frontend
npm run build

# 3. Restart services
pm2 restart all
```

## Why This Happens

Next.js replaces `process.env.NEXT_PUBLIC_*` variables at **build time** for:
- Performance (no runtime lookups)
- Security (values are embedded, not exposed)
- Static optimization

This is by design, but means you must rebuild when changing these values.

## Alternative: Check Build Output

You can verify what URLs are embedded in your build:

```bash
cd /var/www/nxchat/frontend/.next
grep -r "localhost:3001" .  # Should find nothing if properly built
grep -r "api.konnectbot.com" .  # Should find your production URLs
```

## Still Having Issues?

1. **Clear browser cache** - Old JavaScript might be cached
2. **Hard refresh** - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Check PM2 logs** - `pm2 logs nxchat-frontend`
4. **Verify .env file** - Ensure production URLs are correct
5. **Verify build completed** - Check that `.next` folder was updated

---

**Remember**: Always rebuild the frontend after changing `NEXT_PUBLIC_*` environment variables!

