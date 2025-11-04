const { Company, Plan } = require('../models');

/**
 * Middleware to check if company has access to a specific feature
 * @param {string} featureName - The name of the feature to check (e.g., 'ai_training', 'custom_branding', 'grammar_checker')
 * @returns {Function} Express middleware function
 */
const requireFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      // Only check for company_admin users
      if (!req.user || req.user.role !== 'company_admin') {
        return next();
      }

      const tenantId = req.user.tenant_id;

      // Get company with plan
      const company = await Company.findOne({
        where: { id: tenantId },
        include: [
          {
            model: Plan,
            as: 'plan',
            attributes: ['id', 'name', 'ai_enabled', 'max_ai_messages', 'features']
          }
        ]
      });

      if (!company || !company.plan) {
        return res.status(403).json({
          success: false,
          message: 'No subscription plan found. Please upgrade your plan to access this feature.',
          requiresUpgrade: true
        });
      }

      const plan = company.plan;
      const features = typeof plan.features === 'string' 
        ? JSON.parse(plan.features || '{}')
        : (plan.features || {});

      let hasAccess = false;

      // Check feature access based on feature name
      switch (featureName) {
        case 'ai_training':
          hasAccess = features.ai_training === true;
          break;
        case 'custom_branding':
          hasAccess = features.custom_branding === true;
          break;
        case 'grammar_checker':
          hasAccess = features.grammar_checker === true;
          break;
        case 'ai_enabled':
          hasAccess = plan.ai_enabled === true;
          break;
        default:
          // If feature is not recognized, deny access by default
          hasAccess = false;
      }

      if (!hasAccess) {
        const featureDisplayNames = {
          'ai_training': 'AI Training',
          'custom_branding': 'Custom Branding',
          'grammar_checker': 'Grammar Checker',
          'ai_enabled': 'AI Enabled'
        };

        return res.status(403).json({
          success: false,
          message: `The "${featureDisplayNames[featureName] || featureName}" feature is not available in your current plan. Please upgrade to access this feature.`,
          requiresUpgrade: true,
          feature: featureName
        });
      }

      // Feature access granted
      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify feature access'
      });
    }
  };
};

module.exports = {
  requireFeatureAccess
};

