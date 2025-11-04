const jwt = require('jsonwebtoken');
const { User, Chat, Message, Company, Visitor, VisitorMessage } = require('../models');

const chatSocket = (io, socket) => {
  let currentUser = null;
  let currentChat = null;

  // Get current user from socket (set by centralized auth)
  currentUser = socket.currentUser;

  // Handle visitor room joining (for widget and agents)
  socket.on('join_visitor_room', (data) => {
    try {
      const { visitorId } = data;
      
      if (!visitorId) {
        console.log('No visitor ID provided for room join');
        socket.emit('error', { message: 'No visitor ID provided' });
        return;
      }
      
      // Join visitor-specific room
      const roomName = `visitor_${visitorId}`;
      socket.join(roomName);
      const userRole = currentUser?.role || 'unknown';
      const userName = currentUser?.name || socket.id;
      console.log(`${userRole} ${userName} joined visitor room: ${roomName}`);
      
      socket.emit('visitor_room_joined', { 
        success: true, 
        visitorId: visitorId,
        roomName: roomName
      });
      
    } catch (error) {
      console.error('Join visitor room error:', error);
      socket.emit('error', { message: 'Failed to join visitor room', error: error.message });
    }
  });

  // Handle widget status updates (minimize/maximize)
  socket.on('widget:status', async (data) => {
    try {
      const { visitorId, tenantId, status, timestamp } = data;
      
      if (!visitorId || !tenantId || !status) {
        console.log('Invalid widget status data:', data);
        return;
      }
      
      console.log(`Widget status update: visitor_${visitorId} is ${status}`);
      
      // Update visitor's last widget interaction time and status in database
      const { Visitor } = require('../models');
      await Visitor.update(
        { 
          last_widget_update: timestamp || new Date(),
          widget_status: status === 'minimized' ? 'minimized' : status === 'maximized' ? 'maximized' : null
        },
        { 
          where: { 
            id: visitorId, 
            tenant_id: tenantId 
          } 
        }
      );
      
      // Store widget status as system message in database
      let statusMessage = '';
      if (status === 'maximized') {
        statusMessage = 'Visitor reopened the chat window';
      } else if (status === 'minimized') {
        statusMessage = 'Visitor minimized the chat window';
      } else {
        statusMessage = `Widget status: ${status}`;
      }

      await VisitorMessage.create({
        visitor_id: visitorId,
        tenant_id: tenantId,
        sender_type: 'system',
        sender_name: 'System',
        message: statusMessage,
        message_type: 'system',
        is_read: false,
        metadata: {
          event_type: 'widget_status',
          status: status,
          timestamp: timestamp
        }
      });

      // Broadcast widget status to all agents in the tenant
      const broadcastData = {
        visitorId: visitorId,
        tenantId: tenantId,
        status: status,
        timestamp: timestamp
      };
      console.log(`Broadcasting widget:status to tenant_${tenantId}:`, broadcastData);
      io.to(`tenant_${tenantId}`).emit('widget:status', broadcastData);
      
    } catch (error) {
      console.error('Widget status error:', error);
    }
  });

  // Get current user from socket (set by centralized auth)
  currentUser = socket.currentUser;

  // Join chat room (only for authenticated users)
  socket.on('join_chat', async (data) => {
    try {
      const { chatId } = data;
      
      if (!currentUser) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const chat = await Chat.findByPk(chatId, {
        include: [
          { model: User, as: 'customer' },
          { model: User, as: 'agent' },
          { model: Company, as: 'company' }
        ]
      });

      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      // Check permissions
      const canAccess = 
        currentUser.role === 'super_admin' ||
        (currentUser.tenant_id === chat.tenant_id && 
         (currentUser.role === 'company_admin' || 
          currentUser.id === chat.customer_id || 
          currentUser.id === chat.agent_id));

      if (!canAccess) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Leave previous chat room
      if (currentChat) {
        socket.leave(`chat_${currentChat.id}`);
      }

      // Join new chat room
      socket.join(`chat_${chatId}`);
      currentChat = chat;

      socket.emit('chat_joined', { 
        success: true, 
        chat: chat.toJSON() 
      });

      // Notify others in the chat
      socket.to(`chat_${chatId}`).emit('user_joined_chat', {
        user: currentUser.toJSON()
      });

    } catch (error) {
      console.error('Join chat error:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  // Send message (only for authenticated users)
  socket.on('send_message', async (data) => {
    try {
      const { message, messageType = 'text', fileUrl = null, fileName = null, fileSize = null } = data;

      if (!currentUser || !currentChat) {
        socket.emit('error', { message: 'Not in a chat' });
        return;
      }

      // Create message in database
      const newMessage = await Message.create({
        chat_id: currentChat.id,
        sender_id: currentUser.id,
        sender_type: currentUser.role === 'customer' ? 'customer' : 'agent',
        message: message,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        message_type: messageType
      });

      // Load message with sender info
      const messageWithSender = await Message.findByPk(newMessage.id, {
        include: [{ model: User, as: 'sender' }]
      });

      // Broadcast message to all users in the chat
      io.to(`chat_${currentChat.id}`).emit('new_message', {
        message: messageWithSender.toJSON()
      });

      // Update chat status if needed
      if (currentChat.status === 'waiting' && currentUser.role !== 'customer') {
        await currentChat.update({ 
          status: 'active',
          agent_id: currentUser.id,
          started_at: new Date()
        });
      }

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicators (only for authenticated users)
  socket.on('typing_start', () => {
    if (currentUser && currentChat) {
      socket.to(`chat_${currentChat.id}`).emit('user_typing', {
        user: currentUser.toJSON(),
        isTyping: true
      });
    }
  });

  socket.on('typing_stop', () => {
    if (currentUser && currentChat) {
      socket.to(`chat_${currentChat.id}`).emit('user_typing', {
        user: currentUser.toJSON(),
        isTyping: false
      });
    }
  });

  // Handle visitor typing indicators (from widget)
  socket.on('visitor:typing', async (data) => {
    try {
      const { visitorId, isTyping, timestamp } = data;
      
      if (!visitorId || typeof isTyping !== 'boolean') {
        console.log('Invalid visitor typing data:', data);
        return;
      }

      // Get visitor info to determine tenant
      const visitor = await Visitor.findByPk(visitorId);
      if (!visitor) {
        console.log('Visitor not found for typing event:', visitorId);
        return;
      }

      // Broadcast to all agents in the tenant
      io.to(`tenant_${visitor.tenant_id}`).emit('visitor:typing', {
        visitorId: visitorId.toString(),
        isTyping: isTyping,
        timestamp: timestamp || new Date().toISOString()
      });

      // Also emit to visitor chat room for agent chat page compatibility
      io.to(`visitor_${visitorId}`).emit('visitor:chat:typing', {
        visitorId: visitorId.toString(),
        isTyping: isTyping
      });

      console.log(`Visitor ${visitorId} typing: ${isTyping}`);
    } catch (error) {
      console.error('Visitor typing error:', error);
    }
  });

  // Handle visitor typing content (live preview)
  socket.on('visitor:typing-content', async (data) => {
    try {
      const { visitorId, content, timestamp } = data;
      
      console.log('📥 [BACKEND] Received visitor:typing-content:', { visitorId, contentLength: content?.length || 0, hasContent: !!content });
      
      if (!visitorId || typeof content !== 'string') {
        console.log('❌ [BACKEND] Invalid visitor typing content data:', data);
        return;
      }

      // Get visitor info to determine tenant and brand
      const visitor = await Visitor.findByPk(visitorId);
      if (!visitor) {
        console.log('❌ [BACKEND] Visitor not found for typing content event:', visitorId);
        return;
      }

      console.log('✅ [BACKEND] Visitor found:', { id: visitor.id, brand_id: visitor.brand_id, tenant_id: visitor.tenant_id });

      const typingContentData = {
        visitorId: visitorId.toString(),
        content: content,
        timestamp: timestamp || new Date().toISOString()
      };

      // Broadcast typing content to brand-specific room so only assigned agents see it
      if (visitor.brand_id) {
        io.to(`brand_${visitor.brand_id}`).emit('visitor:typing-content', typingContentData);
        console.log(`📤 [BACKEND] Emitted visitor:typing-content to brand room: brand_${visitor.brand_id}`, content ? `(${content.length} chars)` : '(cleared)');
      } else {
        // Fallback: if no brand, emit to tenant (shouldn't happen in production)
        console.warn('⚠️ [BACKEND] Visitor has no brand_id, emitting typing content to tenant room as fallback');
        io.to(`tenant_${visitor.tenant_id}`).emit('visitor:typing-content', typingContentData);
      }

      // Also emit to visitor-specific room for agent chat page compatibility
      io.to(`visitor_${visitorId}`).emit('visitor:typing-content', typingContentData);
      console.log(`📤 [BACKEND] Also emitted visitor:typing-content to visitor room: visitor_${visitorId}`);
    } catch (error) {
      console.error('❌ [BACKEND] Visitor typing content error:', error);
    }
  });

  // Handle agent typing indicators (from agent dashboard)
  socket.on('agent:typing', async (data) => {
    try {
      const { visitorId, isTyping } = data;
      
      if (!visitorId || typeof isTyping !== 'boolean') {
        console.log('Invalid agent typing data:', data);
        return;
      }

      if (!currentUser) {
        console.log('Agent typing event but user not authenticated');
        return;
      }

      // Verify agent has access to this visitor
      const visitor = await Visitor.findByPk(visitorId);
      if (!visitor) {
        console.log('Visitor not found for agent typing event:', visitorId);
        return;
      }

      // Check permissions - agent must be in same tenant
      if (currentUser.tenant_id !== visitor.tenant_id && currentUser.role !== 'super_admin') {
        console.log('Agent does not have access to visitor:', visitorId);
        return;
      }

      // Broadcast agent typing to visitor
      io.to(`visitor_${visitorId}`).emit('agent:typing', {
        agentId: currentUser.id.toString(),
        agentName: currentUser.name,
        isTyping: isTyping
      });

      console.log(`Agent ${currentUser.name} typing to visitor ${visitorId}: ${isTyping}`);
    } catch (error) {
      console.error('Agent typing error:', error);
    }
  });

  // Mark messages as read (only for authenticated users)
  socket.on('mark_messages_read', async (data) => {
    try {
      const { messageIds } = data;

      if (!currentUser || !currentChat) {
        return;
      }

      // Mark messages as read
      await Message.update(
        { 
          is_read: true, 
          read_at: new Date() 
        },
        { 
          where: { 
            id: messageIds,
            chat_id: currentChat.id,
            sender_id: { [require('sequelize').Op.ne]: currentUser.id }
          }
        }
      );

      // Notify sender that messages were read
      socket.to(`chat_${currentChat.id}`).emit('messages_read', {
        messageIds,
        readBy: currentUser.toJSON()
      });

    } catch (error) {
      console.error('Mark messages read error:', error);
    }
  });

  // Transfer chat (only for authenticated users)
  socket.on('transfer_chat', async (data) => {
    try {
      const { targetAgentId, targetDepartmentId, reason } = data;

      if (!currentUser || !currentChat) {
        socket.emit('error', { message: 'Not in a chat' });
        return;
      }

      // Check permissions
      if (currentUser.role !== 'super_admin' && 
          currentUser.role !== 'company_admin' && 
          currentUser.id !== currentChat.agent_id) {
        socket.emit('error', { message: 'Insufficient permissions' });
        return;
      }

      let targetAgent = null;
      if (targetAgentId) {
        targetAgent = await User.findByPk(targetAgentId);
      }

      // Update chat
      await currentChat.update({
        agent_id: targetAgentId,
        department_id: targetDepartmentId,
        status: 'transferred'
      });

      // Create system message
      const transferMessage = await Message.create({
        chat_id: currentChat.id,
        sender_id: currentUser.id,
        sender_type: 'system',
        message: `Chat transferred to ${targetAgent ? targetAgent.name : 'department'}${reason ? ` - ${reason}` : ''}`,
        message_type: 'system'
      });

      // Notify all users in chat
      io.to(`chat_${currentChat.id}`).emit('chat_transferred', {
        chat: currentChat.toJSON(),
        transferMessage: transferMessage.toJSON(),
        transferredBy: currentUser.toJSON(),
        transferredTo: targetAgent ? targetAgent.toJSON() : null
      });

      // Notify target agent if specified
      if (targetAgent) {
        io.to(`user_${targetAgent.id}`).emit('chat_assigned', {
          chat: currentChat.toJSON(),
          assignedBy: currentUser.toJSON()
        });
      }

    } catch (error) {
      console.error('Transfer chat error:', error);
      socket.emit('error', { message: 'Failed to transfer chat' });
    }
  });

  // End chat (only for authenticated users)
  socket.on('end_chat', async (data) => {
    try {
      const { rating, feedback } = data;

      if (!currentUser || !currentChat) {
        socket.emit('error', { message: 'Not in a chat' });
        return;
      }

      // Check permissions
      if (currentUser.role !== 'super_admin' && 
          currentUser.role !== 'company_admin' && 
          currentUser.id !== currentChat.agent_id) {
        socket.emit('error', { message: 'Insufficient permissions' });
        return;
      }

      // Update chat - use 'completed' status if chat was properly ended with rating
      // Use 'closed' for chats ended without rating (just agent closing)
      const chatStatus = rating ? 'completed' : 'closed';
      
      await currentChat.update({
        status: chatStatus,
        ended_at: new Date(),
        rating: rating,
        rating_feedback: feedback
      });

      // Create system message
      const endMessage = await Message.create({
        chat_id: currentChat.id,
        sender_id: currentUser.id,
        sender_type: 'system',
        message: 'Chat ended',
        message_type: 'system'
      });

      // Notify all users in chat
      io.to(`chat_${currentChat.id}`).emit('chat_ended', {
        chat: currentChat.toJSON(),
        endMessage: endMessage.toJSON(),
        endedBy: currentUser.toJSON()
      });

      // Leave chat room
      socket.leave(`chat_${currentChat.id}`);
      currentChat = null;

    } catch (error) {
      console.error('End chat error:', error);
      socket.emit('error', { message: 'Failed to end chat' });
    }
  });

  // Handle chat transfer notification
  socket.on('chat:transferred', async (data) => {
    try {
      const { visitorId, agentId, agentName, message, timestamp, type } = data;
      
      console.log('Chat transfer notification received:', data);
      
      // Verify the agent is the intended recipient
      if (currentUser && currentUser.id === agentId) {
        // Add transfer message to visitor's chat history
        try {
          const transferMessage = await VisitorMessage.create({
            visitor_id: visitorId,
            tenant_id: currentUser.tenant_id,
            sender_type: 'system',
            sender_name: 'System',
            message: message,
            message_type: 'system',
            is_read: false,
            metadata: {
              transfer_type: type,
              timestamp: timestamp
            }
          });
          
          console.log('Transfer message added to chat history:', transferMessage.id);
          
          // Emit the transfer message to the agent
          socket.emit('transfer:message', {
            visitorId: visitorId,
            message: {
              id: transferMessage.id.toString(),
              content: message,
              sender: 'system',
              senderName: 'System',
              timestamp: transferMessage.created_at,
              visitorId: visitorId,
              isRead: false,
              messageType: 'system',
              metadata: transferMessage.metadata
            }
          });
          
        } catch (dbError) {
          console.error('Error adding transfer message to chat history:', dbError);
        }
        
        // Emit transfer notification to agent
        socket.emit('chat:transfer_notification', {
          visitorId: visitorId,
          agentName: agentName,
          message: message,
          timestamp: timestamp,
          type: type
        });
      }
      
    } catch (error) {
      console.error('Chat transfer notification error:', error);
    }
  });

  // Handle visitor transfer notification (general)
  socket.on('visitor:transfer', async (data) => {
    try {
      const { visitorId, agentId, agentName, message, timestamp, type } = data;
      
      console.log('Visitor transfer notification received:', data);
      
      // Emit to all agents in the tenant
      socket.to(`tenant_${data.tenantId}`).emit('visitor:transfer_notification', {
        visitorId: visitorId,
        agentId: agentId,
        agentName: agentName,
        message: message,
        timestamp: timestamp,
        type: type
      });
      
    } catch (error) {
      console.error('Visitor transfer notification error:', error);
    }
  });

  // Handle disconnect
  // Handle message seen status (when visitor views agent message)
  socket.on('message:seen', async (data) => {
    try {
      const { visitorId, messageId, timestamp } = data;
      
      if (!visitorId || !messageId) {
        console.log('❌ Invalid message seen data:', data);
        return;
      }
      
      console.log(`📬 Message seen: visitor_${visitorId} viewed message ${messageId}`);
      
      // Update message read status in database
      const message = await VisitorMessage.findByPk(messageId);
      if (message && message.sender_type === 'agent') {
        await message.update({
          is_read: true,
          read_at: timestamp || new Date()
        });
        
        console.log(`✅ Updated message ${messageId} read status in database`);
        
        // Get visitor's tenant_id and brand_id
        const visitor = await Visitor.findByPk(visitorId, {
          attributes: ['tenant_id', 'brand_id', 'assigned_agent_id']
        });
        
        if (visitor) {
          const seenData = {
            visitorId: visitorId,
            messageId: messageId.toString(), // Ensure string format for consistency
            timestamp: timestamp || new Date().toISOString()
          };
          
          console.log(`📤 Broadcasting message:seen to rooms:`, {
            tenant: `tenant_${visitor.tenant_id}`,
            brand: visitor.brand_id ? `brand_${visitor.brand_id}` : null,
            agent: visitor.assigned_agent_id ? `agent_${visitor.assigned_agent_id}` : null,
            user: visitor.assigned_agent_id ? `user_${visitor.assigned_agent_id}` : null
          });
          
          // Emit to agents in tenant room
          io.to(`tenant_${visitor.tenant_id}`).emit('message:seen', seenData);
          
          // Also emit to brand room if visitor has a brand
          if (visitor.brand_id) {
            io.to(`brand_${visitor.brand_id}`).emit('message:seen', seenData);
          }
          
          // Emit to specific agent if assigned (use user room since agents join user_${id} on auth)
          if (visitor.assigned_agent_id) {
            // Emit to user room (agents join user_${id} on authentication)
            io.to(`user_${visitor.assigned_agent_id}`).emit('message:seen', seenData);
          }
        } else {
          console.log(`⚠️ Visitor ${visitorId} not found for message seen update`);
        }
      } else {
        console.log(`⚠️ Message ${messageId} not found or is not an agent message`);
      }
    } catch (error) {
      console.error('❌ Message seen error:', error);
    }
  });

  socket.on('disconnect', () => {
    if (currentUser) {
      console.log(`User ${currentUser.name} disconnected`);
      
      if (currentChat) {
        // Notify others that user left
        socket.to(`chat_${currentChat.id}`).emit('user_left_chat', {
          user: currentUser.toJSON()
        });
      }
    } else {
      console.log(`Unauthenticated socket disconnected: ${socket.id}`);
    }
  });
};

module.exports = chatSocket;
