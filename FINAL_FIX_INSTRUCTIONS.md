# Final Fix Instructions - Production Environment Variables

## The Problem

Next.js **only reads `.env` files from the `frontend/` directory** by default. Even though we have a root `.env` file, Next.js won't automatically read it during build.

## The Solution

I've created `frontend/.env.production` which Next.js will automatically load during production builds.

## What You Need to Do on Your Server

### Step 1: Update `.env.production` File

SSH into your server and edit the file:

```bash
cd /var/www/nxchat/frontend
nano .env.production
```

**Important**: Replace `konnectbot.com` with your actual domain name!

The file should contain:

```env
NEXT_PUBLIC_API_URL=https://api.konnectbot.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.konnectbot.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51NXWwoARNYeIn6yO6kNmYK3JOhCmHPcsmCNDC4u6C1x7olE5e3q18KPoE3xpIRApldW6pg21AD6Lu3v8XkJUXnW6003yIz9LH2
```

### Step 2: Delete Old Build

```bash
cd /var/www/nxchat/frontend
rm -rf .next
```

### Step 3: Rebuild Frontend

```bash
cd /var/www/nxchat/frontend
NODE_ENV=production npm run build
```

### Step 4: Restart PM2

```bash
pm2 restart nxchat-frontend
```

### Step 5: Clear Browser Cache

**CRITICAL**: You must clear your browser cache:

1. **Hard Refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Or clear cache completely**: Ctrl+Shift+Delete → Clear cached images and files
3. **Or test in Incognito/Private mode**

## Quick One-Liner Commands

```bash
# Update .env.production (replace konnectbot.com with your domain)
cd /var/www/nxchat/frontend
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://api.konnectbot.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.konnectbot.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51NXWwoARNYeIn6yO6kNmYK3JOhCmHPcsmCNDC4u6C1x7olE5e3q18KPoE3xpIRApldW6pg21AD6Lu3v8XkJUXnW6003yIz9LH2
EOF

# Remove old build and rebuild
rm -rf .next && NODE_ENV=production npm run build

# Restart PM2
pm2 restart nxchat-frontend
```

## Verify It's Working

1. Open browser Developer Tools (F12)
2. Go to **Console** tab - should see no more `ERR_CONNECTION_REFUSED` errors
3. Go to **Network** tab - API requests should go to `https://api.konnectbot.com/api` (NOT localhost)

## Why This Works

Next.js automatically loads environment files in this order:
1. `.env.production.local` (highest priority, gitignored)
2. `.env.production` ✅ **We're using this**
3. `.env.local` (gitignored)
4. `.env`

By creating `.env.production` in the frontend directory, Next.js will automatically use these values during the production build.

## Troubleshooting

### Still seeing localhost?

1. **Verify the file exists**:
   ```bash
   cat /var/www/nxchat/frontend/.env.production
   ```

2. **Check build output** for environment variable warnings:
   ```bash
   cd /var/www/nxchat/frontend
   npm run build 2>&1 | grep -i "env\|NEXT_PUBLIC"
   ```

3. **Verify URLs in built files**:
   ```bash
   cd /var/www/nxchat/frontend/.next/static/chunks
   grep -r "api.konnectbot.com" . | head -5
   ```

4. **Check browser cache** - This is the #1 cause! Clear it completely.

### Alternative: Use .env.local (Works for all environments)

If `.env.production` doesn't work, create `.env.local`:

```bash
cd /var/www/nxchat/frontend
nano .env.local
```

Add the same content, then rebuild. `.env.local` works for both development and production.

---

**Remember**: 
- ✅ Created `frontend/.env.production` file
- ✅ Delete `.next` folder before rebuilding
- ✅ Clear browser cache after rebuilding
- ✅ Replace `konnectbot.com` with your actual domain

