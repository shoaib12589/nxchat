/**
 * Centralized Environment Variable Loader
 * 
 * This utility ensures all environment variables are loaded from the root .env file
 * regardless of where the script is executed from.
 */

const path = require('path');
const fs = require('fs');

// Get the project root directory (two levels up from backend/config/)
const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');

// Check if root .env file exists
if (!fs.existsSync(envPath)) {
  console.warn(`⚠️  Warning: Root .env file not found at ${envPath}`);
  console.warn(`   Please ensure .env file exists at project root.`);
}

// Load environment variables from root .env file
require('dotenv').config({ path: envPath });

module.exports = {
  envPath,
  projectRoot
};

