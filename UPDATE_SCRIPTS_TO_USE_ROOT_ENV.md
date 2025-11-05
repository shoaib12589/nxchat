# Script Update Instructions

All backend scripts need to be updated to load environment variables from the root `.env` file.

## Update Pattern

Replace this:
```javascript
require('dotenv').config();
```

With this:
```javascript
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
```

## Scripts That Need Updating

The following scripts in `backend/scripts/` still need to be updated:

1. ✅ `fix-and-optimize-database.js` - Already updated
2. ⚠️ `fix-notifications-table.js` - Needs update
3. ⚠️ `cleanup-duplicate-visitor-activities.js` - Needs update
4. ⚠️ `test-r2-upload.js` - Needs update
5. ⚠️ `initialize-default-storage-provider.js` - Needs update
6. ⚠️ `initialize-r2-settings.js` - Needs update
7. ⚠️ `add-r2-public-url-setting.js` - Needs update
8. ⚠️ `analyze-visitor-tables.js` - Needs update
9. ⚠️ `cleanup-old-visitor-data.js` - Needs update
10. ⚠️ `run-visitor-optimization.js` - Needs update
11. ⚠️ `check-redis-status.js` - Needs update
12. ⚠️ `quick-redis-setup.js` - Needs update
13. ⚠️ `test-redis-connection.js` - Needs update
14. ⚠️ `configure-redis-cloud.js` - Needs update
15. ⚠️ `save-redis-config.js` - Needs update

## Quick Fix Command

You can use this command to find and update all scripts (run from project root):

```bash
# Find all scripts that need updating
grep -r "require('dotenv').config()" backend/scripts/

# Or use this PowerShell command (Windows):
Get-ChildItem -Path "backend\scripts" -Filter "*.js" -Recurse | Select-String "require\('dotenv'\)\.config\(\)"
```

## Alternative: Use the Centralized Loader

For scripts that import from `backend/config/database.js` or other config files, they'll automatically get the root `.env` loaded. For standalone scripts, use the path-based approach above.

