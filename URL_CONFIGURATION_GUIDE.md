# URL Configuration Guide - Quick Reference

This guide explains how to use the centralized URL configuration system in NXChat.

## Overview

NXChat uses a **centralized URL configuration system** located in `config/urls.js`. This allows you to change from localhost to your domain by updating **just one environment variable** in your `.env` file.

## Quick Start

### To Switch from Localhost to Domain

1. **Update `.env` file** (both root and `backend/` directory):
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

That's it! All URLs throughout the application will automatically update.

## Configuration Files

### Environment Variables (.env)

#### Root `.env` and `backend/.env`

```env
# ============================================
# DOMAIN CONFIGURATION
# ============================================
DOMAIN=yourdomain.com          # Your domain (without http://)
USE_HTTPS=true                 # Use HTTPS in production

# Ports (usually don't need to change)
BACKEND_PORT=3001
FRONTEND_PORT=3000
PHPMYADMIN_PORT=8080
```

#### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

## URL Structure

The system automatically generates URLs based on the `DOMAIN` variable:

### Localhost (Development)
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- API: `http://localhost:3001/api`
- Socket: `http://localhost:3001`
- phpMyAdmin: `http://localhost:8080`

### Production (Domain)
- Frontend: `https://yourdomain.com`
- Backend: `https://api.yourdomain.com`
- API: `https://api.yourdomain.com/api`
- Socket: `https://api.yourdomain.com`
- phpMyAdmin: `https://phpmyadmin.yourdomain.com`

## How It Works

### Backend Usage

The centralized config is automatically used in:
- `backend/middleware/security.js` - CORS configuration
- `backend/routes/superadmin/index.js` - Widget URL generation
- `backend/controllers/authController.js` - Widget URL logging
- `backend/controllers/superadminController.js` - Widget URL generation

Example usage in backend code:
```javascript
const { getWidgetUrl, getFrontendUrl, getApiUrl } = require('../../config/urls');

// Get widget URL with key
const widgetUrl = getWidgetUrl(widgetKey);

// Get frontend URL
const frontendUrl = getFrontendUrl();

// Get API URL
const apiUrl = getApiUrl();
```

### Frontend Usage

The frontend uses environment variables that should be set in `frontend/.env.local`:

```typescript
// In frontend code
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
```

## Configuration Reference

### Environment Variables

| Variable | Description | Example (Localhost) | Example (Production) |
|----------|-------------|---------------------|---------------------|
| `DOMAIN` | Your domain name | `localhost` | `yourdomain.com` |
| `USE_HTTPS` | Enable HTTPS | `false` | `true` |
| `BACKEND_PORT` | Backend server port | `3001` | `3001` |
| `FRONTEND_PORT` | Frontend server port | `3000` | `3000` |
| `PHPMYADMIN_PORT` | phpMyAdmin port | `8080` | `8080` |
| `FRONTEND_URL` | Override frontend URL | `http://localhost:3000` | `https://yourdomain.com` |
| `BACKEND_URL` | Override backend URL | `http://localhost:3001` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | Frontend API URL | `http://localhost:3001/api` | `https://api.yourdomain.com/api` |
| `NEXT_PUBLIC_SOCKET_URL` | Frontend Socket URL | `http://localhost:3001` | `https://api.yourdomain.com` |

## Switching Environments

### Development → Production

1. **Update domain in `.env`**:
   ```env
   DOMAIN=yourdomain.com
   USE_HTTPS=true
   ```

2. **Update frontend environment**:
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
   NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
   ```

3. **Rebuild and restart**:
   ```bash
   cd frontend && npm run build && cd ..
   pm2 restart all
   ```

### Production → Development

1. **Update domain in `.env`**:
   ```env
   DOMAIN=localhost
   USE_HTTPS=false
   ```

2. **Update frontend environment**:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   ```

3. **Rebuild and restart**:
   ```bash
   cd frontend && npm run build && cd ..
   pm2 restart all
   ```

## Troubleshooting

### URLs Not Updating

**Problem**: URLs still showing localhost after changing domain.

**Solutions**:
1. Ensure `.env` file is in both root and `backend/` directory
2. Ensure `frontend/.env.local` is updated
3. Rebuild frontend: `cd frontend && npm run build`
4. Restart all services: `pm2 restart all`
5. Clear browser cache

### CORS Errors

**Problem**: Frontend can't connect to backend API.

**Solutions**:
1. Verify `NEXT_PUBLIC_API_URL` matches backend URL
2. Check CORS configuration in `backend/middleware/security.js`
3. Ensure domain is included in allowed origins
4. Check browser console for specific error messages

### Socket.io Connection Issues

**Problem**: Real-time features not working.

**Solutions**:
1. Verify `NEXT_PUBLIC_SOCKET_URL` is set correctly
2. Check Nginx WebSocket configuration
3. Verify Socket.io server is running: `pm2 logs nxchat-backend`

## Files Modified

The following files have been updated to use centralized URL configuration:

- `config/urls.js` - Centralized URL configuration
- `backend/middleware/security.js` - CORS configuration
- `backend/routes/superadmin/index.js` - Widget URL generation
- `backend/controllers/authController.js` - Widget URL logging
- `backend/controllers/superadminController.js` - Widget URL generation
- `.env` - Environment variables template
- `backend/.env` - Backend environment variables template

## Additional Resources

- **Full Deployment Guide**: See `VPS_DEPLOYMENT_GUIDE.md`
- **General Deployment**: See `DEPLOYMENT_GUIDE.md`
- **Project README**: See `README.md`

---

**Last Updated**: January 2025  
**Version**: 1.0.0

