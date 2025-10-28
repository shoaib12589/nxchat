const { Company } = require('../models');

const requireTenant = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Super admin can access any tenant
    if (req.user.role === 'super_admin') {
      // If tenant_id is provided in params/body, validate it exists
      const tenantId = req.params.tenantId || req.body.tenant_id || req.query.tenant_id;
      if (tenantId) {
        const company = await Company.findByPk(tenantId);
        if (!company) {
          return res.status(404).json({ 
            success: false, 
            message: 'Company not found' 
          });
        }
        req.tenant = company;
      }
      return next();
    }

    // For other roles, they must belong to a tenant
    if (!req.user.tenant_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tenant access' 
      });
    }

    // Load tenant information
    const tenant = await Company.findByPk(req.user.tenant_id);
    if (!tenant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found' 
      });
    }

    if (tenant.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Tenant account is not active' 
      });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Tenant validation error' 
    });
  }
};

const requireActiveTenant = async (req, res, next) => {
  try {
    await requireTenant(req, res, () => {
      if (req.tenant && req.tenant.status !== 'active') {
        return res.status(403).json({ 
          success: false, 
          message: 'Tenant account is not active' 
        });
      }
      next();
    });
  } catch (error) {
    console.error('Active tenant middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Active tenant validation error' 
    });
  }
};

const validateTenantAccess = (req, res, next) => {
  // Ensure user can only access their own tenant's data
  if (req.user.role !== 'super_admin' && req.user.tenant_id) {
    const requestedTenantId = req.params.tenantId || req.body.tenant_id || req.query.tenant_id;
    
    if (requestedTenantId && parseInt(requestedTenantId) !== req.user.tenant_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this tenant' 
      });
    }
  }
  
  next();
};

module.exports = {
  requireTenant,
  requireActiveTenant,
  validateTenantAccess
};
