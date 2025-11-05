/**
 * Centralized URL Configuration
 * 
 * This file centralizes all URL configurations for the application.
 * To change from localhost to your domain, update the DOMAIN variable in .env file.
 * 
 * Usage:
 * - Backend: const { getApiUrl, getFrontendUrl, getSocketUrl } = require('./config/urls');
 * - Frontend: Import and use in environment variables (NEXT_PUBLIC_*)
 */

// Get domain from environment variable (defaults to localhost for development)
const DOMAIN = process.env.DOMAIN || 'localhost';
const USE_HTTPS = process.env.USE_HTTPS === 'true' || process.env.NODE_ENV === 'production';
const BACKEND_PORT = process.env.BACKEND_PORT || process.env.PORT || '3001';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '3000';
const PHPMYADMIN_PORT = process.env.PHPMYADMIN_PORT || '8080';

// Determine protocol
const protocol = USE_HTTPS ? 'https' : 'http';

// Helper function to build URLs
const buildUrl = (subdomain = '', port = null, path = '') => {
  let host;
  
  if (DOMAIN === 'localhost') {
    // For localhost, always use port
    host = port ? `${DOMAIN}:${port}` : DOMAIN;
  } else {
    // For production domain
    if (subdomain) {
      host = `${subdomain}.${DOMAIN}`;
    } else {
      host = DOMAIN;
    }
    // Only append port if not using standard ports (80 for HTTP, 443 for HTTPS)
    if (port && !USE_HTTPS && port !== '80' && port !== '443') {
      host = `${host}:${port}`;
    }
  }
  
  const url = `${protocol}://${host}${path}`;
  return url;
};

// Export URL getters
const getDomain = () => DOMAIN;

const getFrontendUrl = () => {
  // Use FRONTEND_URL if explicitly set, otherwise build from domain
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  return buildUrl('', FRONTEND_PORT);
};

const getBackendUrl = () => {
  // Use BACKEND_URL if explicitly set, otherwise build from domain
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  // For production, use api subdomain, for localhost use port
  if (DOMAIN === 'localhost') {
    return buildUrl('', BACKEND_PORT);
  } else {
    return buildUrl('api');
  }
};

const getApiUrl = () => {
  return `${getBackendUrl()}/api`;
};

const getSocketUrl = () => {
  // Use SOCKET_URL if explicitly set, otherwise use backend URL
  if (process.env.SOCKET_URL) {
    return process.env.SOCKET_URL;
  }
  return getBackendUrl();
};

const getPhpMyAdminUrl = () => {
  // Use PHPMYADMIN_URL if explicitly set, otherwise build from domain
  if (process.env.PHPMYADMIN_URL) {
    return process.env.PHPMYADMIN_URL;
  }
  
  if (DOMAIN === 'localhost') {
    return buildUrl('', PHPMYADMIN_PORT);
  } else {
    // For production, use phpmyadmin subdomain
    return buildUrl('phpmyadmin');
  }
};

const getWidgetUrl = (key = null) => {
  const baseUrl = getBackendUrl();
  if (key) {
    return `${baseUrl}/widget/snippet.js?key=${key}`;
  }
  return `${baseUrl}/widget/snippet.js`;
};

// CORS allowed origins
const getAllowedOrigins = () => {
  const origins = [
    getFrontendUrl(),
    getBackendUrl(),
    getPhpMyAdminUrl(),
  ];
  
  // Add localhost variants for development
  if (DOMAIN !== 'localhost') {
    origins.push('http://localhost:3000', 'http://localhost:3001');
  }
  
  // Add any additional origins from environment
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()));
  }
  
  return origins.filter(Boolean);
};

// Widget CORS origins
const getWidgetCorsOrigins = () => {
  const origins = getAllowedOrigins();
  
  // Add widget domain if specified
  if (process.env.WIDGET_CORS_ORIGINS) {
    origins.push(...process.env.WIDGET_CORS_ORIGINS.split(',').map(origin => origin.trim()));
  }
  
  return [...new Set(origins)]; // Remove duplicates
};

module.exports = {
  // Domain info
  getDomain,
  
  // URLs
  getFrontendUrl,
  getBackendUrl,
  getApiUrl,
  getSocketUrl,
  getPhpMyAdminUrl,
  getWidgetUrl,
  
  // CORS
  getAllowedOrigins,
  getWidgetCorsOrigins,
  
  // Protocol
  protocol,
  
  // Ports
  BACKEND_PORT,
  FRONTEND_PORT,
  PHPMYADMIN_PORT,
};

