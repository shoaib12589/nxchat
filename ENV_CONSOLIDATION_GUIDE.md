# Environment Variables Consolidation Guide

## Overview

This project has been updated to use a **single `.env` file** at the project root instead of multiple `.env` files scattered across different directories.

## Changes Made

### 1. Single Root `.env` File
- **Location**: `.env` (project root)
- **Purpose**: Contains ALL environment variables for the entire application
- **Backend**: Reads from root `.env` via `backend/config/env-loader.js`
- **Frontend**: Next.js reads from root `.env` (Next.js automatically looks in parent directories)

### 2. Centralized Environment Loader
- **File**: `backend/config/env-loader.js`
- **Purpose**: Ensures all backend files load environment variables from the root `.env` file, regardless of execution directory
- **Usage**: All backend files now use `require('./config/env-loader')` instead of `require('dotenv').config()`

### 3. Removed Redundant Files
The following files should be removed (they're redundant):
- `backend/.env` ❌ (removed - use root `.env`)
- `frontend/.env.local` ❌ (removed - use root `.env` for shared vars, `.env.local` only for frontend-specific vars if needed)

## How to Use

### For Development

1. **Edit the root `.env` file**:
   ```bash
   nano .env
   ```

2. **Update database and domain settings**:
   ```env
   # Database Configuration
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=root
   MYSQL_DB=nxchat
   MYSQL_PORT=3306

   # Domain Configuration
   DOMAIN=localhost
   USE_HTTPS=false
   ```

### For Production

1. **Edit the root `.env` file**:
   ```bash
   nano .env
   ```

2. **Update all settings**:
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
   ```

## Important Notes

### Backend Files
All backend files now automatically load from root `.env`:
- ✅ `backend/server.js`
- ✅ `backend/config/database.js`
- ✅ `backend/config/redis.js`
- ✅ All scripts in `backend/scripts/`

### Frontend (Next.js)
Next.js automatically loads environment variables from:
1. `.env` (project root) - **Shared variables**
2. `.env.local` (project root) - **Local overrides** (gitignored)
3. `.env.development` / `.env.production` (project root) - **Environment-specific**

**Important**: Variables exposed to the browser must have `NEXT_PUBLIC_` prefix.

### Frontend Environment Variables
The frontend needs these variables with `NEXT_PUBLIC_` prefix:

```env
# Frontend Environment Variables (must have NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

These are automatically loaded from the root `.env` file by Next.js.

## Migration Steps

If you're upgrading from the old multi-file setup:

1. **Backup your current `.env` files**:
   ```bash
   cp .env .env.backup
   cp backend/.env backend/.env.backup
   cp frontend/.env.local frontend/.env.local.backup
   ```

2. **Consolidate settings into root `.env`**:
   - Copy all unique settings from `backend/.env` to root `.env`
   - Copy all unique settings from `frontend/.env.local` to root `.env`
   - Add `NEXT_PUBLIC_` prefix to frontend variables that need to be exposed

3. **Remove redundant files**:
   ```bash
   rm backend/.env
   rm frontend/.env.local
   ```

4. **Test the application**:
   ```bash
   # Backend
   cd backend
   npm start

   # Frontend
   cd frontend
   npm run dev
   ```

## Benefits

✅ **Single source of truth** - All configuration in one place  
✅ **Easy to update** - Change database or domain settings in one file  
✅ **No confusion** - No need to remember which file to edit  
✅ **Consistent** - All parts of the application use the same values  
✅ **Simpler deployment** - Only one `.env` file to manage in production

## Troubleshooting

### Backend can't find environment variables
- Ensure `backend/config/env-loader.js` exists
- Check that root `.env` file exists
- Verify variables are set correctly in root `.env`

### Frontend can't find environment variables
- Ensure variables have `NEXT_PUBLIC_` prefix for browser exposure
- Check that root `.env` file exists
- Restart Next.js dev server after changing `.env`

### Scripts can't find environment variables
- All scripts now use the centralized loader
- Ensure you're running scripts from the project root or backend directory
- Check that root `.env` file exists

## File Structure

```
nxchat/
├── .env                    ← Single source of truth (EDIT THIS!)
├── backend/
│   ├── config/
│   │   ├── env-loader.js  ← Centralized loader
│   │   ├── database.js    ← Uses env-loader
│   │   └── redis.js       ← Uses env-loader
│   ├── server.js          ← Uses env-loader
│   └── scripts/           ← All scripts use env-loader
└── frontend/
    └── next.config.js      ← Next.js reads root .env
```

---

**Last Updated**: $(date)
**Status**: ✅ Consolidated to single root `.env` file

