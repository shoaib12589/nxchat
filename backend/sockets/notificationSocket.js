const jwt = require('jsonwebtoken');
const { User, Notification } = require('../models');

const notificationSocket = (io, socket) => {
  let currentUser = null;

  // Get current user from socket (set by centralized auth)
  currentUser = socket.currentUser;

  // Mark notification as read
  socket.on('mark_notification_read', async (data) => {
    try {
      const { notificationId } = data;

      if (!currentUser) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const notification = await Notification.findOne({
        where: {
          id: notificationId,
          user_id: currentUser.id
        }
      });

      if (!notification) {
        socket.emit('error', { message: 'Notification not found' });
        return;
      }

      await notification.update({
        read: true,
        read_at: new Date()
      });

      socket.emit('notification_read', {
        notificationId: notificationId
      });

    } catch (error) {
      console.error('Mark notification read error:', error);
      socket.emit('error', { message: 'Failed to mark notification as read' });
    }
  });

  // Mark all notifications as read
  socket.on('mark_all_notifications_read', async () => {
    try {
      if (!currentUser) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      await Notification.update(
        {
          read: true,
          read_at: new Date()
        },
        {
          where: {
            user_id: currentUser.id,
            read: false
          }
        }
      );

      socket.emit('all_notifications_read');

    } catch (error) {
      console.error('Mark all notifications read error:', error);
      socket.emit('error', { message: 'Failed to mark all notifications as read' });
    }
  });

  // Get notification settings
  socket.on('get_notification_settings', async () => {
    try {
      if (!currentUser) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // This would typically come from AgentSettings
      // For now, return default settings
      const settings = {
        sound: 'default',
        volume: 0.5,
        enabled: true,
        types: {
          new_chat: true,
          new_message: true,
          chat_transfer: true,
          ai_alert: true,
          ticket_assigned: true,
          system_announcement: false
        }
      };

      socket.emit('notification_settings', settings);

    } catch (error) {
      console.error('Get notification settings error:', error);
      socket.emit('error', { message: 'Failed to get notification settings' });
    }
  });

  // Update notification settings
  socket.on('update_notification_settings', async (data) => {
    try {
      const { sound, volume, enabled, types } = data;

      if (!currentUser) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // This would typically update AgentSettings
      // For now, just acknowledge the update
      socket.emit('notification_settings_updated', {
        success: true,
        settings: { sound, volume, enabled, types }
      });

    } catch (error) {
      console.error('Update notification settings error:', error);
      socket.emit('error', { message: 'Failed to update notification settings' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (currentUser) {
      console.log(`User ${currentUser.name} disconnected from notifications`);
    }
  });
};

// Helper function to send notification to user
const sendNotificationToUser = async (io, userId, notificationData) => {
  try {
    const notification = await Notification.create({
      user_id: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      action_url: notificationData.actionUrl,
      metadata: notificationData.metadata || {}
    });

    // Send to user's socket if connected
    io.to(`user_${userId}`).emit('new_notification', {
      notification: notification.toJSON()
    });

    return notification;
  } catch (error) {
    console.error('Error sending notification to user:', error);
    throw error;
  }
};

// Helper function to send notification to tenant
const sendNotificationToTenant = async (io, tenantId, notificationData) => {
  try {
    const { User } = require('../models');
    
    // Get all users in the tenant
    const users = await User.findAll({
      where: {
        tenant_id: tenantId,
        status: 'active'
      }
    });

    const notifications = [];
    for (const user of users) {
      const notification = await Notification.create({
        user_id: user.id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        action_url: notificationData.actionUrl,
        metadata: notificationData.metadata || {}
      });

      notifications.push(notification);

      // Send to user's socket if connected
      io.to(`user_${user.id}`).emit('new_notification', {
        notification: notification.toJSON()
      });
    }

    return notifications;
  } catch (error) {
    console.error('Error sending notification to tenant:', error);
    throw error;
  }
};

module.exports = {
  notificationSocket,
  sendNotificationToUser,
  sendNotificationToTenant
};
