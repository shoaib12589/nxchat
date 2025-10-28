const { Brand, BrandAgent, User, WidgetKey, Visitor } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// Get all brands for a company
const getBrands = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;

    const whereClause = {
      tenant_id: tenantId
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status !== 'all') {
      whereClause.status = status;
    }

    const { count, rows: brands } = await Brand.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'agents',
          through: { attributes: [] },
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: WidgetKey,
          as: 'widgetKeys',
          attributes: ['id', 'key', 'is_active'],
          where: { is_active: true },
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: brands,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brands'
    });
  }
};

// Get single brand
const getBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const brand = await Brand.findOne({
      where: {
        id: id,
        tenant_id: tenantId
      },
      include: [
        {
          model: User,
          as: 'agents',
          through: { attributes: ['assigned_at', 'assigned_by', 'status'] },
          attributes: ['id', 'name', 'email', 'avatar', 'role']
        },
        {
          model: WidgetKey,
          as: 'widgetKeys',
          attributes: ['id', 'key', 'is_active', 'created_at']
        }
      ]
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    res.json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('Get brand error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brand'
    });
  }
};

// Create new brand
const createBrand = async (req, res) => {
  try {
    const {
      name,
      description,
      logo,
      primary_color,
      secondary_color,
      settings
    } = req.body;

    const tenantId = req.user.tenant_id;

    // Check if brand name already exists for this company
    const existingBrand = await Brand.findOne({
      where: {
        name: name,
        tenant_id: tenantId
      }
    });

    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: 'Brand name already exists'
      });
    }

    const brand = await Brand.create({
      name,
      description,
      logo,
      primary_color: primary_color || '#007bff',
      secondary_color: secondary_color || '#6c757d',
      tenant_id: tenantId,
      settings: settings || {}
    });

    // Generate widget key for this brand
    const widgetKey = await WidgetKey.create({
      tenant_id: tenantId,
      brand_id: brand.id,
      key: uuidv4(),
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: {
        brand,
        widgetKey: {
          id: widgetKey.id,
          key: widgetKey.key
        }
      }
    });
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create brand'
    });
  }
};

// Update brand
const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      logo,
      primary_color,
      secondary_color,
      status,
      settings
    } = req.body;

    const tenantId = req.user.tenant_id;

    const brand = await Brand.findOne({
      where: {
        id: id,
        tenant_id: tenantId
      }
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if new name conflicts with existing brands
    if (name && name !== brand.name) {
      const existingBrand = await Brand.findOne({
        where: {
          name: name,
          tenant_id: tenantId,
          id: { [Op.ne]: id }
        }
      });

      if (existingBrand) {
        return res.status(400).json({
          success: false,
          message: 'Brand name already exists'
        });
      }
    }

    await brand.update({
      name: name || brand.name,
      description: description !== undefined ? description : brand.description,
      logo: logo !== undefined ? logo : brand.logo,
      primary_color: primary_color || brand.primary_color,
      secondary_color: secondary_color || brand.secondary_color,
      status: status || brand.status,
      settings: settings !== undefined ? settings : brand.settings
    });

    res.json({
      success: true,
      message: 'Brand updated successfully',
      data: brand
    });
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update brand'
    });
  }
};

// Delete brand
const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const brand = await Brand.findOne({
      where: {
        id: id,
        tenant_id: tenantId
      }
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if brand has active visitors
    const activeVisitors = await Visitor.count({
      where: {
        brand_id: id,
        status: { [Op.in]: ['online', 'away'] }
      }
    });

    if (activeVisitors > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete brand with ${activeVisitors} active visitors`
      });
    }

    await brand.destroy();

    res.json({
      success: true,
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete brand'
    });
  }
};

// Assign agents to brand
const assignAgents = async (req, res) => {
  try {
    const { id } = req.params;
    const { agentIds } = req.body;
    const tenantId = req.user.tenant_id;
    const assignedBy = req.user.id;

    const brand = await Brand.findOne({
      where: {
        id: id,
        tenant_id: tenantId
      }
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Verify all agents belong to the same company
    const agents = await User.findAll({
      where: {
        id: { [Op.in]: agentIds },
        tenant_id: tenantId,
        role: 'agent'
      }
    });

    if (agents.length !== agentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some agents not found or invalid'
      });
    }

    // Remove existing assignments
    await BrandAgent.destroy({
      where: {
        brand_id: id
      }
    });

    // Create new assignments
    const assignments = agentIds.map(agentId => ({
      brand_id: id,
      agent_id: agentId,
      assigned_by: assignedBy,
      status: 'active'
    }));

    await BrandAgent.bulkCreate(assignments);

    res.json({
      success: true,
      message: 'Agents assigned successfully'
    });
  } catch (error) {
    console.error('Assign agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign agents'
    });
  }
};

// Get available agents for assignment
const getAvailableAgents = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const agents = await User.findAll({
      where: {
        tenant_id: tenantId,
        role: 'agent',
        status: 'active'
      },
      attributes: ['id', 'name', 'email', 'avatar'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Get available agents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents'
    });
  }
};

// Generate new widget key for brand
const generateWidgetKey = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const brand = await Brand.findOne({
      where: {
        id: id,
        tenant_id: tenantId
      }
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Deactivate existing widget keys for this brand
    await WidgetKey.update(
      { is_active: false },
      {
        where: {
          brand_id: id,
          tenant_id: tenantId
        }
      }
    );

    // Create new widget key
    const widgetKey = await WidgetKey.create({
      tenant_id: tenantId,
      brand_id: id,
      key: uuidv4(),
      is_active: true
    });

    res.json({
      success: true,
      message: 'New widget key generated',
      data: {
        id: widgetKey.id,
        key: widgetKey.key
      }
    });
  } catch (error) {
    console.error('Generate widget key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate widget key'
    });
  }
};

module.exports = {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
  assignAgents,
  getAvailableAgents,
  generateWidgetKey
};
