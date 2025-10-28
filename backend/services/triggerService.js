const { Trigger, Chat, Message, User, Department } = require('../models');
const aiService = require('./aiService');

// Evaluate triggers for a message
const evaluateMessageTriggers = async (message, chat) => {
  try {
    const tenantId = chat.tenant_id;
    const triggers = await Trigger.findAll({
      where: {
        tenant_id: tenantId,
        status: 'active',
        trigger_type: 'message'
      },
      order: [['priority', 'ASC']]
    });

    for (const trigger of triggers) {
      if (await evaluateTriggerConditions(trigger.conditions, { message, chat })) {
        await executeTriggerActions(trigger.actions, { message, chat, trigger });
      }
    }
  } catch (error) {
    console.error('Error evaluating message triggers:', error);
  }
};

// Evaluate triggers for chat status change
const evaluateChatStatusTriggers = async (chat, oldStatus, newStatus) => {
  try {
    const tenantId = chat.tenant_id;
    const triggers = await Trigger.findAll({
      where: {
        tenant_id: tenantId,
        status: 'active',
        trigger_type: 'chat_status'
      },
      order: [['priority', 'ASC']]
    });

    for (const trigger of triggers) {
      if (await evaluateTriggerConditions(trigger.conditions, { chat, oldStatus, newStatus })) {
        await executeTriggerActions(trigger.actions, { chat, oldStatus, newStatus, trigger });
      }
    }
  } catch (error) {
    console.error('Error evaluating chat status triggers:', error);
  }
};

// Evaluate trigger conditions
const evaluateTriggerConditions = async (conditions, context) => {
  try {
    const { message, chat, oldStatus, newStatus } = context;

    // Message-based conditions
    if (message) {
      if (conditions.field === 'message' && conditions.operator === 'contains') {
        return message.message.toLowerCase().includes(conditions.value.toLowerCase());
      }
      
      if (conditions.field === 'message' && conditions.operator === 'equals') {
        return message.message.toLowerCase() === conditions.value.toLowerCase();
      }

      if (conditions.field === 'message' && conditions.operator === 'starts_with') {
        return message.message.toLowerCase().startsWith(conditions.value.toLowerCase());
      }

      if (conditions.field === 'sender_type' && conditions.operator === 'equals') {
        return message.sender_type === conditions.value;
      }
    }

    // Chat-based conditions
    if (chat) {
      if (conditions.field === 'status' && conditions.operator === 'equals') {
        return chat.status === conditions.value;
      }

      if (conditions.field === 'status' && conditions.operator === 'changed_to') {
        return newStatus === conditions.value;
      }

      if (conditions.field === 'department_id' && conditions.operator === 'equals') {
        return chat.department_id == conditions.value;
      }

      if (conditions.field === 'waiting_time' && conditions.operator === 'greater_than') {
        const waitingTime = Date.now() - new Date(chat.created_at).getTime();
        return waitingTime > (conditions.value * 60000); // Convert minutes to milliseconds
      }
    }

    // Time-based conditions
    if (conditions.field === 'time' && conditions.operator === 'business_hours') {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      
      // Monday to Friday, 9 AM to 5 PM
      return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
    }

    // Visitor-based conditions
    if (conditions.field === 'visitor_type' && conditions.operator === 'equals') {
      return chat.customer_location === conditions.value;
    }

    return false;
  } catch (error) {
    console.error('Error evaluating trigger conditions:', error);
    return false;
  }
};

// Execute trigger actions
const executeTriggerActions = async (actions, context) => {
  try {
    const { message, chat, trigger } = context;

    for (const action of actions) {
      switch (action.type) {
        case 'assign_to_department':
          await assignChatToDepartment(chat, action.department_id);
          break;

        case 'assign_to_agent':
          await assignChatToAgent(chat, action.agent_id);
          break;

        case 'send_ai_response':
          await sendAIResponse(chat, action.message || 'Hello! How can I help you today?');
          break;

        case 'send_notification':
          await sendNotification(action.user_id, action.title, action.message);
          break;

        case 'add_tag':
          await addTagToChat(chat, action.tag);
          break;

        case 'set_priority':
          await setChatPriority(chat, action.priority);
          break;

        case 'auto_reply':
          await sendAutoReply(chat, action.message);
          break;

        case 'escalate':
          await escalateChat(chat, action.escalation_level);
          break;

        case 'close_chat':
          await closeChat(chat, action.reason);
          break;

        default:
          console.log(`Unknown action type: ${action.type}`);
      }
    }
  } catch (error) {
    console.error('Error executing trigger actions:', error);
  }
};

