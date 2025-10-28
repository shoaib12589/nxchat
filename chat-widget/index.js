(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiUrl: 'http://localhost:3001/api',
    socketUrl: 'http://localhost:3001',
    tenantId: null, // Will be set dynamically
    theme: {
      primaryColor: '#007bff',
      position: 'bottom-right',
      welcomeMessage: 'Hello! How can we help you today?'
    },
    features: {
      aiEnabled: true,
      audioEnabled: false,
      videoEnabled: false,
      fileUploadEnabled: true
    }
  };

  // Widget state
  let isOpen = false;
  let isConnected = false;
  let currentChat = null;
  let socket = null;
  let messages = [];
  let typingTimeout = null;

  // DOM elements
  let widgetContainer = null;
  let chatContainer = null;
  let messageContainer = null;
  let inputField = null;
  let sendButton = null;
  let toggleButton = null;

  // Initialize widget
  function initWidget(tenantId, customConfig = {}) {
    CONFIG.tenantId = tenantId;
    Object.assign(CONFIG.theme, customConfig.theme || {});
    Object.assign(CONFIG.features, customConfig.features || {});

    createWidgetHTML();
    attachEventListeners();
    loadChatHistory();
    
    console.log('NxChat Widget initialized for tenant:', tenantId);
  }

  // Create widget HTML structure
  function createWidgetHTML() {
    // Create main container
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'nxchat-widget';
    widgetContainer.style.cssText = `
      position: fixed;
      ${CONFIG.theme.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      ${CONFIG.theme.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create toggle button
    toggleButton = document.createElement('div');
    toggleButton.id = 'nxchat-toggle';
    toggleButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `;
    toggleButton.style.cssText = `
      width: 60px;
      height: 60px;
      background-color: ${CONFIG.theme.primaryColor};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
    `;

    // Create chat container
    chatContainer = document.createElement('div');
    chatContainer.id = 'nxchat-container';
    chatContainer.style.cssText = `
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      display: none;
      flex-direction: column;
      overflow: hidden;
      position: absolute;
      ${CONFIG.theme.position.includes('right') ? 'right: 0;' : 'left: 0;'}
      ${CONFIG.theme.position.includes('bottom') ? 'bottom: 80px;' : 'top: 80px;'}
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      background-color: ${CONFIG.theme.primaryColor};
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
    header.innerHTML = `
      <div>
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Live Chat</h3>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">We're online</p>
      </div>
      <button id="nxchat-close" style="background: none; border: none; color: white; cursor: pointer; padding: 4px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    // Create messages container
    messageContainer = document.createElement('div');
    messageContainer.id = 'nxchat-messages';
    messageContainer.style.cssText = `
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f8f9fa;
    `;

    // Create welcome message
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'nxchat-message nxchat-message-system';
    welcomeMessage.innerHTML = `
      <div style="background: white; padding: 12px; border-radius: 8px; margin-bottom: 8px; text-align: center; color: #666;">
        ${CONFIG.theme.welcomeMessage}
      </div>
    `;
    messageContainer.appendChild(welcomeMessage);

    // Create input area
    const inputArea = document.createElement('div');
    inputArea.style.cssText = `
      padding: 16px;
      background: white;
      border-top: 1px solid #e9ecef;
      display: flex;
      gap: 8px;
    `;

    inputField = document.createElement('input');
    inputField.id = 'nxchat-input';
    inputField.type = 'text';
    inputField.placeholder = 'Type your message...';
    inputField.style.cssText = `
      flex: 1;
      padding: 12px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      outline: none;
      font-size: 14px;
    `;

    sendButton = document.createElement('button');
    sendButton.id = 'nxchat-send';
    sendButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22,2 15,22 11,13 2,9"></polygon>
      </svg>
    `;
    sendButton.style.cssText = `
      background-color: ${CONFIG.theme.primaryColor};
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    inputArea.appendChild(inputField);
    inputArea.appendChild(sendButton);

    // Assemble chat container
    chatContainer.appendChild(header);
    chatContainer.appendChild(messageContainer);
    chatContainer.appendChild(inputArea);

    // Assemble widget
    widgetContainer.appendChild(toggleButton);
    widgetContainer.appendChild(chatContainer);

    // Add to page
    document.body.appendChild(widgetContainer);
  }

  // Attach event listeners
  function attachEventListeners() {
    // Toggle chat
    toggleButton.addEventListener('click', toggleChat);
    
    // Close chat
    document.getElementById('nxchat-close').addEventListener('click', closeChat);
    
    // Send message
    sendButton.addEventListener('click', sendMessage);
    
    // Enter key to send
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    // Typing indicator
    inputField.addEventListener('input', handleTyping);
  }

  // Toggle chat visibility
  function toggleChat() {
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  }

  // Open chat
  function openChat() {
    isOpen = true;
    chatContainer.style.display = 'flex';
    toggleButton.style.display = 'none';
    inputField.focus();
    
    // Connect to socket if not connected
    if (!isConnected) {
      connectSocket();
    }
  }

  // Close chat
  function closeChat() {
    isOpen = false;
    chatContainer.style.display = 'none';
    toggleButton.style.display = 'flex';
  }

  // Connect to Socket.io
  function connectSocket() {
    if (typeof io === 'undefined') {
      console.error('Socket.io not loaded');
      return;
    }

    socket = io(CONFIG.socketUrl, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Connected to chat server');
      isConnected = true;
      
      // Authenticate as customer
      socket.emit('authenticate', {
        token: 'customer_token' // This would be generated by the backend
      });
    });

    socket.on('authenticated', (data) => {
      console.log('Authenticated:', data);
    });

    socket.on('new_message', (data) => {
      addMessage(data.message, 'received');
    });

    socket.on('user_typing', (data) => {
      showTypingIndicator(data.user, data.isTyping);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      isConnected = false;
    });
  }

  // Send message
  function sendMessage() {
    const message = inputField.value.trim();
    if (!message) return;

    // Add message to UI
    addMessage({
      message: message,
      sender_type: 'customer',
      created_at: new Date().toISOString()
    }, 'sent');

    // Send via socket
    if (socket && isConnected) {
      socket.emit('send_message', {
        message: message,
        messageType: 'text'
      });
    }

    // Clear input
    inputField.value = '';
  }

  // Add message to UI
  function addMessage(messageData, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `nxchat-message nxchat-message-${type}`;
    
    const isReceived = type === 'received';
    const senderName = messageData.sender_type === 'ai' ? 'AI Assistant' : 
                      messageData.sender_type === 'agent' ? 'Agent' : 'You';
    
    messageDiv.innerHTML = `
      <div style="
        background: ${isReceived ? '#e9ecef' : CONFIG.theme.primaryColor};
        color: ${isReceived ? '#333' : 'white'};
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 8px;
        max-width: 80%;
        ${isReceived ? 'margin-right: auto;' : 'margin-left: auto;'}
        word-wrap: break-word;
      ">
        ${messageData.message}
      </div>
      <div style="
        font-size: 11px;
        color: #666;
        margin-bottom: 4px;
        ${isReceived ? 'text-align: left;' : 'text-align: right;'}
      ">
        ${senderName} • ${formatTime(messageData.created_at)}
      </div>
    `;

    messageContainer.appendChild(messageDiv);
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // Store message
    messages.push({
      ...messageData,
      type: type
    });
  }

  // Show typing indicator
  function showTypingIndicator(user, isTyping) {
    let indicator = document.getElementById('nxchat-typing');
    
    if (isTyping) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'nxchat-typing';
        indicator.innerHTML = `
          <div style="
            background: #e9ecef;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            color: #666;
            font-style: italic;
          ">
            ${user.name} is typing...
          </div>
        `;
        messageContainer.appendChild(indicator);
      }
    } else {
      if (indicator) {
        indicator.remove();
      }
    }
  }

  // Handle typing
  function handleTyping() {
    if (socket && isConnected) {
      socket.emit('typing_start');
      
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit('typing_stop');
      }, 1000);
    }
  }

  // Format time
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Load chat history from localStorage
  function loadChatHistory() {
    const history = localStorage.getItem(`nxchat_history_${CONFIG.tenantId}`);
    if (history) {
      try {
        const parsedHistory = JSON.parse(history);
        parsedHistory.forEach(msg => {
          addMessage(msg, msg.type);
        });
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    }
  }

  // Save chat history to localStorage
  function saveChatHistory() {
    localStorage.setItem(`nxchat_history_${CONFIG.tenantId}`, JSON.stringify(messages));
  }

  // Auto-save history every 30 seconds
  setInterval(saveChatHistory, 30000);

  // Expose global API
  window.NxChat = {
    init: initWidget,
    open: openChat,
    close: closeChat,
    sendMessage: sendMessage
  };

  // Auto-initialize if tenant ID is provided via data attribute
  const scriptTag = document.currentScript;
  if (scriptTag && scriptTag.dataset.tenantId) {
    initWidget(scriptTag.dataset.tenantId);
  }

})();
