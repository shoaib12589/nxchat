const jwt = require('jsonwebtoken');
const { User, Chat, CallSession } = require('../models');

const callSocket = (io, socket) => {
  let currentUser = null;
  let currentCall = null;

  // Get current user from socket (set by centralized auth)
  currentUser = socket.currentUser;

  // Initiate call
  socket.on('call_initiate', async (data) => {
    try {
      const { chatId, callType = 'audio' } = data;

      if (!currentUser) {
        socket.emit('call_error', { message: 'Not authenticated' });
        return;
      }

      const chat = await Chat.findByPk(chatId);
      if (!chat) {
        socket.emit('call_error', { message: 'Chat not found' });
        return;
      }

      // Check permissions
      const canCall = 
        currentUser.role === 'super_admin' ||
        (currentUser.tenant_id === chat.tenant_id && 
         (currentUser.id === chat.customer_id || currentUser.id === chat.agent_id));

      if (!canCall) {
        socket.emit('call_error', { message: 'Access denied' });
        return;
      }

      // Create call session
      const callSession = await CallSession.create({
        chat_id: chatId,
        type: callType,
        status: 'initiated',
        initiator_id: currentUser.id,
        started_at: new Date()
      });

      currentCall = callSession;

      // Determine target user
      const targetUserId = currentUser.id === chat.customer_id ? chat.agent_id : chat.customer_id;
      
      if (!targetUserId) {
        socket.emit('call_error', { message: 'No target user found' });
        return;
      }

      // Notify target user
      socket.to(`user_${targetUserId}`).emit('call_incoming', {
        callId: callSession.id,
        chatId: chatId,
        callType: callType,
        initiator: currentUser.toJSON()
      });

      socket.emit('call_initiated', {
        callId: callSession.id,
        status: 'ringing'
      });

    } catch (error) {
      console.error('Call initiate error:', error);
      socket.emit('call_error', { message: 'Failed to initiate call' });
    }
  });

  // Accept call
  socket.on('call_accept', async (data) => {
    try {
      const { callId } = data;

      if (!currentUser || !currentCall) {
        socket.emit('call_error', { message: 'No active call' });
        return;
      }

      const callSession = await CallSession.findByPk(callId);
      if (!callSession) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      // Update call status
      await callSession.update({
        status: 'connected',
        participant_id: currentUser.id
      });

      // Notify initiator
      socket.to(`user_${callSession.initiator_id}`).emit('call_accepted', {
        callId: callId,
        participant: currentUser.toJSON()
      });

      socket.emit('call_connected', {
        callId: callId,
        status: 'connected'
      });

    } catch (error) {
      console.error('Call accept error:', error);
      socket.emit('call_error', { message: 'Failed to accept call' });
    }
  });

  // Reject call
  socket.on('call_reject', async (data) => {
    try {
      const { callId } = data;

      if (!currentCall) {
        socket.emit('call_error', { message: 'No active call' });
        return;
      }

      const callSession = await CallSession.findByPk(callId);
      if (!callSession) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      // Update call status
      await callSession.update({
        status: 'ended',
        ended_at: new Date()
      });

      // Notify initiator
      socket.to(`user_${callSession.initiator_id}`).emit('call_rejected', {
        callId: callId,
        rejectedBy: currentUser.toJSON()
      });

      socket.emit('call_rejected', {
        callId: callId
      });

      currentCall = null;

    } catch (error) {
      console.error('Call reject error:', error);
      socket.emit('call_error', { message: 'Failed to reject call' });
    }
  });

  // WebRTC signaling - Offer
  socket.on('call_offer', (data) => {
    try {
      const { callId, offer } = data;

      if (!currentCall) {
        socket.emit('call_error', { message: 'No active call' });
        return;
      }

      // Forward offer to other participant
      socket.to(`user_${currentCall.participant_id || currentCall.initiator_id}`).emit('call_offer', {
        callId: callId,
        offer: offer,
        from: currentUser.id
      });

    } catch (error) {
      console.error('Call offer error:', error);
      socket.emit('call_error', { message: 'Failed to send offer' });
    }
  });

  // WebRTC signaling - Answer
  socket.on('call_answer', (data) => {
    try {
      const { callId, answer } = data;

      if (!currentCall) {
        socket.emit('call_error', { message: 'No active call' });
        return;
      }

      // Forward answer to other participant
      socket.to(`user_${currentCall.initiator_id}`).emit('call_answer', {
        callId: callId,
        answer: answer,
        from: currentUser.id
      });

    } catch (error) {
      console.error('Call answer error:', error);
      socket.emit('call_error', { message: 'Failed to send answer' });
    }
  });

  // WebRTC signaling - ICE Candidate
  socket.on('call_ice_candidate', (data) => {
    try {
      const { callId, candidate } = data;

      if (!currentCall) {
        socket.emit('call_error', { message: 'No active call' });
        return;
      }

      // Forward ICE candidate to other participant
      const targetUserId = currentUser.id === currentCall.initiator_id ? 
        currentCall.participant_id : currentCall.initiator_id;

      socket.to(`user_${targetUserId}`).emit('call_ice_candidate', {
        callId: callId,
        candidate: candidate,
        from: currentUser.id
      });

    } catch (error) {
      console.error('Call ICE candidate error:', error);
      socket.emit('call_error', { message: 'Failed to send ICE candidate' });
    }
  });

  // End call
  socket.on('call_end', async (data) => {
    try {
      const { callId, duration } = data;

      if (!currentCall) {
        socket.emit('call_error', { message: 'No active call' });
        return;
      }

      const callSession = await CallSession.findByPk(callId);
      if (!callSession) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      // Update call session
      await callSession.update({
        status: 'ended',
        ended_at: new Date(),
        duration: duration || Math.floor((new Date() - callSession.started_at) / 1000)
      });

      // Notify other participant
      const targetUserId = currentUser.id === callSession.initiator_id ? 
        callSession.participant_id : callSession.initiator_id;

      socket.to(`user_${targetUserId}`).emit('call_ended', {
        callId: callId,
        endedBy: currentUser.toJSON(),
        duration: callSession.duration
      });

      socket.emit('call_ended', {
        callId: callId,
        duration: callSession.duration
      });

      currentCall = null;

    } catch (error) {
      console.error('Call end error:', error);
      socket.emit('call_error', { message: 'Failed to end call' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    if (currentUser && currentCall) {
      try {
        // End any active call
        await CallSession.update(
          {
            status: 'ended',
            ended_at: new Date()
          },
          {
            where: {
              id: currentCall.id,
              status: 'connected'
            }
          }
        );

        // Notify other participant
        const targetUserId = currentUser.id === currentCall.initiator_id ? 
          currentCall.participant_id : currentCall.initiator_id;

        socket.to(`user_${targetUserId}`).emit('call_ended', {
          callId: currentCall.id,
          reason: 'disconnected'
        });

        console.log(`Call ended due to disconnect for user ${currentUser.name}`);
      } catch (error) {
        console.error('Error handling call disconnect:', error);
      }
    }
  });
};

module.exports = callSocket;
