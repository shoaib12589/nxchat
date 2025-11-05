# Quick Fix for Production Errors - Step by Step

## Problem
Frontend still trying to connect to `localhost:3001` even after rebuilding.

## Solution - Follow These Steps on Your Server

### Step 1: Create `.env.production` in Frontend Directory

Next.js automatically loads `.env.production` during production builds. This is the most reliable method.

```bash
cd /var/www/nxchat/frontend
nano .env.production
```

Paste this content (replace `konnectbot.com` with your actual domain):

```env
NEXT_PUBLIC_API_URL=https://api.konnectbot.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.konnectbot.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51NXWwoARNYeIn6yO6kNmYK3JOhCmHPcsmCNDC4u6C1x7olE5e3q18KPoE3xpIRApldW6pg21AD6Lu3v8XkJUXnW6003yIz9LH2
```

**Save and exit** (Ctrl+X, then Y, then Enter)

### Step 2: Delete Old Build

```bash
cd /var/www/nxchat/frontend
rm -rf .next
```

### Step 3: Rebuild with Production Environment

```bash
cd /var/www/nxchat/frontend
NODE_ENV=production npm run build
```

### Step 4: Restart PM2

```bash
pm2 restart nxchat-frontend
```

### Step 5: Clear Browser Cache

**Important**: Clear your browser cache completely:
- Chrome/Edge: Ctrl+Shift+Delete → Clear cached images and files
- Firefox: Ctrl+Shift+Delete → Cache
- Or use **Incognito/Private mode** to test

### Step 6: Hard Refresh

- **Windows**: Ctrl+Shift+R or Ctrl+F5
- **Mac**: Cmd+Shift+R

## Verify It's Working

1. Open browser Developer Tools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Look for API requests - they should go to `https://api.konnectbot.com/api` (NOT localhost)

## Alternative: Check Built Files

Verify the URLs are embedded correctly:

```bash
cd /var/www/nxchat/frontend/.next/static/chunks

# Search for localhost (should find nothing or very few results)
grep -r "localhost:3001" . | wc -l

# Search for your production domain (should find many results)
grep -r "api.konnectbot.com" . | wc -l
```

## Why This Works

Next.js has a specific order for loading environment files:
1. `.env.production.local` (highest priority)
2. `.env.production`
3. `.env.local`
4. `.env`

By creating `.env.production`, we ensure Next.js uses these values during the production build.

## If Still Not Working

### Option A: Use .env.local (Higher Priority)

```bash
cd /var/www/nxchat/frontend
nano .env.local
```

Add the same content as above, then rebuild.

### Option B: Set Environment Variables Directly in Build Command

```bash
cd /var/www/nxchat/frontend
rm -rf .next

NEXT_PUBLIC_API_URL=https://api.konnectbot.com/api \
NEXT_PUBLIC_SOCKET_URL=https://api.konnectbot.com \
NODE_ENV=production \
npm run build
```

### Option C: Check PM2 Environment

Make sure PM2 isn't overriding environment variables:

```bash
pm2 show nxchat-frontend
pm2 env nxchat-frontend
```

## Complete Command Sequence

Copy and paste these commands on your server:

```bash
# Navigate to frontend
cd /var/www/nxchat/frontend

# Create .env.production file
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://api.konnectbot.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.konnectbot.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51NXWwoARNYeIn6yO6kNmYK3JOhCmHPcsmCNDC4u6C1x7olE5e3q18KPoE3xpIRApldW6pg21AD6Lu3v8XkJUXnW6003yIz9LH2
EOF

# Remove old build
rm -rf .next

# Rebuild
NODE_ENV=production npm run build

# Restart PM2
pm2 restart nxchat-frontend

# Check status
pm2 status
```

**Remember**: Replace `konnectbot.com` with your actual domain name in the `.env.production` file!

