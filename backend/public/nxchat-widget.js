(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiUrl: null, // Will be set dynamically
    socketUrl: null, // Will be set dynamically
    tenantId: null,
    settings: null,
    theme: {
      primaryColor: '#007bff',
      position: 'bottom-right',
      welcomeMessage: 'Talk with NxChat!',
      offlineMessage: 'We are currently offline. Please leave a message and we will get back to you soon.'
    },
    features: {
      aiEnabled: true,
      audioEnabled: false,
      videoEnabled: false,
      fileUploadEnabled: true
    },
    notifications: {
      soundEnabled: true,
      soundFile: 'default',
      volume: 0.5,
      autoMaximizeOnMessage: true // Auto-maximize widget when new message arrives while minimized
    },
    ai: {
      agentName: 'NxChat Assistant',
      agentLogo: '',
      systemMessage: 'You are a helpful AI assistant for NxChat customer support. Be friendly, professional, and helpful. Always follow the super admin commands and guidelines.'
    }
  };

  // Dynamic URL detection
  function detectBaseUrl() {
    // Try to get the base URL from the current script
    const scripts = document.getElementsByTagName('script');
    let baseUrl = null;
    
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script.src && script.src.includes('/widget/snippet.js')) {
        // Extract base URL from script src
        const url = new URL(script.src);
        baseUrl = url.origin;
        break;
      }
    }
    
    // Fallback: use current page origin
    if (!baseUrl) {
      baseUrl = window.location.origin;
    }
    
    return baseUrl;
  }

  // Initialize URLs dynamically
  function initializeUrls() {
    const baseUrl = detectBaseUrl();
    CONFIG.apiUrl = baseUrl + '/api';
    CONFIG.socketUrl = baseUrl;
    
    console.log('NxChat URLs initialized:', {
      apiUrl: CONFIG.apiUrl,
      socketUrl: CONFIG.socketUrl
    });
  }

  // Widget state
  let isOpen = false;
  let isConnected = false;
  let currentChat = null;
  let socket = null;
  let messages = [];
  let socketListenersRegistered = false;
  let typingTimeout = null;
  let aiDisabled = false; // Start with AI enabled, disable only when agent joins
  let agentJoined = false;
  let chatSessionActive = false;
  let agentStatusChecked = false; // Track if we've checked agent status
  let hasOnlineAgents = false; // Track if there are online agents
  let agentResponseTimeout = null;
  let lastVisitorMessageTime = null;
  let widgetMinimized = false;

  // Visitor tracking
  let visitorId = null;
  let sessionId = generateSessionId();
  let lastActivity = Date.now();
  let sessionStart = Date.now();
  let sessionDuration = 0;
  let isTyping = false;
  let settingsLoaded = false;
  let currentTab = 'chat'; // 'chat' or 'helpdesk'

  // DOM elements
  let widgetContainer = null;
  let chatContainer = null;
  let messageContainer = null;
  let inputField = null;
  let sendButton = null;
  let toggleButton = null;

  // Initialize widget
  async function initWidget(tenantId) {
    // Initialize URLs first
    initializeUrls();
    
    CONFIG.tenantId = tenantId;
    
    // Load widget settings from backend
    await loadWidgetSettings();
    
    createWidgetHTML();
    attachEventListeners();
    
    // Track widget initialization
    trackVisitorActivity('widget_init', {
      widget_version: '1.0.0',
      tenant_id: tenantId
    });
    
    // Initialize visitor tracking first
    initVisitorTracking();
    
    // Initialize socket connection
    initSocket();
    
    // Wait for socket connection and visitor room join before initializing session
    await waitForSocketConnection();
    
    // Set up periodic check to ensure visitor room is joined
    const roomJoinInterval = setInterval(() => {
      if (visitorId && socket && socket.connected) {
        ensureVisitorRoomJoined();
        // Clear interval once room is joined successfully
        clearInterval(roomJoinInterval);
      }
    }, 2000); // Check every 2 seconds
    
    // Clear interval after 30 seconds to avoid infinite checking
    setTimeout(() => {
      clearInterval(roomJoinInterval);
    }, 30000);
    
    // Determine visitor session status and initialize appropriate flow
    await initializeVisitorSession();
    
    // Fire loaded event
    window.dispatchEvent(new CustomEvent('nxchat-widget-loaded', { detail: { tenantId } }));
  }

  // Initialize socket connection
  function initSocket() {
    console.log('initSocket called, checking for Socket.io...');
    console.log('typeof io:', typeof io);
    console.log('CONFIG.socketUrl:', CONFIG.socketUrl);
    
    // Prevent duplicate socket initialization
    if (socket && socket.connected) {
      console.log('Socket already initialized and connected, skipping...');
      return;
    }
    
    // Prevent duplicate event listener registration
    if (socketListenersRegistered) {
      console.log('Socket event listeners already registered, skipping...');
      return;
    }
    
    // Check if socket.io is available
    if (typeof io !== 'undefined') {
      console.log('Socket.io is available, initializing connection to:', CONFIG.socketUrl);
      socket = io(CONFIG.socketUrl);
    
    socket.on('connect', () => {
      console.log('Widget connected to server');
      isConnected = true;
      
      // Join visitor-specific room for targeted messaging
      joinVisitorRoomIfReady();
      
      // Also try to join room after a short delay in case visitor ID is set later
      setTimeout(() => {
        joinVisitorRoomIfReady();
      }, 1000);
    });
    
    socket.on('disconnect', () => {
      console.log('Widget disconnected from server');
      isConnected = false;
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    // Handle visitor room join confirmation
    socket.on('visitor_room_joined', (data) => {
      console.log('Visitor room joined successfully, ready to receive messages');
    });
    
    // Listen for agent join event
    socket.on('agent:join', (data) => {
      if (data.visitorId === visitorId) {
        // Always show agent joined message
        addMessage(`${data.agentName} joined the chat.`, 'system');
        
        agentJoined = true;
        aiDisabled = true;
        chatSessionActive = true;
        agentStatusChecked = true;
        hasOnlineAgents = true;
        
        // Update UI to show agent is handling the chat
        updateChatHeader('Agent Connected');
        
        // Clear any existing timeout since agent just joined
        clearAgentResponseTimeout();
      }
    });
    
    // Listen for agent leave event
    socket.on('agent:leave', (data) => {
      if (data.visitorId === visitorId) {
        agentJoined = false;
        aiDisabled = false;
        chatSessionActive = false;
        agentStatusChecked = true;
        
        // Re-check agent availability when agent leaves
        checkAgentAvailability();
        
        // Show agent left message with agent name if available
        const agentName = data.agentName || 'Agent';
        addMessage(`${agentName} left the chat. AI responses are now enabled.`, 'system');
        
        // Update UI to show AI is handling the chat
        updateChatHeader('AI Assistant');
        
        // Clear timeout since agent left
        clearAgentResponseTimeout();
      }
    });

    // Listen for agent messages
    socket.on('agent:message', (data) => {
      if (data.visitorId === visitorId) {
        addMessage(data.message, 'agent');
        
        // Play notification sound for new agent message
        playNotificationSound();
        
        // Clear agent response timeout since agent responded
        clearAgentResponseTimeout();
      }
    });
    
    // Mark event listeners as registered
    socketListenersRegistered = true;
    } else {
      console.warn('Socket.io not available, loading client library...');
      loadSocketIOClient();
    }
  }
  
  // Load Socket.io client library dynamically
  function loadSocketIOClient() {
    console.log('Loading Socket.io client from:', `${CONFIG.socketUrl}/socket.io/socket.io.js`);
    
    // Check if Socket.io script is already loaded
    if (document.querySelector('script[src*="socket.io"]')) {
      console.log('Socket.io script already exists, retrying initialization...');
      setTimeout(() => {
        if (typeof io !== 'undefined') {
          console.log('Socket.io is now available, initializing...');
          initSocket();
        } else {
          console.log('Socket.io still not available after retry');
        }
      }, 1000);
      return;
    }
    
    // Prevent duplicate script loading
    if (socketListenersRegistered) {
      console.log('Socket already initialized, skipping script loading...');
      return;
    }
    
    // Create and load Socket.io client script
    const script = document.createElement('script');
    script.src = `${CONFIG.socketUrl}/socket.io/socket.io.js`;
    script.async = true;
    
    script.onload = function() {
      console.log('Socket.io client loaded successfully');
      // Check if io is available
      if (typeof io !== 'undefined') {
        console.log('Socket.io object is available, initializing...');
        setTimeout(initSocket, 100); // Small delay to ensure io is available
      } else {
        console.error('Socket.io script loaded but io object not available');
      }
    };
    
    script.onerror = function(error) {
      console.error('Failed to load Socket.io client library:', error);
      console.error('Script src was:', script.src);
      console.warn('Real-time features will be disabled');
    };
    
    document.head.appendChild(script);
    console.log('Socket.io script element added to head');
  }

  // Update chat header
  function updateChatHeader(title) {
    const header = document.querySelector('.nxchat-header h3');
    if (header) {
      header.textContent = title;
    }
  }

  // Function to play notification sound
  function playNotificationSound() {
    if (!CONFIG.notifications.soundEnabled) return;
    
    try {
      // Create audio element
      const audio = new Audio();
      
      // Set sound file based on configuration
      let soundFile = '/sounds/notification-default.mp3'; // Default sound
      
      switch (CONFIG.notifications.soundFile) {
        case 'chime':
          soundFile = '/sounds/notification-chime.mp3';
          break;
        case 'ding':
          soundFile = '/sounds/notification-ding.mp3';
          break;
        case 'pop':
          soundFile = '/sounds/notification-pop.mp3';
          break;
        case 'bell':
          soundFile = '/sounds/notification-bell.mp3';
          break;
        default:
          soundFile = '/sounds/notification-default.mp3';
      }
      
      audio.src = soundFile;
      audio.volume = CONFIG.notifications.volume;
      
      // Play the sound
      audio.play().catch(error => {
        console.warn('Could not play notification sound:', error);
        // Fallback: try to play a simple beep using Web Audio API
        playFallbackSound();
      });
      
    } catch (error) {
      console.warn('Error playing notification sound:', error);
      playFallbackSound();
    }
  }

  // Fallback sound using Web Audio API
  function playFallbackSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(CONFIG.notifications.volume * 0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Fallback sound also failed:', error);
    }
  }

  // Wait for socket connection and visitor room join
  async function waitForSocketConnection() {
    return new Promise((resolve) => {
      if (socket && socket.connected) {
        // Socket already connected, try to join room
        ensureVisitorRoomJoined();
        resolve();
      } else {
        // Wait for socket connection
        const checkConnection = () => {
          if (socket && socket.connected) {
            ensureVisitorRoomJoined();
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      }
    });
  }

  // Initialize visitor session based on their status
  async function initializeVisitorSession() {
    try {
      console.log('Initializing visitor session for visitor:', visitorId);
      
      // Check visitor session status
      const response = await fetch(`${CONFIG.apiUrl}/widget/visitor/session-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: visitorId,
          tenantId: CONFIG.tenantId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const sessionData = data.data;
        console.log('Visitor session status:', sessionData);
        
        // Set agent status as checked
        agentStatusChecked = true;
        
        if (sessionData.isNewVisitor) {
          // NEW VISITOR - Start with AI
          console.log('New visitor detected - starting with AI');
          await initializeNewVisitorSession();
        } else {
          // EXISTING VISITOR - Check session status
          switch (sessionData.sessionStatus) {
            case 'active_with_agent':
              // OLD VISITOR with active agent session - reconnect to agent
              console.log('Old visitor with active agent session - reconnecting to agent');
              await reconnectToAgent(sessionData.assignedAgentId);
              break;
              
            case 'ended_with_agent':
              // OLD VISITOR with ended agent session - start fresh with AI
              console.log('Old visitor with ended agent session - starting fresh with AI');
              await initializeNewVisitorSession();
              break;
              
            case 'active_with_ai':
              // OLD VISITOR with active AI session - continue with AI
              console.log('Old visitor with active AI session - continuing with AI');
              await initializeAISession();
              break;
              
            case 'new':
            default:
              // OLD VISITOR with no recent activity - start fresh with AI
              console.log('Old visitor with no recent activity - starting fresh with AI');
              await initializeNewVisitorSession();
              break;
          }
        }
      } else {
        console.error('Failed to check visitor session status:', data.message);
        // Fallback to new visitor flow
        await initializeNewVisitorSession();
      }
    } catch (error) {
      console.error('Error initializing visitor session:', error);
      // Fallback to new visitor flow
      await initializeNewVisitorSession();
    }
  }

  // Initialize new visitor session (AI-first)
  async function initializeNewVisitorSession() {
    console.log('Initializing new visitor session with AI');
    
    // Reset all states for new session
    agentJoined = false;
    aiDisabled = false;
    chatSessionActive = false;
    hasOnlineAgents = false;
    
    // Enable AI
    if (CONFIG.features.aiEnabled) {
      aiDisabled = false;
    }
    
    // Update UI to show AI is handling the chat
    updateChatHeader('AI Assistant');
    
    // Load chat history (will be empty for new visitors)
    loadChatHistory();
    
    // Check agent availability in background (for future transfers)
    await checkAgentAvailability();
  }

  // Initialize AI session (for returning visitors continuing with AI)
  async function initializeAISession() {
    console.log('Initializing AI session for returning visitor');
    
    // Set states for AI session
    agentJoined = false;
    aiDisabled = false;
    chatSessionActive = true; // Mark as active since it's continuing
    
    // Update UI to show AI is handling the chat
    updateChatHeader('AI Assistant');
    
    // Load existing chat history
    loadChatHistory();
    
    // Check agent availability in background
    await checkAgentAvailability();
  }

  // Reconnect to existing agent
  async function reconnectToAgent(assignedAgentId) {
    console.log('Reconnecting to assigned agent:', assignedAgentId);
    
    // Set states for agent session
    agentJoined = true;
    aiDisabled = true;
    chatSessionActive = true;
    
    // Update UI to show agent is handling the chat
    updateChatHeader('Agent Connected');
    
    // Load existing chat history
    loadChatHistory();
    
    // Clear any existing timeout since agent is already connected
    clearAgentResponseTimeout();
    
    // Add reconnection message
    addMessage('Welcome back!', 'system');
  }

  // Check agent availability in background
  async function checkAgentAvailability() {
    try {
      console.log('Checking agent availability for tenant:', CONFIG.tenantId);
      const response = await fetch(`${CONFIG.apiUrl}/widget/agent-availability/${CONFIG.tenantId}`);
      const data = await response.json();
      
      if (data.success) {
        hasOnlineAgents = data.data.hasOnlineAgents;
        
        console.log('Agent availability check result:', {
          hasOnlineAgents: hasOnlineAgents,
          onlineAgentCount: data.data.onlineAgentCount
        });
      } else {
        console.error('Failed to check agent availability:', data.message);
        hasOnlineAgents = false;
      }
    } catch (error) {
      console.error('Error checking agent availability:', error);
      hasOnlineAgents = false;
    }
  }

  // Load widget settings
  async function loadWidgetSettings() {
    try {
      const response = await fetch(`${CONFIG.apiUrl}/widget/settings/${CONFIG.tenantId}`);
      const data = await response.json();
      
      if (data.success) {
        CONFIG.settings = data.data;
        CONFIG.theme.primaryColor = data.data.theme_color || CONFIG.theme.primaryColor;
        CONFIG.theme.position = data.data.position || CONFIG.theme.position;
        CONFIG.theme.welcomeMessage = data.data.welcome_message || CONFIG.theme.welcomeMessage;
        CONFIG.theme.offlineMessage = data.data.offline_message || CONFIG.theme.offlineMessage;
        CONFIG.features.aiEnabled = data.data.ai_enabled || CONFIG.features.aiEnabled;
        CONFIG.features.audioEnabled = data.data.enable_audio || CONFIG.features.audioEnabled;
        CONFIG.features.videoEnabled = data.data.enable_video || CONFIG.features.videoEnabled;
        CONFIG.features.fileUploadEnabled = data.data.enable_file_upload || CONFIG.features.fileUploadEnabled;
        
        // Load notification settings
        CONFIG.notifications.soundEnabled = data.data.notification_sound_enabled !== false;
        CONFIG.notifications.soundFile = data.data.notification_sound_file || 'default';
        CONFIG.notifications.volume = data.data.notification_volume || 0.5;
        CONFIG.notifications.autoMaximizeOnMessage = data.data.auto_maximize_on_message !== false;
        
        // Load AI settings
        CONFIG.ai.agentName = data.data.ai_agent_name || CONFIG.ai.agentName;
        CONFIG.ai.agentLogo = data.data.ai_agent_logo || CONFIG.ai.agentLogo;
        CONFIG.ai.systemMessage = data.data.ai_system_message || CONFIG.ai.systemMessage;
        
        // Apply custom CSS if provided
        if (data.data.custom_css) {
          const style = document.createElement('style');
          style.textContent = data.data.custom_css;
          document.head.appendChild(style);
        }
        
        // Execute custom JS if provided
        if (data.data.custom_js) {
          try {
            eval(data.data.custom_js);
          } catch (e) {
            console.error('Error executing custom JS:', e);
          }
        }
        
        settingsLoaded = true;
      }
    } catch (error) {
      console.error('Failed to load widget settings:', error);
      settingsLoaded = true; // Continue with default settings
    }
  }

  // Create widget HTML
  function createWidgetHTML() {
    // Create main container
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'nxchat-widget';
    widgetContainer.className = 'nxchat-widget';
    widgetContainer.style.cssText = `
      position: fixed;
      ${CONFIG.theme.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      ${CONFIG.theme.position.includes('bottom') ? 'bottom: 10px;' : 'top: 10px;'}
      width: 350px;
      height: 600px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      z-index: 10002;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: none;
      flex-direction: column;
      overflow: hidden;
    `;

    // Create toggle button
    toggleButton = document.createElement('div');
    toggleButton.className = 'nxchat-toggle';
    toggleButton.style.cssText = `
      position: fixed;
      ${CONFIG.theme.position.includes('right') ? 'right: 30px;' : 'left: 30px;'}
      ${CONFIG.theme.position.includes('bottom') ? 'bottom: 15px;' : 'top: 15px;'}
      width: 56px;
      height: 56px;
      background: ${CONFIG.theme.primaryColor};
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      z-index: 10001;
      transition: all 0.3s ease;
    `;

    // Add chat icon to toggle button
    updateToggleButton();

    // Create chat container
    chatContainer = document.createElement('div');
    chatContainer.className = 'nxchat-container';
    chatContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100%;
      background: white;
    `;

    // Create header
    const header = createHeader();
    chatContainer.appendChild(header);

    // Create tab navigation
    const tabNav = createTabNavigation();
    chatContainer.appendChild(tabNav);

    // Create message container
    messageContainer = document.createElement('div');
    messageContainer.className = 'nxchat-messages';
    messageContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: white;
      min-height: 0;
    `;

    // Assemble widget
    chatContainer.appendChild(messageContainer);
    
    // Create input area
    const inputArea = createInputArea();
    chatContainer.appendChild(inputArea);

    widgetContainer.appendChild(chatContainer);

    // Add to page
    document.body.appendChild(widgetContainer);
    document.body.appendChild(toggleButton);

    // Add CSS styles
    addStyles();
  }

  // Create header
  function createHeader() {
    const header = document.createElement('div');
    header.className = 'nxchat-header';
    header.style.cssText = `
      background: ${CONFIG.theme.primaryColor};
      padding: 20px 16px 16px;
      color: white;
      position: relative;
    `;

    // X button for minimizing
    const minimizeButton = document.createElement('div');
    minimizeButton.className = 'nxchat-minimize-btn';
    minimizeButton.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      width: 24px;
      height: 24px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease;
    `;
    minimizeButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    `;
    
    // Add hover effect
    minimizeButton.addEventListener('mouseenter', () => {
      minimizeButton.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    minimizeButton.addEventListener('mouseleave', () => {
      minimizeButton.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    
    // Add click handler to minimize widget
    minimizeButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      toggleWidget();
    });

    // Menu button for options
    const menuButton = document.createElement('div');
    menuButton.className = 'nxchat-menu-btn';
    menuButton.style.cssText = `
      position: absolute;
      top: 12px;
      right: 50px;
      width: 24px;
      height: 24px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease;
    `;
    menuButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>
    `;
    
    // Add hover effect for menu button
    menuButton.addEventListener('mouseenter', () => {
      menuButton.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    menuButton.addEventListener('mouseleave', () => {
      menuButton.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    
    // Add click handler to toggle menu
    menuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Team avatars section
    const teamSection = document.createElement('div');
    teamSection.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px;';

    // Create team avatars
    const avatars = ['👩', '👨', '👩', '💬'];
    avatars.forEach((avatar, index) => {
      const avatarDiv = document.createElement('div');
      avatarDiv.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${index === 3 ? CONFIG.theme.primaryColor : 'rgba(255, 255, 255, 0.2)'};
        border: ${index === 3 ? '2px solid white' : 'none'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      `;
      avatarDiv.textContent = avatar;
      teamSection.appendChild(avatarDiv);
    });

    // Welcome message
    const welcomeDiv = document.createElement('div');
    welcomeDiv.style.cssText = 'text-align: center; margin-bottom: 8px;';
    welcomeDiv.innerHTML = `${CONFIG.theme.welcomeMessage} 😊`;

    // Response time indicator
    const responseTimeDiv = document.createElement('div');
    responseTimeDiv.style.cssText = 'text-align: center; font-size: 12px; opacity: 0.8; display: flex; align-items: center; justify-content: center; gap: 4px;';
    responseTimeDiv.innerHTML = `
      <div style="width: 6px; height: 6px; background: #4CAF50; border-radius: 50%;"></div>
      Team replies Asap
    `;

    header.appendChild(teamSection);
    header.appendChild(welcomeDiv);
    header.appendChild(responseTimeDiv);
    header.appendChild(menuButton);
    header.appendChild(minimizeButton);

    return header;
  }

  // Create tab navigation
  function createTabNavigation() {
    const tabNav = document.createElement('div');
    tabNav.className = 'nxchat-tabs';
    tabNav.style.cssText = `
      background: ${CONFIG.theme.primaryColor};
      display: flex;
      justify-content: center;
      padding: 0 16px 8px;
    `;

    const chatTab = document.createElement('button');
    chatTab.className = 'nxchat-tab active';
    chatTab.dataset.tab = 'chat';
    chatTab.style.cssText = `
      background: none;
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
    `;
    chatTab.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
      </svg>
      Chat
    `;

    const helpdeskTab = document.createElement('button');
    helpdeskTab.className = 'nxchat-tab';
    helpdeskTab.dataset.tab = 'helpdesk';
    helpdeskTab.style.cssText = `
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
    `;
    helpdeskTab.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      Helpdesk
    `;

    tabNav.appendChild(chatTab);
    tabNav.appendChild(helpdeskTab);

    return tabNav;
  }

  // Create input area
  function createInputArea() {
    const inputArea = document.createElement('div');
    inputArea.className = 'nxchat-input-area';
    inputArea.style.cssText = `
      padding: 16px;
      background: white;
      border-top: 1px solid #f0f0f0;
      flex-shrink: 0;
    `;

    // Top row: Input field with send button
    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;';

    inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.placeholder = 'Type your message...';
    inputField.className = 'nxchat-input';
    inputField.style.cssText = `
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e0e0e0;
      border-radius: 24px;
      outline: none;
      font-size: 14px;
      background: #f8f9fa;
    `;

    sendButton = document.createElement('button');
    sendButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg>
    `;
    sendButton.className = 'nxchat-send';
    sendButton.style.cssText = `
      background: #f0f0f0;
      color: #666;
      border: none;
      padding: 8px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
    `;

    inputRow.appendChild(inputField);
    inputRow.appendChild(sendButton);

    // Bottom row: Icons and branding
    const bottomRow = document.createElement('div');
    bottomRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';

    // Left side: Icons
    const iconsDiv = document.createElement('div');
    iconsDiv.style.cssText = 'display: flex; align-items: center; gap: 16px;';

    const emojiButton = document.createElement('button');
    emojiButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
        <line x1="9" y1="9" x2="9.01" y2="9"/>
        <line x1="15" y1="9" x2="15.01" y2="9"/>
      </svg>
    `;
    emojiButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      color: #666;
      border-radius: 4px;
      transition: all 0.2s ease;
    `;

    const attachButton = document.createElement('button');
    attachButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
      </svg>
    `;
    attachButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      color: #666;
      border-radius: 4px;
      transition: all 0.2s ease;
    `;

    const starButton = document.createElement('button');
    starButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
      </svg>
    `;
    starButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      color: #666;
      border-radius: 4px;
      transition: all 0.2s ease;
    `;

    // Add functionality to buttons
    emojiButton.addEventListener('click', () => {
      showEmojiPicker(emojiButton);
    });

    attachButton.addEventListener('click', () => {
      handleFileAttachment();
    });

    starButton.addEventListener('click', () => {
      toggleFavorite();
    });

    // Add hover effects
    [emojiButton, attachButton, starButton].forEach(button => {
      button.addEventListener('mouseenter', () => {
        button.style.background = '#f0f0f0';
        button.style.color = '#333';
      });
      button.addEventListener('mouseleave', () => {
        button.style.background = 'none';
        button.style.color = '#666';
      });
    });

    iconsDiv.appendChild(emojiButton);
    iconsDiv.appendChild(attachButton);
    iconsDiv.appendChild(starButton);

    // Right side: Branding
    const brandingDiv = document.createElement('div');
    brandingDiv.className = 'nxchat-branding';
    brandingDiv.style.cssText = 'display: flex; align-items: center; gap: 4px; font-size: 12px; color: #999;';
    brandingDiv.innerHTML = `
      We run on <div class="nxchat-branding-icon">N</div> NxChat
    `;

    bottomRow.appendChild(iconsDiv);
    bottomRow.appendChild(brandingDiv);

    inputArea.appendChild(inputRow);
    inputArea.appendChild(bottomRow);

    return inputArea;
  }


  // Add CSS styles
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .nxchat-widget * {
        box-sizing: border-box;
      }
      
        .nxchat-widget {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .nxchat-widget.minimizing {
          animation: minimizeWidget 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        
        .nxchat-widget.maximizing {
          animation: maximizeWidget 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        
        .nxchat-toggle {
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation: pulse 2s infinite;
        }
        
        .nxchat-toggle:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          animation: none;
        }
        
        .nxchat-toggle:active {
          transform: scale(0.95);
        }
        
        .nxchat-toggle.clicked {
          animation: bounce 0.6s ease-out;
        }
      
      .nxchat-tab.active {
        background: rgba(255, 255, 255, 0.2) !important;
        color: white !important;
      }
      
        .nxchat-tab:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }
        
        .nxchat-minimize-btn {
          transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .nxchat-minimize-btn:hover {
          transform: scale(1.1) rotate(90deg);
          background: rgba(255, 255, 255, 0.3) !important;
        }
        
        .nxchat-minimize-btn:active {
          transform: scale(0.9) rotate(90deg);
        }
      
      .nxchat-messages {
        scrollbar-width: thin;
        scrollbar-color: #e0e0e0 transparent;
      }
      
      .nxchat-messages::-webkit-scrollbar {
        width: 4px;
      }
      
      .nxchat-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .nxchat-messages::-webkit-scrollbar-thumb {
        background: #e0e0e0;
        border-radius: 2px;
      }
      
      .nxchat-message {
        margin-bottom: 0;
      }
      
      .nxchat-message.system .nxchat-message-bubble {
        background: transparent;
        color: #999;
        text-align: center;
        font-size: 12px;
        margin: 8px auto;
        max-width: 200px;
        padding: 4px 0;
      }
      
      .nxchat-action-button {
        background: #333;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
      }
      
      .nxchat-action-button:hover {
        background: #555;
        transform: translateY(-1px);
      }
      
      .nxchat-typing {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #999;
        font-size: 12px;
        margin-top: 8px;
      }
      
      .nxchat-typing-dots {
        display: flex;
        gap: 2px;
      }
      
      .nxchat-typing-dot {
        width: 4px;
        height: 4px;
        background: #999;
        border-radius: 50%;
        animation: typing 1.4s infinite ease-in-out;
      }
      
      .nxchat-typing-dot:nth-child(1) { animation-delay: -0.32s; }
      .nxchat-typing-dot:nth-child(2) { animation-delay: -0.16s; }
      
      @keyframes typing {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      
      .nxchat-date-separator {
        text-align: center;
        color: #999;
        font-size: 12px;
        margin: 16px 0;
        position: relative;
      }
      
      .nxchat-date-separator::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #e0e0e0;
        z-index: 1;
      }
      
      .nxchat-date-separator span {
        background: white;
        padding: 0 12px;
        position: relative;
        z-index: 2;
      }
      
      .nxchat-branding {
        text-align: right;
        font-size: 11px;
        color: #999;
        margin-top: 8px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
      }
      
      .nxchat-branding-icon {
        width: 12px;
        height: 12px;
        background: ${CONFIG.theme.primaryColor};
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 8px;
        font-weight: bold;
        margin-left: 2px;
      }
      
      
      .nxchat-input:focus {
        border-color: ${CONFIG.theme.primaryColor};
        background: white;
      }
      
      .nxchat-send:hover {
        background: #e0e0e0;
      }
      
      .nxchat-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      @keyframes minimizeWidget {
        0% {
          transform: scale(1) translateY(0);
          opacity: 1;
        }
        50% {
          transform: scale(0.8) translateY(20px);
          opacity: 0.8;
        }
        100% {
          transform: scale(0) translateY(100px);
          opacity: 0;
        }
      }
      
      @keyframes maximizeWidget {
        0% {
          transform: scale(0) translateY(100px);
          opacity: 0;
        }
        30% {
          transform: scale(0.3) translateY(50px);
          opacity: 0.3;
        }
        60% {
          transform: scale(1.1) translateY(-10px);
          opacity: 0.9;
        }
        80% {
          transform: scale(0.95) translateY(5px);
          opacity: 1;
        }
        100% {
          transform: scale(1) translateY(0);
          opacity: 1;
        }
      }
      
      @keyframes slideInUp {
        0% {
          transform: translateY(100px);
          opacity: 0;
        }
        100% {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0, 0, 0);
        }
        40%, 43% {
          transform: translate3d(0, -8px, 0);
        }
        70% {
          transform: translate3d(0, -4px, 0);
        }
        90% {
          transform: translate3d(0, -2px, 0);
        }
      }
      
      @keyframes shake {
        0%, 100% {
          transform: translateX(0);
        }
        10%, 30%, 50%, 70%, 90% {
          transform: translateX(-2px);
        }
        20%, 40%, 60%, 80% {
          transform: translateX(2px);
        }
      }
      
      @keyframes glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
        }
        50% {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.6);
        }
      }
      
      @keyframes slideUpFadeIn {
        0% {
          transform: translateY(10px);
          opacity: 0;
        }
        100% {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .nxchat-menu-popup {
        animation: slideUpFadeIn 0.2s ease-out;
      }
      
      .nxchat-menu-item:hover {
        background-color: #f5f5f5 !important;
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
        }
        50% {
          transform: scale(1.05);
          box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Check if widget should auto-maximize on new message
  function shouldAutoMaximizeOnMessage(type) {
    // Only auto-maximize for incoming messages (not user messages)
    if (type === 'user') return false;
    
    // Check if auto-maximize is enabled
    if (!CONFIG.notifications.autoMaximizeOnMessage) return false;
    
    // Only auto-maximize if widget is currently minimized
    if (isOpen) return false;
    
    // Don't auto-maximize for system messages (like "Agent joined")
    if (type === 'system') return false;
    
    return true;
  }

  // Add message to chat
  function addMessage(content, type = 'bot', options = {}) {
    // Check if we should auto-maximize the widget
    if (shouldAutoMaximizeOnMessage(type)) {
      console.log('Auto-maximizing widget due to new message');
      toggleWidget();
    }
    
    // Prevent duplicate system messages
    if (type === 'system' && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'system' && lastMessage.content === content) {
        console.log('Preventing duplicate system message:', content);
        return;
      }
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `nxchat-message ${type}`;

    if (type === 'system') {
      const bubble = document.createElement('div');
      bubble.className = 'nxchat-message-bubble';
      bubble.innerHTML = content;
      messageDiv.appendChild(bubble);
    } else {
      // Create message container for proper alignment
      const messageContainer = document.createElement('div');
      messageContainer.style.cssText = `
        display: flex;
        flex-direction: ${type === 'user' ? 'row-reverse' : 'row'};
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 16px;
      `;

      // Avatar
      const avatar = document.createElement('div');
      avatar.className = 'nxchat-message-avatar';
      avatar.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
        flex-shrink: 0;
      `;
      
      if (type === 'user') {
        avatar.style.background = CONFIG.theme.primaryColor;
        avatar.style.color = 'white';
        avatar.innerHTML = 'U';
      } else if (type === 'bot') {
        avatar.style.background = '#f0f0f0';
        avatar.style.color = '#666';
        // Use AI agent logo if available, otherwise use default emoji
        if (CONFIG.ai.agentLogo && CONFIG.ai.agentLogo.trim() !== '') {
          avatar.innerHTML = `<img src="${CONFIG.ai.agentLogo}" alt="${CONFIG.ai.agentName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
        } else {
          avatar.innerHTML = '💬';
        }
      } else if (type === 'agent') {
        avatar.style.background = '#28a745';
        avatar.style.color = 'white';
        avatar.innerHTML = 'A';
      }

      // Message content container
      const contentContainer = document.createElement('div');
      contentContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: ${type === 'user' ? 'flex-end' : 'flex-start'};
        max-width: 240px;
      `;

      // Label
      const label = document.createElement('div');
      label.className = 'nxchat-message-label';
      label.style.cssText = `
        font-size: 11px;
        color: #999;
        margin-bottom: 4px;
        font-weight: 500;
        text-align: ${type === 'user' ? 'right' : 'left'};
      `;
      
      if (type === 'user') {
        label.textContent = 'You';
      } else if (type === 'agent') {
        label.textContent = 'Agent';
      } else {
        label.textContent = CONFIG.ai.agentName;
      }

      // Message bubble
      const bubble = document.createElement('div');
      bubble.className = 'nxchat-message-bubble';
      bubble.style.cssText = `
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
        position: relative;
      `;
      
      if (type === 'bot') {
        bubble.style.background = '#f0f0f0';
        bubble.style.color = '#333';
        bubble.style.borderBottomLeftRadius = '4px';
      } else if (type === 'user') {
        bubble.style.background = CONFIG.theme.primaryColor;
        bubble.style.color = 'white';
        bubble.style.borderBottomRightRadius = '4px';
      } else if (type === 'agent') {
        bubble.style.background = '#28a745';
        bubble.style.color = 'white';
        bubble.style.borderBottomLeftRadius = '4px';
      }
      
      bubble.innerHTML = content;

      // Assemble message
      contentContainer.appendChild(label);
      contentContainer.appendChild(bubble);
      
      // Add read receipt for user messages
      if (type === 'user' && options.read) {
        const readReceipt = document.createElement('div');
        readReceipt.style.cssText = 'text-align: right; font-size: 10px; color: #4CAF50; margin-top: 2px;';
        readReceipt.innerHTML = '✓';
        contentContainer.appendChild(readReceipt);
      }

      messageContainer.appendChild(avatar);
      messageContainer.appendChild(contentContainer);
      messageDiv.appendChild(messageContainer);
    }

    messageContainer.appendChild(messageDiv);
    messageContainer.scrollTop = messageContainer.scrollHeight;
    
    // Save message to localStorage for persistence
    saveMessageToHistory(content, type, options);
  }

  // Show emoji picker
  function showEmojiPicker(button) {
    // Simple emoji picker - in a real implementation, you'd use a proper emoji picker library
    const emojis = ['😊', '😄', '😍', '🤔', '😢', '😡', '👍', '👎', '❤️', '🎉', '🔥', '💯'];
    
    // Remove existing picker if any
    const existingPicker = document.querySelector('.nxchat-emoji-picker');
    if (existingPicker) {
      existingPicker.remove();
      return;
    }

    const picker = document.createElement('div');
    picker.className = 'nxchat-emoji-picker';
    picker.style.cssText = `
      position: absolute;
      bottom: 60px;
      left: 16px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      z-index: 1000;
    `;

    emojis.forEach(emoji => {
      const emojiButton = document.createElement('button');
      emojiButton.textContent = emoji;
      emojiButton.style.cssText = `
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 16px;
      `;
      emojiButton.addEventListener('click', () => {
        inputField.value += emoji;
        inputField.focus();
        picker.remove();
      });
      emojiButton.addEventListener('mouseenter', () => {
        emojiButton.style.background = '#f0f0f0';
      });
      emojiButton.addEventListener('mouseleave', () => {
        emojiButton.style.background = 'none';
      });
      picker.appendChild(emojiButton);
    });

    chatContainer.appendChild(picker);

    // Close picker when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closePicker(e) {
        if (!picker.contains(e.target) && e.target !== button) {
          picker.remove();
          document.removeEventListener('click', closePicker);
        }
      });
    }, 0);
  }

  // Handle file attachment
  function handleFileAttachment() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,application/pdf,.doc,.docx,.txt';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // In a real implementation, you'd upload the file to the server
        addMessage(`📎 ${file.name}`, 'user');
        console.log('File selected:', file.name);
      }
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  // Toggle favorite
  function toggleFavorite() {
    const isFavorited = starButton.dataset.favorited === 'true';
    
    if (isFavorited) {
      starButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      `;
      starButton.dataset.favorited = 'false';
      starButton.style.color = '#666';
    } else {
      starButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      `;
      starButton.dataset.favorited = 'true';
      starButton.style.color = '#ffc107';
    }
  }

  // Show action button
  function showActionButton(text, icon = '🔍') {
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'nxchat-action-button';
    buttonDiv.innerHTML = `
      <span>${icon}</span>
      <span>${text}</span>
    `;
    buttonDiv.addEventListener('click', () => {
      handleActionButton(text);
    });
    messageContainer.appendChild(buttonDiv);
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }

  // Handle action button clicks
  function handleActionButton(action) {
    if (action === 'Search on Helpdesk') {
      // Switch to helpdesk tab
      switchTab('helpdesk');
    }
  }

  // Switch tabs
  function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    const tabs = chatContainer.querySelectorAll('.nxchat-tab');
    tabs.forEach(t => {
      if (t.dataset.tab === tab) {
        t.classList.add('active');
        t.style.color = 'white';
      } else {
        t.classList.remove('active');
        t.style.color = 'rgba(255, 255, 255, 0.7)';
      }
    });
    
    // Update content based on tab
    if (tab === 'helpdesk') {
      showHelpdeskContent();
    } else {
      showChatContent();
    }
  }

  // Show helpdesk content
  function showHelpdeskContent() {
    messageContainer.innerHTML = '';
    
    const helpdeskDiv = document.createElement('div');
    helpdeskDiv.style.cssText = 'padding: 20px; text-align: center;';
    helpdeskDiv.innerHTML = `
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #333;">Help Center</div>
      <div style="color: #666; margin-bottom: 20px;">Search our knowledge base for answers</div>
      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Popular Articles</div>
        <div style="text-align: left; font-size: 14px; color: #666;">
          • How to get started<br>
          • Account settings<br>
          • Billing questions<br>
          • Technical support
        </div>
      </div>
      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px;">Contact Support</div>
        <div style="font-size: 14px; color: #666;">
          Can't find what you're looking for?<br>
          Switch to Chat tab to talk with our team.
        </div>
      </div>
    `;
    messageContainer.appendChild(helpdeskDiv);
  }

  // Show chat content
  function showChatContent() {
    messageContainer.innerHTML = '';
    
    // Check if we have saved messages to restore
    if (messages.length > 0) {
      console.log('Restoring', messages.length, 'saved messages');
      restoreMessagesToUI();
    } else {
      // Add date separator for new chat
      const dateDiv = document.createElement('div');
      dateDiv.className = 'nxchat-date-separator';
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      dateDiv.innerHTML = `<span>${dateStr}</span>`;
      messageContainer.appendChild(dateDiv);
      
      // Add welcome message only for new chats
      addMessage('Hello! I\'m your AI assistant. I can help answer questions about our products and services. What would you like to know?', 'bot');
    }
    
    // Ensure scroll to bottom after content is loaded
    setTimeout(() => {
      if (messageContainer) {
        messageContainer.scrollTop = messageContainer.scrollHeight;
        console.log('Scrolled to bottom - scrollHeight:', messageContainer.scrollHeight);
      }
    }, 200);
  }

  // Attach event listeners
  function attachEventListeners() {
    // Toggle button
    toggleButton.addEventListener('click', toggleWidget);
    
    // Send button
    sendButton.addEventListener('click', sendMessage);
    
    // Input field
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent default Enter behavior (newline/space)
        sendMessage();
      }
    });

    // Track typing status
    inputField.addEventListener('input', () => {
      trackTyping(true);
      
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set timeout to stop typing after 2 seconds of inactivity
      typingTimeout = setTimeout(() => {
        trackTyping(false);
      }, 2000);
    });
    
    // Tab buttons
    const tabs = chatContainer.querySelectorAll('.nxchat-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });
  }

  // Update toggle button appearance
  function updateToggleButton() {
    if (isOpen) {
      // Show close button (X)
      toggleButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      `;
      toggleButton.style.background = '#dc3545'; // Red color for close
    } else {
      // Show chat button
      toggleButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
      `;
      toggleButton.style.background = CONFIG.theme.primaryColor; // Blue color for chat
    }
  }

  // Toggle widget
  function toggleWidget() {
    // Add click animation to toggle button
    toggleButton.classList.add('clicked');
    setTimeout(() => {
      toggleButton.classList.remove('clicked');
    }, 600);
    
    isOpen = !isOpen;
    
    if (isOpen) {
      // Track widget open
      trackVisitorActivity('widget_open');
      
      // Show widget with animation
      widgetContainer.style.display = 'flex';
      toggleButton.style.display = 'flex';
      
      // Add maximizing animation
      widgetContainer.classList.remove('minimizing');
      widgetContainer.classList.add('maximizing');
      
      // Initialize chat content if not already loaded
      if (messageContainer.children.length === 0) {
        showChatContent();
      } else {
        // If content already exists, ensure we scroll to bottom
        setTimeout(() => {
          if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
            console.log('Widget opened - scrolled to bottom - scrollHeight:', messageContainer.scrollHeight);
          }
        }, 300);
      }
      
      // Update visitor status to online when chat is opened
      updateVisitorStatus('online');
      
      // Emit widget maximized status
      widgetMinimized = false;
      emitWidgetStatus('maximized');
      
      // Remove animation class after animation completes
      setTimeout(() => {
        widgetContainer.classList.remove('maximizing');
      }, 500);
      
    } else {
      // Track widget close
      trackVisitorActivity('widget_close');
      
      // Add minimizing animation
      widgetContainer.classList.remove('maximizing');
      widgetContainer.classList.add('minimizing');
      
      // Hide widget after animation completes
      setTimeout(() => {
        widgetContainer.style.display = 'none';
        widgetContainer.classList.remove('minimizing');
      }, 400);
      
      toggleButton.style.display = 'flex';
      
      // Update visitor status to idle when chat is closed
      updateVisitorStatus('idle');
      
      // Emit widget minimized status
      widgetMinimized = true;
      emitWidgetStatus('minimized');
    }
    
    // Update button appearance
    updateToggleButton();
  }


  // End chat function
  function endChat() {
    if (!visitorId) return;
    
    // Add end chat message
    addMessage('Chat ended by visitor', 'system');
    
    // Send end chat request to backend
    fetch('/widget/visitor/end-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        visitorId: visitorId,
        tenantId: CONFIG.tenantId
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('Chat ended successfully');
        // Reset states
        agentJoined = false;
        aiDisabled = false;
        chatSessionActive = false;
        agentStatusChecked = true;
        
        // Clear timeout since chat ended
        clearAgentResponseTimeout();
        
        // Update UI
        updateChatHeader('AI Assistant');
      } else {
        console.error('Failed to end chat:', data.message);
      }
    })
    .catch(error => {
      console.error('Error ending chat:', error);
    });
  }

  // Toggle menu function
  function toggleMenu() {
    const existingMenu = document.querySelector('.nxchat-menu-popup');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    // Create popup menu
    const menuPopup = document.createElement('div');
    menuPopup.className = 'nxchat-menu-popup';
    menuPopup.style.cssText = `
      position: absolute;
      top: 50px;
      right: 10px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 8px 0;
      min-width: 180px;
      z-index: 10003;
      animation: slideUpFadeIn 0.2s ease-out;
    `;

    // Menu options
    const menuOptions = [
      {
        id: 'mute',
        text: 'Mute',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>`,
        action: () => handleMenuAction('mute')
      },
      {
        id: 'receipt',
        text: 'Chat Receipt',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>`,
        action: () => handleMenuAction('receipt')
      },
      {
        id: 'end',
        text: 'End Chat',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
        </svg>`,
        action: () => handleMenuAction('end')
      }
    ];

    // Create menu items
    menuOptions.forEach(option => {
      const menuItem = document.createElement('div');
      menuItem.className = 'nxchat-menu-item';
      menuItem.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        color: #333;
        font-size: 14px;
      `;
      menuItem.innerHTML = `
        <span style="color: #666;">${option.icon}</span>
        <span>${option.text}</span>
      `;
      
      // Add hover effect
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#f5f5f5';
      });
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'transparent';
      });
      
      // Add click handler
      menuItem.addEventListener('click', () => {
        option.action();
        menuPopup.remove();
      });
      
      menuPopup.appendChild(menuItem);
    });

    // Add to widget container
    widgetContainer.appendChild(menuPopup);

    // Close menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menuPopup.contains(e.target) && !e.target.closest('.nxchat-menu-btn')) {
          menuPopup.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 0);
  }

  // Handle menu action
  function handleMenuAction(action) {
    switch (action) {
      case 'mute':
        console.log('Mute clicked');
        addMessage('Chat notifications muted', 'system');
        break;
      case 'receipt':
        console.log('Chat Receipt clicked');
        downloadChatReceipt();
        break;
      case 'end':
        console.log('End Chat clicked');
        endChat();
        break;
    }
  }

  // Download chat receipt
  function downloadChatReceipt() {
    if (!messages || messages.length === 0) {
      addMessage('No chat history available for download', 'system');
      return;
    }

    // Create chat receipt content
    let receiptContent = `Chat Receipt\n`;
    receiptContent += `Generated: ${new Date().toLocaleString()}\n`;
    receiptContent += `Visitor ID: ${visitorId}\n`;
    receiptContent += `================================\n\n`;

    messages.forEach((message, index) => {
      const timestamp = new Date(message.timestamp).toLocaleString();
      const sender = message.type === 'user' ? 'Visitor' : 
                    message.type === 'bot' ? 'AI Assistant' : 
                    message.type === 'system' ? 'System' : 'Agent';
      receiptContent += `[${timestamp}] ${sender}: ${message.content}\n`;
    });

    // Create and download file
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-receipt-${visitorId}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    addMessage('Chat receipt downloaded successfully', 'system');
  }

  // Start agent response timeout (2 minutes)
  function startAgentResponseTimeout() {
    // Clear any existing timeout
    if (agentResponseTimeout) {
      clearTimeout(agentResponseTimeout);
    }
    
    // Only start timeout if agent is connected (not AI)
    if (agentJoined && !aiDisabled) {
      console.log('Starting 2-minute agent response timeout');
      
      agentResponseTimeout = setTimeout(() => {
        console.log('Agent response timeout reached - showing timeout message');
        showAgentTimeoutMessage();
      }, 2 * 60 * 1000); // 2 minutes in milliseconds
    }
  }

  // Clear agent response timeout
  function clearAgentResponseTimeout() {
    if (agentResponseTimeout) {
      console.log('Clearing agent response timeout');
      clearTimeout(agentResponseTimeout);
      agentResponseTimeout = null;
    }
  }

  // Show timeout message when agent doesn't respond within 2 minutes
  function showAgentTimeoutMessage() {
    const timeoutMessage = 'Your message has been sent to our support team. An agent will respond shortly.';
    
    // Add timeout message to chat
    addMessage(timeoutMessage, 'system');
    
    // Save to message history
    saveMessageToHistory(timeoutMessage, 'system', { 
      read: true,
      timeout: true 
    });
    
    console.log('Agent timeout message displayed');
  }

  // Emit widget status to backend
  function emitWidgetStatus(status) {
    if (socket && isConnected && visitorId) {
      console.log(`Emitting widget status: ${status}`);
      socket.emit('widget:status', {
        visitorId: visitorId,
        tenantId: CONFIG.tenantId,
        status: status,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Send message
  async function sendMessage() {
    const message = inputField.value.trim();
    if (!message) return;
    
    // Track chat message activity
    trackVisitorActivity('chat_message', {
      message: message,
      message_length: message.length
    });
    
    // Ensure visitor ID is available
    if (!visitorId) {
      console.error('Visitor ID not available, cannot send message');
      addMessage('Error: Unable to send message. Please refresh the page.', 'system');
      return;
    }
    
    addMessage(message, 'user', { read: true });
    inputField.value = '';
    
    // Restore focus to input field to ensure placeholder text behaves correctly
    // Use setTimeout to ensure DOM has updated before focusing
    setTimeout(() => {
      inputField.focus();
    }, 10);
    
    // Update visitor message count
    updateVisitorMessageCount();
    
    // Send visitor message to backend
    try {
      const messageData = {
        visitorId: visitorId,
        tenantId: CONFIG.tenantId,
        message: message,
        sender: 'visitor'
      };
      console.log('Sending visitor message to backend:', messageData);
      
      const response = await fetch(`${CONFIG.apiUrl}/widget/visitor/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
      });
      
      const data = await response.json();
      console.log('Backend response for visitor message:', data);
      if (!data.success) {
        console.error('Failed to send message:', data.message);
      } else {
        // Message sent successfully - start agent response timeout if agent is connected
        if (agentJoined && !aiDisabled) {
          lastVisitorMessageTime = Date.now();
          startAgentResponseTimeout();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }

    // Handle AI response or agent transfer based on current state
    if (agentJoined) {
      // Agent is handling the chat - start timeout timer for response
      // The timeout message will be shown after 2 minutes if no response
      console.log('Message sent to agent, waiting for response...');
    } else if (!aiDisabled && CONFIG.features.aiEnabled && agentStatusChecked) {
      // AI is handling the chat - get AI response
      await handleAIResponse(message);
    } else if (!agentStatusChecked) {
      // Agent status not checked yet - this shouldn't happen with new flow, but handle gracefully
      console.log('Agent status not checked yet - this is unexpected with new flow');
      await checkAgentAvailability();
      if (!aiDisabled && CONFIG.features.aiEnabled) {
        await handleAIResponse(message);
      } else {
        addMessage('Thank you for your message. Our team will get back to you as soon as possible.', 'system');
      }
    } else {
      // Fallback case
      addMessage('Thank you for your message. Our team will get back to you as soon as possible.', 'system');
    }
  }

  // Handle AI response with transfer capability
  async function handleAIResponse(message) {
    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'nxchat-typing-indicator';
    typingIndicator.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      color: #666;
      font-style: italic;
    `;
    typingIndicator.innerHTML = `
      <div style="width: 24px; height: 24px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 5px;">💬</div>
      <div>${CONFIG.ai.agentName} is typing...</div>
    `;
    messageContainer.appendChild(typingIndicator);
    messageContainer.scrollTop = messageContainer.scrollHeight;
    
    try {
      // Call AI API
      const response = await fetch(`${CONFIG.apiUrl}/widget/chat/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          tenantId: CONFIG.tenantId,
          visitorId: visitorId
        })
      });
      
      const data = await response.json();
      
      // Remove typing indicator
      typingIndicator.remove();
      
      if (data.success) {
        const aiResponse = data.data.response;
        addMessage(aiResponse, 'bot');
        
        // Check if AI response indicates need for human agent
        if (shouldTransferToAgent(message, aiResponse)) {
          await attemptAgentTransfer();
        }
        
        // Update visitor message count
        updateVisitorMessageCount();
      } else {
        addMessage('Sorry, I encountered an error. Please try again or contact support.', 'bot');
        console.error('AI Chat Error:', data.message);
      }
    } catch (error) {
      // Remove typing indicator
      typingIndicator.remove();
      
      addMessage('Sorry, I\'m having trouble connecting. Please try again later.', 'bot');
      console.error('AI Chat Error:', error);
    }
  }

  // Check if message should trigger agent transfer
  function shouldTransferToAgent(userMessage, aiResponse) {
    const transferKeywords = [
      'speak to human', 'speak to agent', 'speak to person', 'human agent', 'real person',
      'talk to human', 'talk to agent', 'talk to person', 'human support', 'live agent',
      'connect to agent', 'transfer to agent', 'agent please', 'human please',
      'not helpful', 'not working', 'escalate', 'supervisor', 'manager'
    ];
    
    const message = (userMessage + ' ' + aiResponse).toLowerCase();
    
    return transferKeywords.some(keyword => message.includes(keyword));
  }

  // Attempt to transfer to available agent
  async function attemptAgentTransfer() {
    try {
      console.log('Attempting to transfer to available agent...');
      
      if (!hasOnlineAgents) {
        addMessage('I understand you\'d like to speak with a human agent. Unfortunately, no agents are currently available. I\'ll continue helping you, and you can try again later.', 'bot');
        return;
      }
      
      // Request agent assignment
      const response = await fetch(`${CONFIG.apiUrl}/widget/visitor/request-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: visitorId,
          tenantId: CONFIG.tenantId,
          reason: 'AI transfer request'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addMessage('I\'m transferring you to a human agent. Please hold on while I connect you...', 'system');
        
        // Update states
        agentJoined = true;
        aiDisabled = true;
        chatSessionActive = true;
        
        // Update UI
        updateChatHeader('Connecting to Agent...');
        
        // Clear any existing timeout
        clearAgentResponseTimeout();
        
        // Start agent response timeout
        startAgentResponseTimeout();
      } else {
        addMessage('I apologize, but I\'m unable to connect you with an agent right now. I\'ll continue helping you, and you can try again later.', 'bot');
        console.error('Failed to request agent transfer:', data.message);
      }
    } catch (error) {
      console.error('Error requesting agent transfer:', error);
      addMessage('I apologize, but I\'m having trouble connecting you with an agent. I\'ll continue helping you, and you can try again later.', 'bot');
    }
  }

  // Load chat history
  function loadChatHistory() {
    // Load from localStorage if available
    const saved = localStorage.getItem(`nxchat-history-${CONFIG.tenantId}`);
    if (saved) {
      try {
        const history = JSON.parse(saved);
        messages = history;
        console.log('Loaded chat history:', history.length, 'messages');
        
        // Restore messages to the UI
        restoreMessagesToUI();
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  }

  // Save chat history
  function saveChatHistory() {
    localStorage.setItem(`nxchat-history-${CONFIG.tenantId}`, JSON.stringify(messages));
  }

  // Clear chat history
  function clearChatHistory() {
    messages = [];
    localStorage.removeItem(`nxchat-history-${CONFIG.tenantId}`);
    console.log('Chat history cleared');
  }

  // Clean up old messages (keep only last 50 messages)
  function cleanupOldMessages() {
    if (messages.length > 50) {
      messages = messages.slice(-50);
      saveChatHistory();
      console.log('Cleaned up old messages, keeping last 50');
    }
  }

  // Save individual message to history
  function saveMessageToHistory(content, type, options = {}) {
    const messageData = {
      content: content,
      type: type,
      timestamp: new Date().toISOString(),
      visitorId: visitorId,
      sessionId: sessionId,
      read: options.read || false
    };
    
    messages.push(messageData);
    
    // Clean up old messages to prevent localStorage from getting too large
    cleanupOldMessages();
    
    saveChatHistory();
  }

  // Restore messages to UI
  function restoreMessagesToUI() {
    if (!messageContainer || messages.length === 0) return;
    
    // Clear existing messages
    messageContainer.innerHTML = '';
    
    // Add date separator
    const dateDiv = document.createElement('div');
    dateDiv.className = 'nxchat-date-separator';
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
    dateDiv.innerHTML = `<span>${dateStr}</span>`;
    messageContainer.appendChild(dateDiv);
    
    // Restore all messages
    messages.forEach(message => {
      addMessageToUI(message.content, message.type, { read: message.read });
    });
    
    // Scroll to bottom after all messages are restored
    setTimeout(() => {
      if (messageContainer) {
        messageContainer.scrollTop = messageContainer.scrollHeight;
        console.log('Restored messages and scrolled to bottom - scrollHeight:', messageContainer.scrollHeight);
      }
    }, 100);
  }

  // Add message to UI without saving to history (for restoration)
  function addMessageToUI(content, type = 'bot', options = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `nxchat-message ${type}`;

    if (type === 'system') {
      const bubble = document.createElement('div');
      bubble.className = 'nxchat-message-bubble';
      bubble.innerHTML = content;
      messageDiv.appendChild(bubble);
    } else {
      // Create message container for proper alignment
      const messageContainer = document.createElement('div');
      messageContainer.style.cssText = `
        display: flex;
        flex-direction: ${type === 'user' ? 'row-reverse' : 'row'};
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 16px;
      `;

      // Avatar
      const avatar = document.createElement('div');
      avatar.className = 'nxchat-message-avatar';
      avatar.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
        flex-shrink: 0;
      `;
      
      if (type === 'user') {
        avatar.style.background = CONFIG.theme.primaryColor;
        avatar.style.color = 'white';
        avatar.innerHTML = 'U';
      } else if (type === 'bot') {
        avatar.style.background = '#f0f0f0';
        avatar.style.color = '#666';
        // Use AI agent logo if available, otherwise use default emoji
        if (CONFIG.ai.agentLogo && CONFIG.ai.agentLogo.trim() !== '') {
          avatar.innerHTML = `<img src="${CONFIG.ai.agentLogo}" alt="${CONFIG.ai.agentName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
        } else {
          avatar.innerHTML = '💬';
        }
      } else if (type === 'agent') {
        avatar.style.background = '#28a745';
        avatar.style.color = 'white';
        avatar.innerHTML = 'A';
      }

      // Message content container
      const contentContainer = document.createElement('div');
      contentContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: ${type === 'user' ? 'flex-end' : 'flex-start'};
        max-width: 240px;
      `;

      // Label
      const label = document.createElement('div');
      label.className = 'nxchat-message-label';
      label.style.cssText = `
        font-size: 11px;
        color: #999;
        margin-bottom: 4px;
        font-weight: 500;
        text-align: ${type === 'user' ? 'right' : 'left'};
      `;
      
      if (type === 'user') {
        label.textContent = 'You';
      } else if (type === 'agent') {
        label.textContent = 'Agent';
      } else {
        label.textContent = CONFIG.ai.agentName;
      }

      // Message bubble
      const bubble = document.createElement('div');
      bubble.className = 'nxchat-message-bubble';
      bubble.style.cssText = `
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
        position: relative;
      `;
      
      if (type === 'bot') {
        bubble.style.background = '#f0f0f0';
        bubble.style.color = '#333';
        bubble.style.borderBottomLeftRadius = '4px';
      } else if (type === 'user') {
        bubble.style.background = CONFIG.theme.primaryColor;
        bubble.style.color = 'white';
        bubble.style.borderBottomRightRadius = '4px';
      } else if (type === 'agent') {
        bubble.style.background = '#28a745';
        bubble.style.color = 'white';
        bubble.style.borderBottomLeftRadius = '4px';
      }
      
      bubble.innerHTML = content;

      // Assemble message
      contentContainer.appendChild(label);
      contentContainer.appendChild(bubble);
      
      // Add read receipt for user messages
      if (type === 'user' && options.read) {
        const readReceipt = document.createElement('div');
        readReceipt.style.cssText = 'text-align: right; font-size: 10px; color: #4CAF50; margin-top: 2px;';
        readReceipt.innerHTML = '✓';
        contentContainer.appendChild(readReceipt);
      }

      messageContainer.appendChild(avatar);
      messageContainer.appendChild(contentContainer);
      messageDiv.appendChild(messageContainer);
    }

    messageContainer.appendChild(messageDiv);
    
    // Scroll to bottom after adding message
    setTimeout(() => {
      if (messageContainer) {
        messageContainer.scrollTop = messageContainer.scrollHeight;
      }
    }, 10);
  }

  // Generate session ID
  function generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Generate visitor ID
  function generateVisitorId() {
    return 'visitor_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Get visitor information
  function getVisitorInfo() {
    const trackingData = getTrackingData();
    return {
      id: visitorId || generateVisitorId(),
      sessionId: sessionId,
      name: getVisitorName(),
      email: getVisitorEmail(),
      phone: getVisitorPhone(),
      avatar: getVisitorAvatar(),
      currentPage: window.location.href,
      referrer: document.referrer || 'Direct',
      location: getVisitorLocation(),
      device: getDeviceInfo(),
      lastActivity: new Date().toISOString(),
      sessionDuration: Math.floor((Date.now() - sessionStart) / 1000),
      messagesCount: messages.length,
      isTyping: isTyping,
      ipAddress: null, // Will be set by server
      userAgent: navigator.userAgent,
      tags: getVisitorTags(),
      // Enhanced tracking data
      source: trackingData.source,
      medium: trackingData.medium,
      campaign: trackingData.campaign,
      content: trackingData.content,
      term: trackingData.term,
      keyword: trackingData.keyword,
      searchEngine: trackingData.searchEngine,
      landingPage: trackingData.landingPage
    };
  }

  // Get comprehensive tracking data
  function getTrackingData() {
    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);
    const referrer = document.referrer;
    
    // Extract UTM parameters
    const utmSource = url.searchParams.get('utm_source') || searchParams.get('utm_source');
    const utmMedium = url.searchParams.get('utm_medium') || searchParams.get('utm_medium');
    const utmCampaign = url.searchParams.get('utm_campaign') || searchParams.get('utm_campaign');
    const utmContent = url.searchParams.get('utm_content') || searchParams.get('utm_content');
    const utmTerm = url.searchParams.get('utm_term') || searchParams.get('utm_term');
    
    // Determine source and medium
    let source = 'Direct';
    let medium = 'none';
    let keyword = null;
    let searchEngine = null;
    
    // Check referrer
    if (utmSource) {
      source = utmSource;
      medium = utmMedium || 'email';
    } else if (referrer) {
      try {
        const refUrl = new URL(referrer);
        const hostname = refUrl.hostname.toLowerCase();
        
        // Check if it's a search engine
        if (hostname.includes('google.')) {
          source = 'Google';
          medium = 'organic';
          searchEngine = 'Google';
          keyword = extractKeywordFromGoogleUrl(refUrl);
        } else if (hostname.includes('bing.')) {
          source = 'Bing';
          medium = 'organic';
          searchEngine = 'Bing';
          keyword = extractKeywordFromBingUrl(refUrl);
        } else if (hostname.includes('yahoo.')) {
          source = 'Yahoo';
          medium = 'organic';
          searchEngine = 'Yahoo';
          keyword = refUrl.searchParams.get('p');
        } else if (hostname.includes('duckduckgo.')) {
          source = 'DuckDuckGo';
          medium = 'organic';
          searchEngine = 'DuckDuckGo';
          keyword = refUrl.searchParams.get('q');
        } else if (hostname.includes('baidu.')) {
          source = 'Baidu';
          medium = 'organic';
          searchEngine = 'Baidu';
          keyword = refUrl.searchParams.get('wd');
        } else if (hostname.includes('yandex.')) {
          source = 'Yandex';
          medium = 'organic';
          searchEngine = 'Yandex';
          keyword = refUrl.searchParams.get('text');
        } else if (hostname.includes('facebook.')) {
          source = 'Facebook';
          medium = 'social';
        } else if (hostname.includes('twitter.') || hostname.includes('x.com')) {
          source = 'Twitter';
          medium = 'social';
        } else if (hostname.includes('linkedin.')) {
          source = 'LinkedIn';
          medium = 'social';
        } else if (hostname.includes('instagram.')) {
          source = 'Instagram';
          medium = 'social';
        } else {
          source = hostname;
          medium = 'referral';
        }
      } catch (e) {
        console.error('Error parsing referrer:', e);
      }
    }
    
    // Get landing page (first page visited in session)
    const landingPage = sessionStorage.getItem('nxchat_landing_page') || window.location.href;
    if (!sessionStorage.getItem('nxchat_landing_page')) {
      sessionStorage.setItem('nxchat_landing_page', window.location.href);
    }
    
    return {
      source: source,
      medium: medium,
      campaign: utmCampaign,
      content: utmContent,
      term: utmTerm,
      keyword: keyword || utmTerm,
      searchEngine: searchEngine,
      landingPage: landingPage
    };
  }

  // Extract keyword from Google search URL
  function extractKeywordFromGoogleUrl(url) {
    // Google uses 'q' parameter for searches
    const query = url.searchParams.get('q');
    if (query) {
      // Decode if necessary
      try {
        return decodeURIComponent(query);
      } catch (e) {
        return query;
      }
    }
    return null;
  }

  // Extract keyword from Bing search URL
  function extractKeywordFromBingUrl(url) {
    // Bing uses 'q' parameter for searches
    const query = url.searchParams.get('q');
    if (query) {
      try {
        return decodeURIComponent(query);
      } catch (e) {
        return query;
      }
    }
    return null;
  }

  // Get visitor name (try to extract from various sources)
  function getVisitorName() {
    // Try to get name from localStorage or cookies
    const storedName = localStorage.getItem('nxchat_visitor_name') || 
                      getCookie('nxchat_visitor_name') || 
                      'Anonymous Visitor';
    return storedName;
  }

  // Get visitor email
  function getVisitorEmail() {
    return localStorage.getItem('nxchat_visitor_email') || 
           getCookie('nxchat_visitor_email') || 
           null;
  }

  // Get visitor phone
  function getVisitorPhone() {
    return localStorage.getItem('nxchat_visitor_phone') || 
           getCookie('nxchat_visitor_phone') || 
           null;
  }

  // Get visitor avatar
  function getVisitorAvatar() {
    return localStorage.getItem('nxchat_visitor_avatar') || 
           getCookie('nxchat_visitor_avatar') || 
           null;
  }

  // Get visitor location (basic geolocation)
  function getVisitorLocation() {
    return {
      country: 'Unknown',
      city: 'Unknown',
      region: 'Unknown'
    };
  }

  // Get device information
  function getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let deviceType = 'desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect device type
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/iPad|Android.*Tablet/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return {
      type: deviceType,
      browser: browser,
      os: os
    };
  }

  // Get visitor tags
  function getVisitorTags() {
    const tags = [];
    
    // Add tags based on page content or URL
    if (window.location.pathname.includes('/pricing')) tags.push('pricing');
    if (window.location.pathname.includes('/contact')) tags.push('contact');
    if (window.location.pathname.includes('/support')) tags.push('support');
    if (window.location.search.includes('utm_source=')) tags.push('utm');
    
    return tags;
  }

  // Get cookie value
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // Track visitor activity with detailed information
  function trackVisitorActivity(activityType = 'page_view', activityData = {}) {
    lastActivity = Date.now();
    sessionDuration = Math.floor((Date.now() - sessionStart) / 1000);
    
    // Enhanced activity data
    const enhancedActivityData = {
      ...activityData,
      ip_address: getClientIP(),
      location: getVisitorLocation(),
      device: getDeviceInfo(),
      referrer: document.referrer,
      page_url: window.location.href,
      page_title: document.title,
      timestamp: new Date().toISOString(),
      session_duration: sessionDuration
    };
    
    // Send to backend API
    sendVisitorActivity(activityType, window.location.href, enhancedActivityData);
    
    // Also send detailed activity log
    sendDetailedActivityLog(activityType, enhancedActivityData);
    
    if (socket && socket.connected) {
      socket.emit('visitor:activity', {
        visitorId: visitorId,
        sessionId: sessionId,
        activity: activityType,
        page: window.location.href,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get client IP address (if available)
  function getClientIP() {
    // This would typically be provided by the server
    return window.clientIP || 'Unknown';
  }

  // Get visitor location information
  function getVisitorLocation() {
    return {
      country: window.visitorLocation?.country || 'Unknown',
      city: window.visitorLocation?.city || 'Unknown',
      region: window.visitorLocation?.region || 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  // Get device information
  function getDeviceInfo() {
    const userAgent = navigator.userAgent;
    return {
      type: /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' : 'desktop',
      browser: getBrowserName(userAgent),
      os: getOSName(userAgent),
      screen_resolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      user_agent: userAgent
    };
  }

  // Extract browser name from user agent
  function getBrowserName(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  // Extract OS name from user agent
  function getOSName(userAgent) {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  // Send detailed activity log to backend
  function sendDetailedActivityLog(activityType, activityData) {
    if (!visitorId || !CONFIG.tenantId) return;
    
    const activity = {
      visitorId: visitorId,
      tenantId: CONFIG.tenantId,
      activityType: activityType,
      activityData: activityData,
      page_url: window.location.href,
      timestamp: new Date().toISOString()
    };
    
    fetch(`${CONFIG.apiUrl}/widget/visitor/activity-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activity)
    }).catch(error => {
      console.warn('Failed to send detailed activity log:', error);
    });
  }

  // Update visitor activity with session duration
  async function updateVisitorActivity() {
    try {
      console.log('Updating visitor activity - Session Duration:', sessionDuration);
      const response = await fetch(`${CONFIG.apiUrl}/widget/visitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: visitorId,
          sessionId: sessionId,
          tenantId: CONFIG.tenantId,
          currentPage: window.location.href,
          sessionDuration: sessionDuration,
          lastActivity: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        lastActivity = Date.now();
        console.log('Visitor activity updated successfully');
      } else {
        console.warn('Failed to update visitor activity:', response.statusText);
      }
    } catch (error) {
      console.warn('Error updating visitor activity:', error);
    }
  }

  // Send visitor activity to backend
  async function sendVisitorActivity(activity, page) {
    try {
      const response = await fetch(`${CONFIG.apiUrl}/widget/visitor/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: visitorId,
          tenantId: CONFIG.tenantId,
          activity: activity,
          page: page,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        console.warn('Failed to send visitor activity:', response.statusText);
      }
    } catch (error) {
      console.warn('Error sending visitor activity:', error);
    }
  }

  // Update visitor status
  function updateVisitorStatus(status) {
    // Send to backend API
    sendVisitorStatus(status);
    
    if (socket && socket.connected) {
      socket.emit('visitor:status', {
        visitorId: visitorId,
        status: status,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Send visitor status to backend
  async function sendVisitorStatus(status) {
    try {
      // For offline status, use sendBeacon to ensure it's sent even if page is unloading
      if (status === 'offline' && 'sendBeacon' in navigator) {
        const data = JSON.stringify({
          visitorId: visitorId,
          tenantId: CONFIG.tenantId,
          status: status
        });
        // Send as blob with proper content-type for sendBeacon
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(`${CONFIG.apiUrl}/widget/visitor/status`, blob);
        console.log('Sent offline status via sendBeacon');
        return;
      }
      
      const response = await fetch(`${CONFIG.apiUrl}/widget/visitor/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: visitorId,
          tenantId: CONFIG.tenantId,
          status: status
        })
      });
      
      if (!response.ok) {
        console.warn('Failed to send visitor status:', response.statusText);
      }
    } catch (error) {
      console.warn('Error sending visitor status:', error);
    }
  }

  // Track typing status
  function trackTyping(isTypingStatus) {
    if (isTyping !== isTypingStatus) {
      isTyping = isTypingStatus;
      
      // Send to backend API
      sendVisitorTyping(isTyping);
      
      if (socket && socket.connected) {
        socket.emit('visitor:typing', {
          visitorId: visitorId,
          isTyping: isTyping,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  // Send visitor typing status to backend
  async function sendVisitorTyping(isTypingStatus) {
    try {
      const response = await fetch(`${CONFIG.apiUrl}/widget/visitor/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: visitorId,
          tenantId: CONFIG.tenantId,
          isTyping: isTypingStatus
        })
      });
      
      if (!response.ok) {
        console.warn('Failed to send visitor typing status:', response.statusText);
      }
    } catch (error) {
      console.warn('Error sending visitor typing status:', error);
    }
  }

  // Update visitor message count
  async function updateVisitorMessageCount() {
    try {
      const response = await fetch(`${CONFIG.apiUrl}/widget/visitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: visitorId,
          sessionId: sessionId,
          tenantId: CONFIG.tenantId,
          messagesCount: messages.length,
          lastActivity: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        console.warn('Failed to update visitor message count:', response.statusText);
      }
    } catch (error) {
      console.warn('Error updating visitor message count:', error);
    }
  }

  // Initialize visitor tracking
  // Join visitor room if both socket and visitor ID are ready
  function joinVisitorRoomIfReady() {
    console.log('=== JOIN VISITOR ROOM CHECK ===');
    console.log('Socket exists:', !!socket);
    console.log('Socket connected:', !!(socket && socket.connected));
    console.log('Visitor ID:', visitorId);
    console.log('Socket ID:', socket ? socket.id : 'N/A');
    console.log('================================');
    
    if (socket && socket.connected && visitorId) {
      console.log('✅ Joining visitor room:', visitorId);
      socket.emit('join_visitor_room', { visitorId: visitorId });
      return true; // Successfully joined
    } else {
      console.log('❌ Cannot join visitor room yet - socket connected:', !!(socket && socket.connected), 'visitorId:', visitorId);
      return false; // Not ready yet
    }
  }

  // Force join visitor room when visitor ID becomes available
  function ensureVisitorRoomJoined() {
    if (visitorId && socket && socket.connected) {
      console.log('🔄 Ensuring visitor room is joined for:', visitorId);
      return joinVisitorRoomIfReady();
    } else {
      console.log('🔄 Visitor room not ready - will retry when conditions are met');
      return false;
    }
  }

  function initVisitorTracking() {
    console.log('Initializing visitor tracking for tenant:', CONFIG.tenantId);
    
    // Check for existing visitor ID in localStorage
    const storedVisitorId = localStorage.getItem(`nxchat_visitor_id_${CONFIG.tenantId}`);
    const isReturningVisitor = !!storedVisitorId;
    
    // Use existing visitor ID or generate new one
    if (storedVisitorId) {
      visitorId = storedVisitorId;
      console.log('Reusing existing visitor ID:', visitorId);
    } else {
      visitorId = generateVisitorId();
      // Store visitor ID for future visits
      localStorage.setItem(`nxchat_visitor_id_${CONFIG.tenantId}`, visitorId);
      console.log('Generated new visitor ID:', visitorId);
    }
    
    console.log('Visitor tracking initialized with ID:', visitorId);
    
    // Try to join visitor room if socket is already connected
    ensureVisitorRoomJoined();
    
    // Create or update visitor in database to get consistent ID
    createOrUpdateVisitor();
    
    // Always generate new session ID for each page load
    // (session ID represents a single browser session)
    sessionId = generateSessionId();
    // Store session ID for this session
    localStorage.setItem(`nxchat_session_id_${CONFIG.tenantId}`, sessionId);
    console.log('Generated new session ID:', sessionId);

    // Create or update visitor in database
    createOrUpdateVisitor(isReturningVisitor);

    // Track initial page view
    trackVisitorActivity();

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        updateVisitorStatus('away');
      } else {
        updateVisitorStatus('online');
        trackVisitorActivity();
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      updateVisitorStatus('offline');
      // Clear session ID on page unload (but keep visitor ID)
      localStorage.removeItem(`nxchat_session_id_${CONFIG.tenantId}`);
    });

    // Track mouse movement for activity
    let activityTimeout;
    document.addEventListener('mousemove', () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        trackVisitorActivity();
      }, 1000);
    });

    // Track keyboard activity
    document.addEventListener('keydown', () => {
      trackVisitorActivity();
    });

    // Update session duration every 30 seconds
    setInterval(() => {
      sessionDuration = Math.floor((Date.now() - sessionStart) / 1000);
      updateVisitorActivity();
    }, 30000);
  }

  // Create or update visitor in database
  async function createOrUpdateVisitor(isReturningVisitor = false) {
    try {
      const visitorInfo = getVisitorInfo();
      
      const response = await fetch(`${CONFIG.apiUrl}/widget/visitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: visitorInfo.id,
          sessionId: visitorInfo.sessionId,
          tenantId: CONFIG.tenantId,
          name: visitorInfo.name,
          email: visitorInfo.email,
          phone: visitorInfo.phone,
          avatar: visitorInfo.avatar,
          currentPage: visitorInfo.currentPage,
          referrer: visitorInfo.referrer,
          location: visitorInfo.location,
          device: visitorInfo.device,
          userAgent: visitorInfo.userAgent,
          ipAddress: visitorInfo.ipAddress,
          tags: visitorInfo.tags,
          sessionDuration: visitorInfo.sessionDuration,
          messagesCount: visitorInfo.messagesCount,
          lastActivity: visitorInfo.lastActivity,
          isReturning: isReturningVisitor
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Visitor created/updated:', result.message, isReturningVisitor ? '(Returning)' : '(New)');
        
        // Update visitor ID if database returned a different one
        if (result.data && result.data.visitorId && result.data.visitorId !== visitorId) {
          console.log('Updating visitor ID from', visitorId, 'to', result.data.visitorId);
          visitorId = result.data.visitorId;
          // Update localStorage with the correct visitor ID
          localStorage.setItem(`nxchat_visitor_id_${CONFIG.tenantId}`, visitorId);
        }
        
        // Try to join visitor room with the correct visitor ID
        ensureVisitorRoomJoined();
      } else {
        console.warn('Failed to create/update visitor:', response.statusText);
      }
    } catch (error) {
      console.warn('Error creating/updating visitor:', error);
    }
  }

  // Public API
  window.NxChat = {
    init: initWidget,
    open: () => {
      if (!isOpen) toggleWidget();
    },
    close: () => {
      if (isOpen) toggleWidget();
    },
    sendMessage: (message) => {
      if (isOpen) {
        addMessage(message, 'user');
      }
    },
    getState: () => ({
      isOpen,
      isConnected,
      currentTab
    })
  };

  // Auto-initialize if tenant ID is provided
  // Check if we're loaded via snippet.js (tenant ID is already embedded)
  if (typeof window.NxChatTenantId !== 'undefined') {
    initWidget(window.NxChatTenantId);
  } else {
    // Fallback: check for script with data-tenant-id attribute
    const script = document.querySelector('script[data-tenant-id]');
    if (script) {
      const tenantId = script.getAttribute('data-tenant-id');
      if (tenantId) {
        initWidget(tenantId);
      }
    }
  }

})();