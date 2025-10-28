const { SystemSetting } = require('../models');

const checkMaintenanceMode = async (req, res, next) => {
  try {
    // Skip maintenance check for super admin users
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    // Check if maintenance mode is enabled
    const maintenanceSetting = await SystemSetting.findOne({
      where: { setting_key: 'maintenance_mode' }
    });

    const isMaintenanceMode = maintenanceSetting && maintenanceSetting.value === 'true';

    if (isMaintenanceMode) {
      return res.status(503).json({
        success: false,
        message: 'System is currently under maintenance. Please try again later.',
        maintenance_mode: true
      });
    }

    next();
  } catch (error) {
    console.error('Maintenance mode check error:', error);
    // If there's an error checking maintenance mode, allow the request to proceed
    next();
  }
};

module.exports = { checkMaintenanceMode };
