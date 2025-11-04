const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const { cache, redis } = require('../config/redis');

class RedisPubSubService {
  constructor() {
    this.publisher = null;
    this.subscriber = null;
    this.io = null;
  }

  /**
   * Initialize Redis Pub/Sub for Socket.io
   * @param {SocketIO.Server} io - Socket.io server instance
   */
  async initialize(io) {
    try {
      if (!redis || redis.status !== 'ready') {
        console.warn('Redis not connected, skipping Pub/Sub initialization');
        return null;
      }

      // Create Redis clients for adapter
      // ioredis supports duplicate() for creating a new client with same config
      this.publisher = redis;
      this.subscriber = redis.duplicate();

      // For ioredis, duplicate() creates a new client that needs to be connected
      if (this.subscriber.status !== 'ready') {
        await this.subscriber.connect();
      }

      // Create adapter for Socket.io
      io.adapter(createAdapter(this.publisher, this.subscriber));
      
      this.io = io;
      console.log('✅ Redis Pub/Sub adapter initialized for Socket.io');

      return true;
    } catch (error) {
      console.error('Error initializing Redis Pub/Sub:', error);
      return null;
    }
  }

  /**
   * Publish message to Redis channel
   * @param {string} channel - Channel name
   * @param {any} message - Message data
   */
  async publish(channel, message) {
    try {
      if (!this.publisher) {
        console.warn('Redis publisher not initialized');
        return false;
      }

      await this.publisher.publish(channel, JSON.stringify(message));
      console.log(`📤 Published to channel: ${channel}`);
      return true;
    } catch (error) {
      console.error('Error publishing to channel:', error);
      return false;
    }
  }

  /**
   * Subscribe to Redis channel
   * @param {string} channel - Channel name
   * @param {Function} callback - Callback function
   */
  async subscribe(channel, callback) {
    try {
      if (!this.subscriber) {
        console.warn('Redis subscriber not initialized');
        return false;
      }

      await this.subscriber.subscribe(channel, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          console.error('Error parsing message from channel:', error);
        }
      });

      console.log(`📥 Subscribed to channel: ${channel}`);
      return true;
    } catch (error) {
      console.error('Error subscribing to channel:', error);
      return false;
    }
  }

  /**
   * Broadcast message to all clients in a chat
   * @param {number} chatId - Chat ID
   * @param {string} event - Socket event name
   * @param {any} data - Message data
   */
  async broadcastToChat(chatId, event, data) {
    try {
      const channel = `chat:${chatId}`;
      await this.publish(channel, { event, data });
      console.log(`📡 Broadcast to chat:${chatId}`);
      return true;
    } catch (error) {
      console.error('Error broadcasting to chat:', error);
      return false;
    }
  }

  /**
   * Broadcast message to all clients in a tenant
   * @param {number} tenantId - Tenant ID
   * @param {string} event - Socket event name
   * @param {any} data - Message data
   */
  async broadcastToTenant(tenantId, event, data) {
    try {
      const channel = `tenant:${tenantId}`;
      await this.publish(channel, { event, data });
      console.log(`📡 Broadcast to tenant:${tenantId}`);
      return true;
    } catch (error) {
      console.error('Error broadcasting to tenant:', error);
      return false;
    }
  }

  /**
   * Track user presence in Redis
   * @param {number} userId - User ID
   * @param {number} tenantId - Tenant ID
   * @param {string} role - User role
   */
  async setUserPresence(userId, tenantId, role) {
    try {
      const key = role === 'agent' ? `presence:agents:${tenantId}` : `presence:visitors:${tenantId}`;
      
      await cache.set(key, userId, 30); // 30 second TTL
      console.log(`👤 Set presence: ${role} ${userId} in tenant ${tenantId}`);
      return true;
    } catch (error) {
      console.error('Error setting presence:', error);
      return false;
    }
  }

  /**
   * Get online users in a tenant
   * @param {number} tenantId - Tenant ID
   * @param {string} role - User role (agent or visitor)
   */
  async getOnlineUsers(tenantId, role) {
    try {
      const key = role === 'agent' ? `presence:agents:${tenantId}` : `presence:visitors:${tenantId}`;
      const users = await redis.smembers(key);
      return users;
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      console.log('✅ Redis Pub/Sub cleanup complete');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

module.exports = new RedisPubSubService();