// Assign chat to department
const assignChatToDepartment = async (chat, departmentId) => {
  try {
    await chat.update({ department_id: departmentId });
    console.log(`Chat ${chat.id} assigned to department ${departmentId}`);
  } catch (error) {
    console.error('Error assigning chat to department:', error);
  }
};

// Assign chat to agent
const assignChatToAgent = async (chat, agentId) => {
  try {
    await chat.update({ 
      agent_id: agentId,
      status: 'active'
    });
    console.log(`Chat ${chat.id} assigned to agent ${agentId}`);
  } catch (error) {
    console.error('Error assigning chat to agent:', error);
  }
};

// Send AI response
const sendAIResponse = async (chat, message) => {
  try {
    const aiResponse = await aiService.generateResponse(message, '', chat.tenant_id);
    
    await Message.create({
      chat_id: chat.id,
      sender_type: 'ai',
      message: aiResponse.response,
      message_type: 'text',
      ai_confidence: aiResponse.confidence
    });

    console.log(`AI response sent for chat ${chat.id}`);
  } catch (error) {
    console.error('Error sending AI response:', error);
  }
};

// Send notification
const sendNotification = async (userId, title, message) => {
  try {
    await Notification.create({
      user_id: userId,
      type: 'system_announcement',
      title,
      message,
      read: false
    });

    console.log(`Notification sent to user ${userId}`);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Add tag to chat
const addTagToChat = async (chat, tag) => {
  try {
    const currentTags = chat.tags || [];
    if (!currentTags.includes(tag)) {
      currentTags.push(tag);
      await chat.update({ tags: currentTags });
      console.log(`Tag "${tag}" added to chat ${chat.id}`);
    }
  } catch (error) {
    console.error('Error adding tag to chat:', error);
  }
};

// Set chat priority
const setChatPriority = async (chat, priority) => {
  try {
    await chat.update({ 
      metadata: {
        ...chat.metadata,
        priority
      }
    });
    console.log(`Priority ${priority} set for chat ${chat.id}`);
  } catch (error) {
    console.error('Error setting chat priority:', error);
  }
};

// Send auto reply
const sendAutoReply = async (chat, message) => {
  try {
    await Message.create({
      chat_id: chat.id,
      sender_type: 'system',
      message,
      message_type: 'text'
    });

    console.log(`Auto reply sent for chat ${chat.id}`);
  } catch (error) {
    console.error('Error sending auto reply:', error);
  }
};

// Escalate chat
const escalateChat = async (chat, escalationLevel) => {
  try {
    await chat.update({ 
      metadata: {
        ...chat.metadata,
        escalation_level: escalationLevel,
        escalated_at: new Date()
      }
    });
    console.log(`Chat ${chat.id} escalated to level ${escalationLevel}`);
  } catch (error) {
    console.error('Error escalating chat:', error);
  }
};

// Close chat
const closeChat = async (chat, reason) => {
  try {
    await chat.update({ 
      status: 'closed',
      ended_at: new Date(),
      metadata: {
        ...chat.metadata,
        close_reason: reason
      }
    });
    console.log(`Chat ${chat.id} closed: ${reason}`);
  } catch (error) {
    console.error('Error closing chat:', error);
  }
};

// Get available agents for assignment
const getAvailableAgents = async (tenantId, departmentId = null) => {
  try {
    const whereClause = {
      tenant_id: tenantId,
      role: 'agent',
      status: 'active',
      agent_presence_status: 'online' // Only consider online agents
    };

    if (departmentId) {
      whereClause.department_id = departmentId;
    }

    const agents = await User.findAll({
      where: whereClause,
      include: [
        { model: AgentSetting, as: 'agentSettings' }
      ]
    });

    // Filter agents who haven't reached their max concurrent chats
    const availableAgents = [];
    
    for (const agent of agents) {
      const settings = agent.agentSettings;
      const maxChats = settings?.max_concurrent_chats || 5;
      
      // Count current active chats for this agent
      const activeChatsCount = await Chat.count({
        where: {
          agent_id: agent.id,
          status: 'active',
          tenant_id: tenantId
        }
      });
      
      // Only include agents who haven't reached their max concurrent chats
      if (activeChatsCount < maxChats) {
        availableAgents.push({
          ...agent.toJSON(),
          currentChatsCount: activeChatsCount,
          maxChats: maxChats
        });
      }
    }

    // Sort by current chat count (least busy first) and then by last login
    availableAgents.sort((a, b) => {
      if (a.currentChatsCount !== b.currentChatsCount) {
        return a.currentChatsCount - b.currentChatsCount;
      }
      return new Date(b.last_login || 0) - new Date(a.last_login || 0);
    });

    return availableAgents;
  } catch (error) {
    console.error('Error getting available agents:', error);
    return [];
  }
};

// Auto-assign chat to available agent
const autoAssignChat = async (chat) => {
  try {
    const availableAgents = await getAvailableAgents(chat.tenant_id, chat.department_id);
    
    if (availableAgents.length > 0) {
      // Assign to the least busy agent (first in sorted array)
      const leastBusyAgent = availableAgents[0];
      await assignChatToAgent(chat, leastBusyAgent.id);
      
      console.log(`Chat ${chat.id} auto-assigned to agent ${leastBusyAgent.name} (${leastBusyAgent.currentChatsCount}/${leastBusyAgent.maxChats} chats)`);
      return leastBusyAgent;
    }

    console.log(`No available online agents found for chat ${chat.id}`);
    return null;
  } catch (error) {
    console.error('Error auto-assigning chat:', error);
    return null;
  }
};

// Handle agent status change - reassign chats if agent goes offline
const handleAgentStatusChange = async (agentId, newStatus, tenantId) => {
  try {
    if (newStatus === 'away' || newStatus === 'invisible') {
      // Find all active chats assigned to this agent
      const activeChats = await Chat.findAll({
        where: {
          agent_id: agentId,
          status: 'active',
          tenant_id: tenantId
        }
      });

      console.log(`Agent ${agentId} status changed to ${newStatus}, reassigning ${activeChats.length} active chats`);

      // Reassign each chat to another available agent
      for (const chat of activeChats) {
        const newAgent = await autoAssignChat(chat);
        if (newAgent) {
          console.log(`Chat ${chat.id} reassigned from agent ${agentId} to agent ${newAgent.name}`);
        } else {
          // No available agents, set chat to waiting
          await chat.update({ 
            agent_id: null,
            status: 'waiting'
          });
          console.log(`Chat ${chat.id} set to waiting - no available agents`);
        }
      }
    } else if (newStatus === 'online') {
      // Agent came back online, check for waiting chats to assign
      const waitingChats = await Chat.findAll({
        where: {
          agent_id: null,
          status: 'waiting',
          tenant_id: tenantId
        },
        order: [['created_at', 'ASC']] // Oldest first
      });

      console.log(`Agent ${agentId} came online, checking ${waitingChats.length} waiting chats`);

      // Try to assign waiting chats to this agent
      const agent = await User.findByPk(agentId);
      if (agent) {
        const settings = await AgentSetting.findOne({ where: { user_id: agentId } });
        const maxChats = settings?.max_concurrent_chats || 5;
        
        const currentChatsCount = await Chat.count({
          where: {
            agent_id: agentId,
            status: 'active',
            tenant_id: tenantId
          }
        });

        const availableSlots = maxChats - currentChatsCount;
        const chatsToAssign = waitingChats.slice(0, availableSlots);

        for (const chat of chatsToAssign) {
          await assignChatToAgent(chat, agentId);
          console.log(`Waiting chat ${chat.id} assigned to newly online agent ${agent.name}`);
        }
      }
    }
  } catch (error) {
    console.error('Error handling agent status change:', error);
  }
};

module.exports = {
  evaluateMessageTriggers,
  evaluateChatStatusTriggers,
  evaluateTriggerConditions,
  executeTriggerActions,
  assignChatToDepartment,
  assignChatToAgent,
  sendAIResponse,
  sendNotification,
  addTagToChat,
  setChatPriority,
  sendAutoReply,
  escalateChat,
  closeChat,
  getAvailableAgents,
  autoAssignChat,
  handleAgentStatusChange
};