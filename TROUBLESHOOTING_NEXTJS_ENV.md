# Troubleshooting Next.js Environment Variables

## Issue: Still Seeing localhost URLs After Rebuild

If you've updated `.env` and rebuilt but still see `localhost:3001` errors, try these solutions:

## Solution 1: Ensure Next.js Reads Root .env File

Next.js by default only reads `.env` files in the `frontend/` directory. I've updated `next.config.js` to load from the root `.env` file, but you need to:

### Check if dotenv is installed

```bash
cd frontend
npm list dotenv
```

If not installed:
```bash
npm install dotenv
```

### Verify next.config.js is updated

Make sure `frontend/next.config.js` has this at the top:

```javascript
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
```

## Solution 2: Create .env.local in Frontend Directory (Alternative)

If Solution 1 doesn't work, create a `.env.local` file in the `frontend/` directory:

```bash
cd /var/www/nxchat/frontend
nano .env.local
```

Add these variables:

```env
NEXT_PUBLIC_API_URL=https://api.konnectbot.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.konnectbot.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51NXWwoARNYeIn6yO6kNmYK3JOhCmHPcsmCNDC4u6C1x7olE5e3q18KPoE3xpIRApldW6pg21AD6Lu3v8XkJUXnW6003yIz9LH2
```

Then rebuild:
```bash
npm run build
```

## Solution 3: Verify Environment Variables During Build

Check what values Next.js is actually using during build:

```bash
cd /var/www/nxchat/frontend

# Check if variables are loaded
node -e "require('dotenv').config({ path: '../.env' }); console.log('API URL:', process.env.NEXT_PUBLIC_API_URL); console.log('Socket URL:', process.env.NEXT_PUBLIC_SOCKET_URL);"

# Build and check output
npm run build 2>&1 | grep -i "NEXT_PUBLIC"
```

## Solution 4: Clear Build Cache and Rebuild

Sometimes Next.js caches old environment variables:

```bash
cd /var/www/nxchat/frontend

# Remove build cache
rm -rf .next

# Remove node_modules cache (optional but thorough)
rm -rf node_modules/.cache

# Rebuild
npm run build
```

## Solution 5: Check Browser Cache

The browser might be serving cached JavaScript:

1. **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear browser cache** completely
3. **Open in incognito/private mode** to test
4. **Check Network tab** - verify the actual URLs being requested

## Solution 6: Verify Built Files

Check what URLs are actually embedded in the built files:

```bash
cd /var/www/nxchat/frontend/.next

# Search for localhost in built files
grep -r "localhost:3001" . 

# Search for your production domain
grep -r "api.konnectbot.com" .
```

If you still see `localhost:3001` in the built files, the build didn't pick up the new environment variables.

## Solution 7: Use Environment Variables Directly in Build Command

Set environment variables explicitly during build:

```bash
cd /var/www/nxchat/frontend

NEXT_PUBLIC_API_URL=https://api.konnectbot.com/api \
NEXT_PUBLIC_SOCKET_URL=https://api.konnectbot.com \
npm run build
```

## Debugging Steps

### Step 1: Verify .env File Location and Content

```bash
cd /var/www/nxchat
cat .env | grep NEXT_PUBLIC
```

Should show:
```
NEXT_PUBLIC_API_URL=https://api.konnectbot.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.konnectbot.com
```

### Step 2: Test Environment Variable Loading

```bash
cd /var/www/nxchat/frontend
node -e "require('dotenv').config({ path: '../.env' }); console.log(process.env.NEXT_PUBLIC_API_URL);"
```

Should output: `https://api.konnectbot.com/api`

### Step 3: Check Build Output

```bash
cd /var/www/nxchat/frontend
npm run build 2>&1 | head -20
```

Look for any warnings about environment variables.

### Step 4: Verify Built JavaScript

After building, check the actual JavaScript bundle:

```bash
cd /var/www/nxchat/frontend/.next/static/chunks
grep -l "localhost:3001" *.js
```

If this finds files, the build didn't use the new environment variables.

## Most Common Issues

1. **Browser cache** - Most common! Clear cache and hard refresh
2. **Build didn't pick up .env** - Next.js not reading root .env (Solution 1 or 2)
3. **Old build files** - Didn't delete `.next` folder before rebuilding
4. **Wrong .env file** - Updated wrong file or location
5. **PM2 serving old build** - PM2 didn't restart or is serving cached files

## Quick Fix Checklist

- [ ] Verified `.env` file has correct `NEXT_PUBLIC_*` values
- [ ] Installed `dotenv` in frontend (if using next.config.js approach)
- [ ] Updated `next.config.js` to load root .env
- [ ] Deleted `.next` folder before rebuilding
- [ ] Rebuilt frontend: `cd frontend && npm run build`
- [ ] Restarted PM2: `pm2 restart nxchat-frontend`
- [ ] Cleared browser cache and hard refreshed
- [ ] Checked Network tab to see actual URLs being requested

## Still Not Working?

If none of these work, try the most direct approach:

1. **Create `.env.production` in frontend directory**:

```bash
cd /var/www/nxchat/frontend
nano .env.production
```

Add:
```env
NEXT_PUBLIC_API_URL=https://api.konnectbot.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.konnectbot.com
```

2. **Rebuild**:
```bash
NODE_ENV=production npm run build
```

3. **Restart**:
```bash
pm2 restart nxchat-frontend
```

This ensures Next.js uses the production environment file explicitly.

