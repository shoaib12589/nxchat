const { User, BrandAgent, Visitor, Brand, AgentSetting } = require('../models');

// Find available agent for transfer
const findAvailableAgent = async (tenantId, brandId) => {
  try {
    console.log('Finding available agent for transfer:', { tenantId, brandId });
    
    // First, get all agents assigned to this brand
    const brandAgents = await BrandAgent.findAll({
      where: {
        brand_id: brandId,
        status: 'active'
      },
      include: [
        {
          model: User,
          as: 'agent',
          where: {
            tenant_id: tenantId,
            role: 'agent',
            status: 'active'
          },
          attributes: ['id', 'name', 'email', 'avatar', 'agent_presence_status', 'last_login']
        }
      ]
    });

    if (brandAgents.length === 0) {
      console.log('No agents assigned to brand:', brandId);
      return null;
    }

    // Filter for online agents (agent_presence_status = 'online' or recently active)
    const onlineAgents = brandAgents.filter(ba => {
      const agent = ba.agent;
      const now = new Date();
      const lastLogin = new Date(agent.last_login);
      const timeDiff = (now - lastLogin) / (1000 * 60); // minutes
      
      return agent.agent_presence_status === 'online' || timeDiff < 5; // Consider active if seen within 5 minutes
    });

    if (onlineAgents.length === 0) {
      console.log('No online agents found for brand:', brandId);
      // Return the first available agent as fallback
      return brandAgents[0].agent;
    }

    // Sort by last login (most recent first) and return the first one
    onlineAgents.sort((a, b) => new Date(b.agent.last_login) - new Date(a.agent.last_login));
    
    console.log('Found available agent:', onlineAgents[0].agent.name);
    return onlineAgents[0].agent;
    
  } catch (error) {
    console.error('Error finding available agent:', error);
    return null;
  }
};

// Transfer chat from AI to agent
const transferChatToAgent = async (visitorId, tenantId, brandId) => {
  try {
    console.log('Transferring chat to agent:', { visitorId, tenantId, brandId });
    
    // Find available agent
    const agent = await findAvailableAgent(tenantId, brandId);
    
    if (!agent) {
      console.log('No available agent found for transfer');
      return {
        success: false,
        message: 'No available agents at the moment. Please try again later.',
        agent: null
      };
    }

    // Update visitor with assigned agent
    await Visitor.update(
      { 
        assigned_agent_id: agent.id,
        status: 'waiting_for_agent',
        last_activity: new Date()
      },
      { 
        where: { 
          id: visitorId, 
          tenant_id: tenantId 
        } 
      }
    );

    console.log('Chat transferred to agent:', agent.name);
    
    return {
      success: true,
      message: 'Chat transferred successfully',
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        avatar: agent.avatar
      }
    };
    
  } catch (error) {
    console.error('Error transferring chat to agent:', error);
    return {
      success: false,
      message: 'Failed to transfer chat. Please try again.',
      agent: null
    };
  }
};

// Get transfer statistics
const getTransferStats = async (tenantId, startDate, endDate) => {
  try {
    const transfers = await Visitor.findAll({
      where: {
        tenant_id: tenantId,
        assigned_agent_id: { [require('sequelize').Op.ne]: null },
        created_at: {
          [require('sequelize').Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: User,
          as: 'assignedAgent',
          attributes: ['id', 'name']
        },
        {
          model: Brand,
          as: 'brand',
          attributes: ['id', 'name']
        }
      ]
    });

    return {
      totalTransfers: transfers.length,
      transfersByAgent: transfers.reduce((acc, visitor) => {
        const agentName = visitor.assignedAgent?.name || 'Unknown';
        acc[agentName] = (acc[agentName] || 0) + 1;
        return acc;
      }, {}),
      transfersByBrand: transfers.reduce((acc, visitor) => {
        const brandName = visitor.brand?.name || 'Unknown';
        acc[brandName] = (acc[brandName] || 0) + 1;
        return acc;
      }, {})
    };
    
  } catch (error) {
    console.error('Error getting transfer stats:', error);
    return {
      totalTransfers: 0,
      transfersByAgent: {},
      transfersByBrand: {}
    };
  }
};

module.exports = {
  findAvailableAgent,
  transferChatToAgent,
  getTransferStats
};
