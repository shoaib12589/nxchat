const jwt = require('jsonwebtoken');
const { User, Chat, Message, Company, Visitor, VisitorMessage } = require('../models');

const chatSocket = (io, socket) => {
  let currentUser = null;
  let currentChat = null;

  // Get current user from socket (set by centralized auth)
  currentUser = socket.currentUser;

  // Handle visitor room joining (for widget)
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
      console.log(`Widget joined visitor room: ${roomName}`);
      
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
      
      // Update visitor's last widget interaction time in database
      const { Visitor } = require('../models');
      await Visitor.update(
        { last_widget_update: timestamp || new Date() },
        { 
          where: { 
            id: visitorId, 
            tenant_id: tenantId 
          } 
        }
      );
      
      // Broadcast widget status to all agents in the tenant
      io.to(`tenant_${tenantId}`).emit('widget:status', {
        visitorId: visitorId,
        tenantId: tenantId,
        status: status,
        timestamp: timestamp
      });
      
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

      // Update chat
      await currentChat.update({
        status: 'closed',
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
