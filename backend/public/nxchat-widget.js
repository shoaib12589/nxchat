(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiUrl: null, // Will be set dynamically
    socketUrl: null, // Will be set dynamically
    tenantId: null,
    settings: null,
    brand: {
      name: null,
      logo: null
    },
    theme: {
      primaryColor: '#007bff',
      position: 'bottom-right',
      welcomeMessage: 'Welcome!',
      offlineMessage: 'We are currently offline. Please leave a message and we will get back to you soon.'
    },
    features: {
      aiEnabled: false, // Default to false, will be set from backend settings
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
      agentName: 'AI Assistant',
      agentLogo: '',
      systemMessage: 'You are a helpful AI assistant for customer support. Be friendly, professional, and helpful. Always follow the super admin commands and guidelines.'
    }
  };

  // Generate random class names for branding (security feature)
  function generateRandomClassName(prefix = 'nx') {
    const randomChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const randomPart = Array.from({ length: 12 }, () => 
      randomChars[Math.floor(Math.random() * randomChars.length)]
    ).join('');
    return `${prefix}-${randomPart}`;
  }

  // Generate branding class names on each page load
  const BRANDING_CLASSES = {
    container: generateRandomClassName('nxb'),
    icon: generateRandomClassName('nxbi')
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
  
  // IP and location data (fetched in real-time)
  let visitorIP = null;
  let visitorLocation = {
    country: null,
    city: null,
    region: null,
    timezone: null
  };
  let locationFetchInProgress = false;
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
let onlineAgents = []; // Store online agents with avatars

  // DOM elements
  let widgetContainer = null;
  let chatContainer = null;
  let messageContainer = null;
  let inputField = null;
  let sendButton = null;
  let toggleButton = null;

  // Detect if device is mobile
  function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Get responsive widget dimensions
  function getWidgetDimensions() {
    const isMobile = isMobileDevice();
    
    if (isMobile) {
      // Mobile: fixed size that fits mobile screens
      return {
        width: 'calc(100vw - 40px)',
        height: 'calc(100vh - 100px)',
        maxWidth: '100vw',
        maxHeight: '100vh'
      };
    } else {
      // Desktop: auto-fit height to screen
      return {
        width: '350px',
        height: 'calc(100vh - 40px)',
        maxWidth: '350px',
        maxHeight: 'calc(100vh - 40px)'
      };
    }
  }

  // Initialize widget
  async function initWidget(tenantId) {
    // Initialize URLs first
    initializeUrls();
    
    CONFIG.tenantId = tenantId;
    
    // Load widget settings from backend
    await loadWidgetSettings();
    
    createWidgetHTML();
    attachEventListeners();
    
    // Check agent availability and fetch avatars after widget is created
    await checkAgentAvailability();
    
    // If this is a returning visitor, show current agent (if still active)
    setTimeout(() => {
      try { checkAndShowActiveAgent(); } catch (_e) {}
    }, 400);
    
    // Fetch IP and location data immediately when widget loads
    fetchIPAndLocation();
    
    // Track widget initialization
    trackVisitorActivity('widget_init', {
      widget_version: '1.0.0',
      tenant_id: tenantId
    });
    
    // Initialize visitor tracking first (async - waits for location fetch)
    await initVisitorTracking();
    
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
      
      // When socket disconnects, mark visitor as offline
      // This handles cases where the browser/tab closes abruptly
      if (visitorId) {
        updateVisitorStatus('offline');
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    // Handle visitor room join confirmation
    socket.on('visitor_room_joined', (data) => {
      console.log('Visitor room joined successfully, ready to receive messages');
    });
    
    // Listen for transfer notification (when AI or system transfers chat to agent)
    socket.on('visitor:transfer', (data) => {
      if (data.visitorId === visitorId) {
        // Show transfer in progress message, NOT "Agent joined"
        // The chat is now in the transfer pool - no specific agent has joined yet
        addMessage("I'm transferring you to a human agent. An agent will be with you shortly. You can continue chatting with me while you wait.", 'system');
        
        // Don't set agentJoined = true yet - wait until agent actually clicks to join
        // Don't disable AI yet either - visitor can continue chatting with AI
        agentJoined = false;
        aiDisabled = false; // Keep AI enabled until agent actually joins
        agentStatusChecked = true;
        hasOnlineAgents = true;
        
        // Update UI to show transfer in progress but AI still available
        updateChatHeader('AI Assistant');
      }
    });

    // Listen for agent join event (when agent manually clicks "Join Chat" in dashboard)
    socket.on('agent:join', (data) => {
      if (data.visitorId === visitorId) {
        // Only show "Agent joined" when agent actually clicks to join
        addMessage(`${data.agentName} joined the chat.`, 'system');
        
        agentJoined = true;
        aiDisabled = true;
        chatSessionActive = true;
        agentStatusChecked = true;
        hasOnlineAgents = true;
        
        // Update UI to show agent is handling the chat
        updateChatHeader('Agent Connected');
        showCurrentAgent(data.agentId, data.agentName);
        
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
        if (CONFIG.features.aiEnabled) {
        addMessage(`${agentName} left the chat. AI responses are now enabled.`, 'system');
        } else {
          addMessage(`${agentName} left the chat.`, 'system');
        }
        
        // Show rating form when agent leaves
        showRatingForm();
        
        // Update UI to show AI is handling the chat (only if AI is enabled)
        if (CONFIG.features.aiEnabled) {
          if (CONFIG.features.aiEnabled) {
        updateChatHeader('AI Assistant');
    } else {
      updateChatHeader('Chat');
    }
        } else {
          updateChatHeader('Chat');
        }
        
        // Remove current agent banner from header
        try {
          const header = widgetContainer?.querySelector('.nxchat-header');
          const current = header?.querySelector('.nxchat-current-agent');
          if (current && current.parentNode) current.parentNode.removeChild(current);
          // Restore team avatars and response-time when agent leaves
          showTeamMeta();
        } catch (_e) {}

        // Clear timeout since agent left
        clearAgentResponseTimeout();
      }
    });

    // Listen for agent messages
    // Listen for agent typing indicators
    socket.on('agent:typing', (data) => {
      if (data && typeof data.isTyping === 'boolean') {
        showAgentTypingIndicator(data.isTyping, data.agentName);
      }
    });

    socket.on('agent:message', (data) => {
      if (data.visitorId === visitorId) {
        // Add message with messageId for seen tracking
        addMessage(data.message, 'agent', { messageId: data.messageId });
        
        // Mark message as seen when displayed (visitor viewed it)
        // Use Intersection Observer to detect when message is visible
        setTimeout(() => {
          if (socket && isConnected && visitorId && data.messageId) {
            // Emit message seen event to backend
            socket.emit('message:seen', {
              visitorId: visitorId,
              messageId: data.messageId,
              timestamp: new Date().toISOString()
            });
            console.log('Message seen event emitted:', data.messageId);
          }
        }, 500); // Small delay to ensure message is rendered
        
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
      // If title is 'AI Assistant' or '「' but AI is disabled, show brand name instead
      if ((title === 'AI Assistant' || title === 'Chat') && !CONFIG.features.aiEnabled) {
        header.textContent = CONFIG.brand.name || 'Chat';
      } else {
        header.textContent = title;
      }
    }
  }

  // Show current agent (avatar + name) in header with animation
  async function showCurrentAgent(agentId, fallbackName) {
    try {
      let agent = null;
      if (agentId) {
        const resp = await fetch(`${CONFIG.apiUrl}/widget/agent/${agentId}`);
        const data = await resp.json();
        if (data.success) agent = data.data;
      }
      const name = agent?.name || fallbackName || 'Agent';
      const avatar = agent?.avatar || '';

      const header = widgetContainer?.querySelector('.nxchat-header');
      if (!header) return;

      let current = header.querySelector('.nxchat-current-agent');
      if (!current) {
        current = document.createElement('div');
        current.className = 'nxchat-current-agent';
        current.style.cssText = `display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;opacity:0;transform:translateY(-6px);transition:opacity 220ms ease, transform 220ms ease;`;
        header.insertBefore(current, header.firstChild);
      }

      const avatarWrap = document.createElement('div');
      avatarWrap.style.cssText = `width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,0.2);background:#ddd;flex:0 0 auto;`;
      if (avatar) {
        const img = document.createElement('img');
        img.src = avatar;
        img.alt = name;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        img.onload = () => { avatarWrap.style.background = 'transparent'; };
        img.onerror = () => { avatarWrap.style.background = '#888'; };
        avatarWrap.appendChild(img);
      } else {
        const span = document.createElement('span');
        span.textContent = (name || 'A').charAt(0).toUpperCase();
        span.style.cssText = 'display:flex;width:100%;height:100%;align-items:center;justify-content:center;color:#fff;font-weight:bold;';
        avatarWrap.appendChild(span);
      }

      const nameEl = document.createElement('div');
      nameEl.textContent = name;
      nameEl.style.cssText = 'font-weight:600;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,0.2)';

      current.innerHTML = '';
      current.appendChild(avatarWrap);
      current.appendChild(nameEl);

      requestAnimationFrame(() => {
        current.style.opacity = '1';
        current.style.transform = 'translateY(0)';
      });

      // Hide team avatars and response-time while agent banner is shown
      hideTeamMeta();

      // Keep agent banner visible while agent is connected
    } catch (e) {
      console.warn('Failed to show current agent in header:', e);
    }
  }

  // Hide team avatars row and response time text
  function hideTeamMeta() {
    try {
      const header = widgetContainer?.querySelector('.nxchat-header');
      const team = header?.querySelector('.nxchat-team-avatars');
      const resp = header?.querySelector('.nxchat-response-time');
      if (team) team.style.display = 'none';
      if (resp) resp.style.display = 'none';
    } catch (_e) {}
  }

  // Show team avatars row and response time text (restore explicit display values)
  function showTeamMeta() {
    try {
      const header = widgetContainer?.querySelector('.nxchat-header');
      const team = header?.querySelector('.nxchat-team-avatars');
      const resp = header?.querySelector('.nxchat-response-time');
      if (team) team.style.display = 'flex';
      if (resp) resp.style.display = 'flex';
    } catch (_e) {}
  }

  // Check server for an active session with assigned agent and show in header
  async function checkAndShowActiveAgent() {
    try {
      if (!visitorId || !CONFIG.tenantId) return;
      const resp = await fetch(`${CONFIG.apiUrl}/widget/visitor/session-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, tenantId: CONFIG.tenantId })
      });
      const data = await resp.json();
      if (data?.success && data.data?.hasActiveSession && data.data?.assignedAgentId) {
        showCurrentAgent(data.data.assignedAgentId);
      }
    } catch (e) {
      console.warn('Failed to check active agent for returning visitor:', e);
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
    
    // Check agent availability first
    await checkAgentAvailability();
    
    // If no agents are online and AI is disabled, show offline form
    if (!hasOnlineAgents && !CONFIG.features.aiEnabled) {
      console.log('No agents online and AI disabled - showing offline form');
      // Clear chat history first
      clearChatHistory();
      // Show welcome message then form
      addMessage(CONFIG.theme.offlineMessage || 'All agents are currently offline. Please leave us a message and we\'ll get back to you soon!', 'system');
      setTimeout(() => {
        showOfflineForm();
      }, 500);
      return;
    }
    
    // Enable AI
    if (CONFIG.features.aiEnabled) {
      aiDisabled = false;
    }
    
    // Update UI to show AI is handling the chat
    if (CONFIG.features.aiEnabled) {
    updateChatHeader('AI Assistant');
    } else {
      updateChatHeader('Chat');
    }

    // For a fresh session (including returning visitors starting over), clear any old chat history
    // so the welcome message from Brand Settings can be displayed consistently
    clearChatHistory();
    
    // Render chat content now so the correct welcome message appears immediately
    if (typeof showChatContent === 'function') {
      showChatContent();
    }
  }

  // Initialize AI session (for returning visitors continuing with AI)
  async function initializeAISession() {
    console.log('Initializing AI session for returning visitor');
    
    // Set states for AI session
    agentJoined = false;
    aiDisabled = false;
    chatSessionActive = true; // Mark as active since it's continuing
    
    // Update UI to show AI is handling the chat
    if (CONFIG.features.aiEnabled) {
    updateChatHeader('AI Assistant');
    } else {
      updateChatHeader('Chat');
    }
    
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
        
        // Fetch online agents with avatars
        if (hasOnlineAgents) {
          await fetchOnlineAgents();
        }
      } else {
        console.error('Failed to check agent availability:', data.message);
        hasOnlineAgents = false;
      }
    } catch (error) {
      console.error('Error checking agent availability:', error);
      hasOnlineAgents = false;
    }
  }

  // Fetch online agents with avatars
  async function fetchOnlineAgents() {
    try {
      const response = await fetch(`${CONFIG.apiUrl}/widget/online-agents/${CONFIG.tenantId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        onlineAgents = data.data.slice(0, 4); // Get first 4 agents
        // Update header if widget is already created
        if (widgetContainer) {
          updateHeaderAvatars();
        }
      }
    } catch (error) {
      console.error('Error fetching online agents:', error);
      onlineAgents = [];
    }
  }

  // Update header avatars
  function updateHeaderAvatars() {
    const teamSection = widgetContainer?.querySelector('.nxchat-team-avatars');
    if (!teamSection) return;

    teamSection.innerHTML = '';
    
    // Show up to 4 agents, or show placeholder if no agents
    const agentsToShow = onlineAgents.slice(0, 4);
    
    if (agentsToShow.length === 0) {
      // Show placeholder if no agents available
      return;
    }
    
    agentsToShow.forEach((agent, index) => {
      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'nxchat-agent-avatar';
      avatarDiv.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 0 0 2px rgba(0,0,0,0.2);
        overflow: hidden;
        background: #ddd;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: ${index > 0 ? '-14px' : '0'};
        position: relative;
        z-index: ${4 - index};
      `;
      
      if (agent.avatar) {
        const img = document.createElement('img');
        img.src = agent.avatar;
        img.alt = agent.name || 'Agent';
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display:block;';
        img.onload = function() {
          // Remove placeholder background once image loads
          avatarDiv.style.background = 'transparent';
        };
        img.onerror = function() {
          // Fallback to initials if image fails to load
          this.style.display = 'none';
          avatarDiv.textContent = (agent.name || 'A').charAt(0).toUpperCase();
          avatarDiv.style.fontSize = '14px';
          avatarDiv.style.fontWeight = 'bold';
          avatarDiv.style.color = 'white';
          avatarDiv.style.background = '#888';
        };
        avatarDiv.appendChild(img);
      } else {
        // Fallback to initials
        avatarDiv.textContent = (agent.name || 'A').charAt(0).toUpperCase();
        avatarDiv.style.fontSize = '14px';
        avatarDiv.style.fontWeight = 'bold';
        avatarDiv.style.color = 'white';
        avatarDiv.style.background = '#888';
      }
      
      teamSection.appendChild(avatarDiv);
    });
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
        // Properly handle ai_enabled - false should mean disabled, not use default
        CONFIG.features.aiEnabled = data.data.ai_enabled !== undefined ? data.data.ai_enabled : CONFIG.features.aiEnabled;
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
        
        // Load brand information
        if (window.NxChatConfig && window.NxChatConfig.brandName) {
          CONFIG.brand.name = window.NxChatConfig.brandName;
          CONFIG.brand.logo = window.NxChatConfig.brandLogo || data.data.logo_url || null;
        } else {
          // Fallback to brand name from company or default (avoid hardcoded NxChat)
          CONFIG.brand.name = data.data.brand_name || 'Support';
          CONFIG.brand.logo = data.data.logo_url || null;
        }

        // Ensure AI agent name defaults to brand name when not explicitly configured
        if (!data.data.ai_agent_name || (typeof data.data.ai_agent_name === 'string' && data.data.ai_agent_name.trim() === '')) {
          CONFIG.ai.agentName = CONFIG.brand.name || 'AI Assistant';
        }
        
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
    // Get responsive dimensions
    const dimensions = getWidgetDimensions();
    const isMobile = isMobileDevice();
    
    // Create main container
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'nxchat-widget';
    widgetContainer.className = 'nxchat-widget';
    
    // Apply responsive positioning and sizing
    if (isMobile) {
      // Mobile: center and fill most of screen
      widgetContainer.style.cssText = `
        position: fixed;
        top: 50px;
        left: 20px;
        right: 20px;
        bottom: 50px;
        width: ${dimensions.width};
        height: ${dimensions.height};
        max-width: ${dimensions.maxWidth};
        max-height: ${dimensions.maxHeight};
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        z-index: 10002;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: none;
        flex-direction: column;
        overflow: hidden;
      `;
    } else {
      // Desktop: position based on config, auto-fit height
      widgetContainer.style.cssText = `
        position: fixed;
        ${CONFIG.theme.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        ${CONFIG.theme.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
        width: ${dimensions.width};
        height: ${dimensions.height};
        max-width: ${dimensions.maxWidth};
        max-height: ${dimensions.maxHeight};
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        z-index: 10002;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: none;
        flex-direction: column;
        overflow: hidden;
      `;
    }

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
    teamSection.className = 'nxchat-team-avatars';
    teamSection.style.cssText = 'display: flex; align-items: center; justify-content: center; margin-bottom: 12px;';
    
    // Initially show placeholder or load agents
    if (onlineAgents.length > 0) {
      updateHeaderAvatars();
    }

    // Welcome message
    const welcomeDiv = document.createElement('div');
    welcomeDiv.style.cssText = 'text-align: center; margin-bottom: 8px;';
    // welcomeDiv.innerHTML = `${CONFIG.theme.welcomeMessage} 😊`;

    // Response time indicator
    const responseTimeDiv = document.createElement('div');
    responseTimeDiv.className = 'nxchat-response-time';
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

    // Add functionality to buttons
    emojiButton.addEventListener('click', () => {
      showEmojiPicker(emojiButton);
    });

    attachButton.addEventListener('click', () => {
      handleFileAttachment();
    });

    // Add hover effects
    [emojiButton, attachButton].forEach(button => {
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

    // Right side: Branding
    const brandingDiv = document.createElement('div');
    brandingDiv.className = BRANDING_CLASSES.container;
    brandingDiv.style.cssText = 'display: flex; align-items: center; gap: 4px; font-size: 12px; color: #999;';
    brandingDiv.innerHTML = `
      We run on <div class="${BRANDING_CLASSES.icon}">N</div> NxChat
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
      
      .${BRANDING_CLASSES.container} {
        text-align: right;
        font-size: 11px;
        color: #999;
        margin-top: 8px;
        display: flex !important;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
      }
      
      .${BRANDING_CLASSES.icon} {
        width: 12px;
        height: 12px;
        background: ${CONFIG.theme.primaryColor};
        border-radius: 2px;
        display: flex !important;
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
  // Show/hide agent typing indicator
  let agentTypingIndicator = null;
  function showAgentTypingIndicator(isTyping, agentName) {
    if (!messageContainer) return;
    
    if (isTyping) {
      // Remove existing indicator if any
      if (agentTypingIndicator) {
        agentTypingIndicator.remove();
      }
      
      // Create typing indicator
      agentTypingIndicator = document.createElement('div');
      agentTypingIndicator.className = 'nxchat-agent-typing-indicator';
      agentTypingIndicator.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        color: #666;
        font-style: italic;
        padding: 12px;
        background: #f0f0f0;
        border-radius: 8px;
      `;
      agentTypingIndicator.innerHTML = `
        <div style="display: flex; gap: 4px;">
          <div style="width: 6px; height: 6px; background: #666; border-radius: 50%; animation: bounce 1.4s infinite;"></div>
          <div style="width: 6px; height: 6px; background: #666; border-radius: 50%; animation: bounce 1.4s infinite; animation-delay: 0.2s;"></div>
          <div style="width: 6px; height: 6px; background: #666; border-radius: 50%; animation: bounce 1.4s infinite; animation-delay: 0.4s;"></div>
        </div>
        <div>${agentName || 'Agent'} is typing...</div>
      `;
      messageContainer.appendChild(agentTypingIndicator);
      messageContainer.scrollTop = messageContainer.scrollHeight;
    } else {
      // Remove typing indicator
      if (agentTypingIndicator) {
        agentTypingIndicator.remove();
        agentTypingIndicator = null;
      }
    }
  }

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
        
        // Prefer brand logo; fall back to AI agent logo; then brand initial
        const brandLogo = CONFIG.brand.logo || CONFIG.settings?.logo_url;
        const brandName = CONFIG.brand.name || 'Support';
        if (brandLogo && brandLogo.trim() !== '') {
          avatar.innerHTML = `<img src="${brandLogo}" alt="${brandName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
        } else if (CONFIG.ai.agentLogo && CONFIG.ai.agentLogo.trim() !== '') {
          avatar.innerHTML = `<img src="${CONFIG.ai.agentLogo}" alt="${CONFIG.ai.agentName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
        } else {
          const initial = brandName.charAt(0).toUpperCase();
          avatar.style.background = CONFIG.theme.primaryColor;
          avatar.style.color = 'white';
          avatar.innerHTML = initial;
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
        // Always prefer brand name for bot label; fall back to AI agent name
        label.textContent = CONFIG.brand.name || CONFIG.ai.agentName || 'Support';
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
      
      // Handle file attachments
      if (options && options.file_url) {
        bubble.innerHTML = content || '';
        const fileContainer = document.createElement('div');
        fileContainer.style.cssText = 'margin-top: 8px;';
        
        if (options.message_type === 'image') {
          const img = document.createElement('img');
          img.src = options.file_url;
          img.alt = options.file_name || 'Image';
          img.style.cssText = `
            max-width: 100%;
            max-height: 200px;
            border-radius: 8px;
            cursor: pointer;
            object-fit: cover;
          `;
          img.addEventListener('click', () => {
            window.open(options.file_url, '_blank');
          });
          fileContainer.appendChild(img);
        } else {
          const fileLink = document.createElement('a');
          fileLink.href = options.file_url;
          fileLink.target = '_blank';
          fileLink.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: ${type === 'user' ? 'rgba(255,255,255,0.2)' : '#e0e0e0'};
            border-radius: 8px;
            text-decoration: none;
            color: ${type === 'user' ? 'white' : '#333'};
            font-size: 12px;
          `;
          fileLink.innerHTML = `
            <span>📎</span>
            <span>${options.file_name || 'File'}</span>
            ${options.file_size ? `<span style="opacity: 0.7;">(${(options.file_size / 1024).toFixed(1)} KB)</span>` : ''}
          `;
          fileContainer.appendChild(fileLink);
        }
        
        bubble.appendChild(fileContainer);
      } else {
        bubble.innerHTML = content;
      }

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
  async function handleFileAttachment() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,application/pdf,.doc,.docx,.txt,.xls,.xlsx';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          addMessage('File size exceeds 10MB limit. Please choose a smaller file.', 'system');
          return;
        }

        // Check if visitor ID is available
        const currentVisitorId = visitorId || CONFIG.visitorId;
        if (!currentVisitorId || !CONFIG.tenantId) {
          addMessage('Error: Unable to upload file. Please refresh the page.', 'system');
          console.error('Visitor ID or Tenant ID not available for file upload:', {
            visitorId: currentVisitorId,
            tenantId: CONFIG.tenantId
          });
          return;
        }

        // Show uploading message
        const uploadMessageId = 'upload_' + Date.now();
        addMessage(`📤 Uploading ${file.name}...`, 'user', { id: uploadMessageId });

        try {
          // Create FormData for file upload
          const formData = new FormData();
          formData.append('file', file);
          formData.append('visitorId', currentVisitorId);
          formData.append('tenantId', CONFIG.tenantId);

          console.log('📤 Uploading file to R2:', {
            fileName: file.name,
            size: file.size,
            type: file.type,
            visitorId: currentVisitorId,
            tenantId: CONFIG.tenantId,
            apiUrl: CONFIG.apiUrl
          });

          // Upload file to R2
          const uploadResponse = await fetch(CONFIG.apiUrl + '/widget/visitor/upload', {
            method: 'POST',
            body: formData
          });

          const uploadData = await uploadResponse.json();

          if (!uploadData.success) {
            throw new Error(uploadData.message || 'Upload failed');
          }

          console.log('✅ File uploaded successfully:', uploadData.data);

          // Remove uploading message
          const messageContainer = document.querySelector('.nxchat-messages');
          if (messageContainer) {
            const uploadMsg = messageContainer.querySelector(`[data-message-id="${uploadMessageId}"]`);
            if (uploadMsg) {
              uploadMsg.remove();
            }
          }

          // Send message with file attachment
          const messageContent = uploadData.data.message_type === 'image' ? '' : `📎 ${file.name}`;
          
          await sendMessageWithFile(
            messageContent,
            uploadData.data.url,
            uploadData.data.filename,
            uploadData.data.size,
            uploadData.data.message_type
          );

        } catch (error) {
          console.error('❌ File upload error:', error);
          
          // Remove uploading message
          const messageContainer = document.querySelector('.nxchat-messages');
          if (messageContainer) {
            const uploadMsg = messageContainer.querySelector(`[data-message-id="${uploadMessageId}"]`);
            if (uploadMsg) {
              uploadMsg.remove();
            }
          }
          
          addMessage(`❌ Failed to upload file: ${error.message}`, 'system');
        }
      }
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
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
      
      // Add welcome message for new chats
      if (CONFIG.features.aiEnabled) {
        // If AI is enabled, show AI welcome message
        if (CONFIG.settings && CONFIG.settings.ai_welcome_message && CONFIG.settings.ai_welcome_message.trim()) {
          addMessage(CONFIG.settings.ai_welcome_message.trim(), 'bot');
        } else {
          // Fallback to default AI message if no custom welcome message is set
      addMessage('Hello! I\'m your AI assistant. I can help answer questions about our products and services. What would you like to know?', 'bot');
        }
      } else {
        // If AI is not enabled, show regular welcome message from Behavior settings
        // This is the "Welcome Message" field in the Behavior tab of Brand Settings
        const welcomeMsg = CONFIG.settings?.welcome_message?.trim() || CONFIG.theme.welcomeMessage?.trim();
        if (welcomeMsg) {
          console.log('Showing welcome message (AI disabled):', welcomeMsg);
          addMessage(welcomeMsg, 'bot');
        } else {
          // Final fallback if no welcome message is configured
          addMessage('Hello! How can we help you today?', 'bot');
        }
      }
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
    
    // Window resize listener to update widget dimensions
    let resizeTimeout;
    window.addEventListener('resize', () => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (isOpen && widgetContainer) {
          // Update dimensions when window is resized
          const dimensions = getWidgetDimensions();
          const isMobile = isMobileDevice();
          
          if (isMobile) {
            widgetContainer.style.width = dimensions.width;
            widgetContainer.style.height = dimensions.height;
            widgetContainer.style.maxWidth = dimensions.maxWidth;
            widgetContainer.style.maxHeight = dimensions.maxHeight;
            widgetContainer.style.top = '50px';
            widgetContainer.style.left = '20px';
            widgetContainer.style.right = '20px';
            widgetContainer.style.bottom = '50px';
          } else {
            widgetContainer.style.width = dimensions.width;
            widgetContainer.style.height = dimensions.height;
            widgetContainer.style.maxWidth = dimensions.maxWidth;
            widgetContainer.style.maxHeight = dimensions.maxHeight;
            // Restore position based on config
            widgetContainer.style.top = CONFIG.theme.position.includes('bottom') ? 'auto' : '20px';
            widgetContainer.style.bottom = CONFIG.theme.position.includes('bottom') ? '20px' : 'auto';
            widgetContainer.style.left = CONFIG.theme.position.includes('right') ? 'auto' : '20px';
            widgetContainer.style.right = CONFIG.theme.position.includes('right') ? '20px' : 'auto';
          }
        }
      }, 250); // Debounce for 250ms
    });
    
    // Input field
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent default Enter behavior (newline/space)
        sendMessage();
      }
    });

    // Track typing status and emit live typing preview
    let typingContentTimeout = null;
    let lastEmittedContent = ''; // Track last emitted content to avoid unnecessary emissions
    
    inputField.addEventListener('input', () => {
      const inputValue = inputField.value;
      trackTyping(true);
      
      // Always emit the current content while typing (ensures continuous visibility)
      // Only emit if content has actually changed (avoids unnecessary emissions)
      if (socket && socket.connected && visitorId && inputValue !== undefined) {
        if (inputValue !== lastEmittedContent) {
          lastEmittedContent = inputValue;
          console.log('📤 Emitting visitor:typing-content:', { visitorId, contentLength: inputValue.length });
          socket.emit('visitor:typing-content', {
            visitorId: visitorId,
            content: inputValue,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        console.warn('⚠️ Cannot emit typing content - socket:', !!socket, 'connected:', socket?.connected, 'visitorId:', visitorId);
      }
      
      // Clear existing timeout - we don't want to clear the preview while actively typing
      // Only clear after a longer pause (30 seconds) to ensure continuous visibility
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set timeout to stop typing after 30 seconds of inactivity (longer for better UX)
      typingTimeout = setTimeout(() => {
        trackTyping(false);
        // Only clear typing preview after a longer pause to ensure it stays visible during active typing
        if (socket && socket.connected && visitorId) {
          console.log('📤 Clearing typing content after inactivity for visitor:', visitorId);
          lastEmittedContent = ''; // Reset tracked content
          socket.emit('visitor:typing-content', {
            visitorId: visitorId,
            content: '',
            timestamp: new Date().toISOString()
          });
        }
      }, 30000); // Increased to 30 seconds to keep preview visible longer
    });
    
    // Tab buttons
    const tabs = chatContainer.querySelectorAll('.nxchat-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });
  }

  // Hide widget completely (for banned IPs)
  function hideWidgetCompletely() {
    if (widgetContainer) {
      widgetContainer.style.display = 'none';
      widgetContainer.remove();
    }
    if (toggleButton) {
      toggleButton.style.display = 'none';
      toggleButton.remove();
    }
    // Disconnect socket if connected
    if (socket && socket.connected) {
      socket.disconnect();
    }
    // Clear any intervals
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
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
      
      // Update dimensions when opening (in case screen size changed)
      const dimensions = getWidgetDimensions();
      const isMobile = isMobileDevice();
      
      if (isMobile) {
        // Mobile: update to fixed mobile size
        widgetContainer.style.width = dimensions.width;
        widgetContainer.style.height = dimensions.height;
        widgetContainer.style.maxWidth = dimensions.maxWidth;
        widgetContainer.style.maxHeight = dimensions.maxHeight;
        widgetContainer.style.top = '50px';
        widgetContainer.style.left = '20px';
        widgetContainer.style.right = '20px';
        widgetContainer.style.bottom = '50px';
      } else {
        // Desktop: update to auto-fit height
        widgetContainer.style.width = dimensions.width;
        widgetContainer.style.height = dimensions.height;
        widgetContainer.style.maxWidth = dimensions.maxWidth;
        widgetContainer.style.maxHeight = dimensions.maxHeight;
        // Restore position based on config
        widgetContainer.style.top = CONFIG.theme.position.includes('bottom') ? 'auto' : '20px';
        widgetContainer.style.bottom = CONFIG.theme.position.includes('bottom') ? '20px' : 'auto';
        widgetContainer.style.left = CONFIG.theme.position.includes('right') ? 'auto' : '20px';
        widgetContainer.style.right = CONFIG.theme.position.includes('right') ? '20px' : 'auto';
      }
      
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

  // Ensure input area is visible and properly laid out
  function ensureInputAreaVisible() {
    const inputArea = chatContainer ? chatContainer.querySelector('.nxchat-input-area') : null;
    if (inputArea) {
      inputArea.style.display = '';
      inputArea.style.visibility = 'visible';
    }
    
    // Ensure input row is properly displayed
    if (inputField && inputField.parentNode) {
      const inputRow = inputField.parentNode;
      if (inputRow && inputRow.style) {
        inputRow.style.display = 'flex';
        inputRow.style.visibility = 'visible';
      }
    }
  }

  // Reset chat state for a new chat after ending previous chat
  function resetChatStateForNewChat() {
    console.log('Resetting chat state for new chat - re-enabling AI');
    
    // Reset chat state
    agentJoined = false;
    aiDisabled = false;
    chatSessionActive = false;
    hasOnlineAgents = false;
    
    // Find and properly restore the input area
    const inputArea = chatContainer ? chatContainer.querySelector('.nxchat-input-area') : null;
    if (inputArea) {
      // Ensure input area is visible and properly displayed
      inputArea.style.display = '';
      inputArea.style.visibility = 'visible';
    }
    
    // Restore input row (the flex container for input and send button)
    if (inputField && inputField.parentNode) {
      const inputRow = inputField.parentNode;
      if (inputRow) {
        inputRow.style.display = 'flex';
        inputRow.style.visibility = 'visible';
      }
    }
    
    // Re-enable input field and send button
    if (inputField) {
      inputField.disabled = false;
      inputField.style.display = '';
      inputField.style.visibility = 'visible';
    }
    if (sendButton) {
      sendButton.disabled = false;
      sendButton.style.display = '';
      sendButton.style.visibility = 'visible';
    }
    
    // Re-check agent availability
    checkAgentAvailability().then(() => {
      // If AI is enabled, update UI to show AI is available
      if (CONFIG.features.aiEnabled && !aiDisabled) {
        updateChatHeader('AI Assistant');
        console.log('AI chat re-enabled after chat ended');
      } else {
        updateChatHeader('Chat');
      }
      
      // Hide offline form if it's showing
      const offlineForm = document.getElementById('nxchat-offline-form');
      if (offlineForm) {
        offlineForm.remove();
      }
      
      // Ensure input area is visible after all operations
      if (inputArea) {
        inputArea.style.display = '';
      }
    });
  }

  // End chat function
  function endChat() {
    if (!visitorId) return;
    
    // Add end chat message
    addMessage('Chat ended by visitor', 'system');
    
    // Show rating form immediately (before sending request to backend)
    showRatingForm();
    
    // Note: The actual chat ending will be handled by the rating form submission
    // AI will be re-enabled in the rating form handlers after chat ends
  }

  // Show offline form when agents are unavailable
  function showOfflineForm() {
    console.log('showOfflineForm called');
    
    // Remove existing offline form if any
    const existingForm = document.getElementById('nxchat-offline-form');
    if (existingForm) {
      existingForm.remove();
    }
    
    // Hide input area when showing offline form
    if (inputField && inputField.parentNode) {
      inputField.parentNode.style.display = 'none';
    }

    // Create offline form
    const offlineForm = document.createElement('div');
    offlineForm.id = 'nxchat-offline-form';
    offlineForm.style.cssText = `
      margin-top: 16px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      position: relative;
      z-index: 2;
      pointer-events: auto;
    `;

    offlineForm.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #333;">Leave us a message</h3>
        <p style="margin: 0; font-size: 14px; color: #666;">All agents are currently offline. We'll get back to you soon!</p>
      </div>
      
      <form id="offline-form-submit" style="display: flex; flex-direction: column; gap: 12px;">
        <!-- Name Field -->
        <div>
          <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #333;">Name *</label>
          <input type="text" id="offline-form-name" required placeholder="Your name" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            outline: none;
            box-sizing: border-box;
          ">
        </div>

        <!-- Email Field -->
        <div>
          <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #333;">Email *</label>
          <input type="email" id="offline-form-email" required placeholder="your@email.com" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            outline: none;
            box-sizing: border-box;
          ">
        </div>

        <!-- Phone Field -->
        <div>
          <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #333;">Phone Number</label>
          <input type="tel" id="offline-form-phone" placeholder="+1 234 567 8900" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            outline: none;
            box-sizing: border-box;
          ">
        </div>

        <!-- Message Field -->
        <div>
          <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #333;">Message *</label>
          <textarea id="offline-form-message" required placeholder="How can we help you?" style="
            width: 100%;
            min-height: 100px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
            outline: none;
            box-sizing: border-box;
          "></textarea>
        </div>

        <!-- Submit Button -->
        <button type="submit" id="offline-form-submit-btn" style="
          width: 100%;
          padding: 12px;
          background-color: ${CONFIG.theme.primaryColor};
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
          margin-top: 8px;
        ">Submit</button>
      </form>
    `;

    // Add to message container
    messageContainer.appendChild(offlineForm);

    // Auto-scroll to show the form
    setTimeout(() => {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 100);

    // Handle form submission
    const form = document.getElementById('offline-form-submit');
    const submitBtn = document.getElementById('offline-form-submit-btn');
    
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const name = document.getElementById('offline-form-name').value.trim();
      const email = document.getElementById('offline-form-email').value.trim();
      const phone = document.getElementById('offline-form-phone').value.trim();
      const message = document.getElementById('offline-form-message').value.trim();

      if (!name || !email || !message) {
        alert('Please fill in all required fields (Name, Email, and Message).');
        return;
      }

      // Disable submit button
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      submitBtn.style.opacity = '0.6';

      try {
        console.log('Submitting offline form:', { visitorId, tenantId: CONFIG.tenantId, name, email });
        const response = await fetch(`${CONFIG.apiUrl}/widget/visitor/create-ticket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            visitorId: visitorId,
            tenantId: CONFIG.tenantId,
            name: name,
            email: email,
            phone: phone,
            message: message
          })
        });

        console.log('Response status:', response.status, response.statusText);
        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
          // Show success message
          addMessage('Thank you for your message! We\'ve received it and will get back to you soon.', 'system');
          
          // Remove form
          hideOfflineForm();
          
          // Show success notification
          submitBtn.textContent = 'Submitted! ✓';
          submitBtn.style.background = '#4caf50';
          
          setTimeout(() => {
            offlineForm.remove();
          }, 2000);
        } else {
          // Show error message with details
          const errorMsg = data.error || data.message || 'Failed to submit your message. Please try again.';
          console.error('Form submission failed:', data);
          alert(errorMsg + (data.details ? '\n\nCheck console for details.' : ''));
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit';
          submitBtn.style.opacity = '1';
        }
      } catch (error) {
        console.error('Error submitting offline form:', error);
        alert('An error occurred. Please check the console and backend logs for details.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
        submitBtn.style.opacity = '1';
      }
    });
  }

  // Hide offline form
  function hideOfflineForm() {
    const existingForm = document.getElementById('nxchat-offline-form');
    if (existingForm) {
      existingForm.remove();
    }
    
    // Show input area again
    if (inputField && inputField.parentNode) {
      inputField.parentNode.style.display = 'flex';
    }
  }

  // Show rating form after chat ends
  function showRatingForm() {
    console.log('showRatingForm called');
    
    // Remove existing rating form if any
    const existingForm = document.getElementById('nxchat-rating-form');
    if (existingForm) {
      existingForm.remove();
    }
    
    // Ensure input area is visible - don't hide it when showing rating form
    // This prevents layout from breaking
    ensureInputAreaVisible();

    // Create rating form
    const ratingForm = document.createElement('div');
    ratingForm.id = 'nxchat-rating-form';
    ratingForm.style.cssText = `
      margin-top: 16px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      position: relative;
      z-index: 2;
      pointer-events: auto;
    `;

    ratingForm.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #333;">How was your chat experience?</h3>
        <p style="margin: 0; font-size: 14px; color: #666;">Your feedback helps us improve</p>
      </div>
      
      <!-- Thumbs Rating -->
      <div style="display: flex; justify-content: center; gap: 24px; margin-bottom: 20px; pointer-events: auto;">
        <button type="button" class="rating-thumb" data-rating="1" style="
          background: none;
          border: 2px solid #ddd;
          border-radius: 50%;
          width: 64px;
          height: 64px;
          font-size: 32px;
          cursor: pointer;
          color: #ddd;
          transition: all 0.2s;
          pointer-events: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        ">👍</button>
        <button type="button" class="rating-thumb" data-rating="0" style="
          background: none;
          border: 2px solid #ddd;
          border-radius: 50%;
          width: 64px;
          height: 64px;
          font-size: 32px;
          cursor: pointer;
          color: #ddd;
          transition: all 0.2s;
          pointer-events: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        ">👎</button>
      </div>

      <!-- Feedback Textarea -->
      <textarea id="rating-feedback" placeholder="Tell us more about your experience (optional)" style="
        width: 100%;
        min-height: 80px;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        outline: none;
        box-sizing: border-box;
      "></textarea>

      <!-- Submit and Skip Buttons -->
      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button id="skip-rating" style="
          flex: 1;
          padding: 12px;
          background-color: #f0f0f0;
          color: #666;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        ">Skip</button>
        <button id="submit-rating" style="
          flex: 1;
          padding: 12px;
          background-color: ${CONFIG.theme.primaryColor};
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        ">Submit Feedback</button>
      </div>
    `;

    // Add to message container
    messageContainer.appendChild(ratingForm);

    // Auto-scroll to show the rating form
    setTimeout(() => {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 100);

    // Handle thumbs rating clicks
    let selectedRating = null;
    const thumbs = ratingForm.querySelectorAll('.rating-thumb');
    
    thumbs.forEach((thumb) => {
      const rating = parseInt(thumb.getAttribute('data-rating'));
      
      thumb.addEventListener('mouseover', function() {
        if (selectedRating === null || selectedRating === rating) {
          thumb.style.borderColor = rating === 1 ? '#4ade80' : '#f87171';
          thumb.style.color = rating === 1 ? '#4ade80' : '#f87171';
          thumb.style.transform = 'scale(1.1)';
        }
      });
      
      thumb.addEventListener('mouseout', function() {
        if (selectedRating !== rating) {
          thumb.style.borderColor = '#ddd';
          thumb.style.color = '#ddd';
          thumb.style.transform = 'scale(1)';
        }
      });
      
      const select = () => {
        // Reset all thumbs
        thumbs.forEach(t => {
          t.style.borderColor = '#ddd';
          t.style.color = '#ddd';
          t.style.transform = 'scale(1)';
        });
        
        // Highlight selected thumb
        selectedRating = rating;
        thumb.style.borderColor = rating === 1 ? '#22c55e' : '#ef4444';
        thumb.style.color = rating === 1 ? '#22c55e' : '#ef4444';
        thumb.style.transform = 'scale(1.1)';
      };
      
      thumb.addEventListener('click', select);
      thumb.addEventListener('touchstart', (e) => { e.preventDefault(); select(); });
    });

    // Handle skip button click
    document.getElementById('skip-rating').addEventListener('click', function() {
      // End chat without rating
      fetch(`${CONFIG.apiUrl}/widget/visitor/end-chat`, {
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
          // Remove rating form first
          ratingForm.remove();
          // Ensure input area layout is preserved
          ensureInputAreaVisible();
          // Re-enable AI for next chat
          resetChatStateForNewChat();
        }
      })
      .catch(error => {
        console.error('Error ending chat:', error);
        // Remove rating form even on error
        ratingForm.remove();
        // Ensure input area layout is preserved
        ensureInputAreaVisible();
        // Re-enable AI even on error
        resetChatStateForNewChat();
      });
    });

    // Handle form submission
    document.getElementById('submit-rating').addEventListener('click', function() {
      const feedback = document.getElementById('rating-feedback').value;
      
      if (selectedRating === null) {
        alert('Please select a rating');
        return;
      }

      // Disable submit button
      this.disabled = true;
      this.style.opacity = '0.5';
      this.textContent = 'Submitting...';

      // Submit rating
      fetch(`${CONFIG.apiUrl}/widget/visitor/end-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: visitorId,
          tenantId: CONFIG.tenantId,
          rating: selectedRating,
          feedback: feedback
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Show thank you message
          ratingForm.innerHTML = `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 48px; margin-bottom: 16px;">🙏</div>
              <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #333;">Thank you for your feedback!</h3>
              <p style="margin: 0; font-size: 14px; color: #666;">We appreciate your time</p>
            </div>
          `;
          
          // Re-enable AI for next chat
          resetChatStateForNewChat();
          
          // Remove form after 3 seconds and ensure input area is visible
          setTimeout(() => {
            ratingForm.remove();
            ensureInputAreaVisible();
          }, 3000);
        } else {
          alert('Failed to submit feedback. Please try again.');
          this.disabled = false;
          this.style.opacity = '1';
          this.textContent = 'Submit Feedback';
        }
      })
      .catch(error => {
        console.error('Error submitting rating:', error);
        alert('Failed to submit feedback. Please try again.');
        this.disabled = false;
        this.style.opacity = '1';
        this.textContent = 'Submit Feedback';
      });
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
        padding: 6px 16px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        color: #333;
        font-size: 14px;
        font-weight: 600;
      `;
      menuItem.innerHTML = `
        <span style="color: #000;">${option.icon}</span>
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
                    message.type === 'bot' ? (CONFIG.brand.name || CONFIG.ai.agentName || 'Assistant') : 
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

  // Send message with file attachment
  async function sendMessageWithFile(message, fileUrl, fileName, fileSize, messageType) {
    const currentVisitorId = visitorId || CONFIG.visitorId;
    if (!currentVisitorId || !CONFIG.tenantId) {
      console.error('Visitor ID or Tenant ID not available, cannot send message');
      addMessage('Error: Unable to send message. Please refresh the page.', 'system');
      return;
    }

    const messageData = {
      visitorId: currentVisitorId,
      tenantId: CONFIG.tenantId,
      message: message,
      sender: 'visitor',
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      message_type: messageType
    };

    try {
      console.log('Sending visitor message with file to backend:', messageData);
      
      const response = await fetch(CONFIG.apiUrl + '/widget/visitor/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
      });

      const data = await response.json();

      if (data.success) {
        console.log('Message with file sent successfully:', data);
        
        // Add message to local display
        const messageObj = {
          id: data.messageId || Date.now().toString(),
          content: message || `📎 ${fileName}`,
          type: 'user',
          timestamp: new Date().toISOString(),
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          message_type: messageType
        };
        
        addMessage(messageObj.content, 'user', {
          id: messageObj.id,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          message_type: messageType
        });
        
        // Clear input
        if (inputField) {
          inputField.value = '';
        }
        
        // Emit socket event for real-time updates
        if (socket && socket.connected) {
          const currentVisitorId = visitorId || CONFIG.visitorId;
          socket.emit('visitor:message', {
            visitorId: currentVisitorId,
            tenantId: CONFIG.tenantId,
            message: message,
            messageId: data.messageId,
            file_url: fileUrl,
            file_name: fileName,
            file_size: fileSize,
            message_type: messageType
          });
        }
      } else {
        console.error('Failed to send message:', data.message);
        addMessage('Failed to send message. Please try again.', 'system');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('Error sending message. Please try again.', 'system');
    }
  }

  // Send message
  async function sendMessage() {
    // Clear typing preview when message is sent
    if (socket && socket.connected && visitorId) {
      console.log('📤 Clearing typing content (message sent) for visitor:', visitorId);
      // Reset tracked content
      if (typeof lastEmittedContent !== 'undefined') {
        lastEmittedContent = '';
      }
      socket.emit('visitor:typing-content', {
        visitorId: visitorId,
        content: '',
        timestamp: new Date().toISOString()
      });
    }
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
    // Double-check that AI is enabled before proceeding
    if (!CONFIG.features.aiEnabled) {
      console.log('AI is disabled in widget settings, skipping AI response');
      addMessage('Thank you for your message. Our team will get back to you as soon as possible.', 'system');
      return;
    }

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
      <div>${CONFIG.brand.name || CONFIG.ai.agentName || 'Assistant'} is typing...</div>
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
        // Handle different error cases
        if (data.message && (data.message.includes('not available in your current plan') || 
            data.message.includes('not enabled for this tenant'))) {
          // AI is disabled or not available - show appropriate message
          addMessage('Thank you for your message. Our team will get back to you as soon as possible.', 'system');
          // Update CONFIG to reflect disabled state
          CONFIG.features.aiEnabled = false;
      } else {
        addMessage('Sorry, I encountered an error. Please try again or contact support.', 'bot');
        }
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
      
      // Re-check agent availability before transfer
      await checkAgentAvailability();
      
      if (!hasOnlineAgents) {
        // No agents available - show offline form instead
        console.log('No agents available - showing offline form');
        addMessage('I understand you\'d like to speak with a human agent. Unfortunately, no agents are currently available. Please fill out the form below and we\'ll get back to you.', 'bot');
        showOfflineForm();
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
        addMessage('I\'m transferring you to a human agent. An agent will be with you shortly. You can continue chatting with me while you wait.', 'system');
        
        // Hide offline form if it was shown
        hideOfflineForm();
        
        // DON'T set agentJoined = true or disable AI yet
        // The chat is in the transfer pool - no specific agent has joined yet
        // AI should remain enabled so visitor can continue chatting
        agentJoined = false;
        aiDisabled = false; // Keep AI enabled until agent actually joins
        chatSessionActive = true;
        
        // Update UI to show transfer in progress but AI still available
        updateChatHeader('AI Assistant');
        
        // Clear any existing timeout
        clearAgentResponseTimeout();
        
        // Note: Don't start agent response timeout since no agent has joined yet
        // The visitor is just waiting in the pool
      } else {
        // Agent assignment failed - show offline form
        console.log('Agent assignment failed - showing offline form');
        addMessage('I apologize, but I\'m unable to connect you with an agent right now. Please fill out the form below and we\'ll get back to you.', 'bot');
        showOfflineForm();
        console.error('Failed to request agent transfer:', data.message);
      }
    } catch (error) {
      console.error('Error requesting agent transfer:', error);
      addMessage('I apologize, but I\'m having trouble connecting you with an agent. Please fill out the form below and we\'ll get back to you.', 'bot');
      showOfflineForm();
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
        
        // Prefer brand logo; fall back to AI agent logo; then brand initial
        const brandLogo = CONFIG.brand.logo || CONFIG.settings?.logo_url;
        const brandName = CONFIG.brand.name || 'Support';
        if (brandLogo && brandLogo.trim() !== '') {
          avatar.innerHTML = `<img src="${brandLogo}" alt="${brandName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
        } else if (CONFIG.ai.agentLogo && CONFIG.ai.agentLogo.trim() !== '') {
          avatar.innerHTML = `<img src="${CONFIG.ai.agentLogo}" alt="${CONFIG.ai.agentName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
        } else {
          const initial = brandName.charAt(0).toUpperCase();
          avatar.style.background = CONFIG.theme.primaryColor;
          avatar.style.color = 'white';
          avatar.innerHTML = initial;
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
        // If AI is disabled, use brand name; otherwise use AI agent name
        if (!CONFIG.features.aiEnabled) {
          label.textContent = CONFIG.brand.name || 'Support';
        } else {
          label.textContent = CONFIG.ai.agentName;
        }
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
      ipAddress: getClientIP(),
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

  // Cached tracking data (computed once per page load)
  let cachedTrackingData = null;

  // Efficient UTM and tracking data extraction (cached for performance)
  function getTrackingData() {
    // Return cached data if available
    if (cachedTrackingData) {
      return cachedTrackingData;
    }

    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    const referrer = document.referrer;
    
    // Extract UTM parameters once
    const utmParams = {
      source: searchParams.get('utm_source'),
      medium: searchParams.get('utm_medium'),
      campaign: searchParams.get('utm_campaign'),
      content: searchParams.get('utm_content'),
      term: searchParams.get('utm_term')
    };
    
    // Initialize tracking data
    let source = 'Direct';
    let medium = 'none';
    let keyword = null;
    let searchEngine = null;
    
    // Priority: UTM parameters > Referrer analysis
    if (utmParams.source) {
      source = utmParams.source;
      medium = utmParams.medium || 'email';
      keyword = utmParams.term || null;
    } else if (referrer) {
      try {
        const refUrl = new URL(referrer);
        const hostname = refUrl.hostname.toLowerCase();
        const refSearchParams = refUrl.searchParams;
        
        // Search engine detection (optimized with early returns)
        const searchEngines = {
          'google.': { source: 'Google', param: 'q', func: null },
          'bing.': { source: 'Bing', param: 'q', func: null },
          'yahoo.': { source: 'Yahoo', param: 'p', func: null },
          'duckduckgo.': { source: 'DuckDuckGo', param: 'q', func: null },
          'baidu.': { source: 'Baidu', param: 'wd', func: null },
          'yandex.': { source: 'Yandex', param: 'text', func: null }
        };
        
        let found = false;
        for (const [domain, config] of Object.entries(searchEngines)) {
          if (hostname.includes(domain)) {
            source = config.source;
            medium = 'organic';
            searchEngine = config.source;
            keyword = config.func ? config.func(refUrl) : refSearchParams.get(config.param);
            if (keyword) {
              try {
                keyword = decodeURIComponent(keyword);
              } catch (e) {
                // Keep original if decode fails
              }
            }
            found = true;
            break;
          }
        }
        
        // Social media detection
        if (!found) {
          const socialNetworks = {
            'facebook.': { source: 'Facebook', medium: 'social' },
            'twitter.': { source: 'Twitter', medium: 'social' },
            'x.com': { source: 'Twitter', medium: 'social' },
            'linkedin.': { source: 'LinkedIn', medium: 'social' },
            'instagram.': { source: 'Instagram', medium: 'social' },
            'youtube.': { source: 'YouTube', medium: 'social' },
            'pinterest.': { source: 'Pinterest', medium: 'social' },
            'tiktok.': { source: 'TikTok', medium: 'social' }
          };
          
          for (const [domain, config] of Object.entries(socialNetworks)) {
            if (hostname.includes(domain)) {
              source = config.source;
              medium = config.medium;
              found = true;
              break;
            }
          }
        }
        
        // Default to referrer domain if not found
        if (!found) {
          source = hostname.replace('www.', '').split('.')[0];
          source = source.charAt(0).toUpperCase() + source.slice(1);
          medium = 'referral';
        }
      } catch (e) {
        console.error('Error parsing referrer:', e);
      }
    }
    
    // Get landing page (first page visited in session) - cache in sessionStorage
    let landingPage = sessionStorage.getItem('nxchat_landing_page');
    if (!landingPage) {
      landingPage = window.location.href;
      sessionStorage.setItem('nxchat_landing_page', landingPage);
    }
    
    // Cache and return the tracking data
    cachedTrackingData = {
      source: source,
      medium: medium,
      campaign: utmParams.campaign,
      content: utmParams.content,
      term: utmParams.term,
      keyword: keyword || utmParams.term || null,
      searchEngine: searchEngine,
      landingPage: landingPage
    };
    
    return cachedTrackingData;
  }

  // Clear tracking cache when needed (e.g., on navigation)
  function clearTrackingCache() {
    cachedTrackingData = null;
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

  // Fetch IP address and geolocation in real-time
  async function fetchIPAndLocation() {
    if (locationFetchInProgress) {
      console.log('Location fetch already in progress, waiting...');
      // Wait for existing fetch to complete (max 10 seconds)
      let waitCount = 0;
      while (locationFetchInProgress && waitCount < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitCount++;
      }
      if (visitorIP && visitorLocation.country && visitorLocation.country !== 'Unknown') {
        return; // Location already fetched
      }
    }
    
    locationFetchInProgress = true;
    console.log('Fetching IP and geolocation data from ip-api.com...');
    
    try {
      // Primary Service: ip-api.com (free, 45 requests/minute)
      // Using HTTPS endpoint for better security
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        // Fetch all available fields from ip-api.com
        const response = await fetch('http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,mobile,proxy,hosting', {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'success') {
            // Get IP address from response
            if (data.query && !visitorIP) {
              visitorIP = data.query;
              console.log('IP address fetched from ip-api.com:', visitorIP);
            }
            
            // Map ip-api.com response to visitor location object
            visitorLocation.country = data.country || 'Unknown';
            visitorLocation.city = data.city || 'Unknown';
            visitorLocation.region = data.regionName || data.region || 'Unknown';
            visitorLocation.timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
            visitorLocation.zip = data.zip || null;
            visitorLocation.lat = data.lat || null;
            visitorLocation.lon = data.lon || null;
            visitorLocation.isp = data.isp || null;
            visitorLocation.org = data.org || null;
            visitorLocation.as = data.as || null;
            visitorLocation.mobile = data.mobile || false;
            visitorLocation.proxy = data.proxy || false;
            visitorLocation.hosting = data.hosting || false;
            
            console.log('Location fetched from ip-api.com:', visitorLocation);
            locationFetchInProgress = false;
            
            // Update visitor in database with fetched data
            updateVisitorWithLocation();
            return;
          } else {
            console.warn('ip-api.com returned error:', data.message || 'Unknown error');
          }
        }
      } catch (error) {
        console.warn('ip-api.com service failed, trying fallback:', error);
      }
      
      // Fallback Service: ipapi.co (free, 1000 requests/day)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch('https://ipapi.co/json/', {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.ip && !visitorIP) {
            visitorIP = data.ip;
            console.log('IP address fetched from fallback:', visitorIP);
          }
          
          if (data.country_name || data.country_code) {
            visitorLocation.country = data.country_name || data.country || 'Unknown';
            visitorLocation.city = data.city || 'Unknown';
            visitorLocation.region = data.region || data.region_code || 'Unknown';
            visitorLocation.timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            console.log('Location fetched from fallback:', visitorLocation);
            locationFetchInProgress = false;
            
            // Update visitor in database with fetched data
            updateVisitorWithLocation();
            return;
          }
        }
      } catch (error) {
        console.warn('Fallback service failed:', error);
      }
      
      // Fallback: Try backend endpoint to get IP
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${CONFIG.apiUrl}/widget/visitor/ip`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.ip) {
            visitorIP = data.ip;
            console.log('IP address fetched from backend:', visitorIP);
            updateVisitorWithLocation();
          }
        }
      } catch (error) {
        console.warn('Backend IP service failed:', error);
      }
      
      // Final fallback: Use timezone only
      visitorLocation.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.warn('Could not fetch complete location data, using timezone only');
      locationFetchInProgress = false;
      
    } catch (error) {
      console.error('Error fetching IP and location:', error);
      locationFetchInProgress = false;
    }
  }

  // Update visitor in database with fetched location data
  async function updateVisitorWithLocation() {
    if (!visitorId || !CONFIG.tenantId) {
      console.log('Cannot update visitor location: missing visitorId or tenantId');
      return;
    }
    
    // Only update if we have valid location data
    if (!visitorLocation || !visitorLocation.country || visitorLocation.country === 'Unknown') {
      console.log('No valid location data to update, skipping...');
      return;
    }
    
    try {
      const visitorInfo = getVisitorInfo();
      const trackingData = getTrackingData();
      const response = await fetch(`${CONFIG.apiUrl}/widget/visitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorId: visitorId,
          sessionId: sessionId || visitorInfo.sessionId,
          tenantId: CONFIG.tenantId,
          ipAddress: visitorIP || visitorInfo.ipAddress,
          location: visitorLocation, // Send full location object
          currentPage: window.location.href,
          referrer: document.referrer || 'Direct',
          device: visitorInfo.device,
          userAgent: visitorInfo.userAgent,
          // Include UTM tracking data
          source: trackingData.source,
          medium: trackingData.medium,
          campaign: trackingData.campaign,
          content: trackingData.content,
          term: trackingData.term,
          keyword: trackingData.keyword,
          searchEngine: trackingData.searchEngine,
          landingPage: trackingData.landingPage
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Visitor location updated in database:', {
          ip: visitorIP,
          country: visitorLocation.country,
          city: visitorLocation.city,
          region: visitorLocation.region
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        
        // Check if visitor is banned
        if (response.status === 403 && errorData.banned) {
          console.warn('Visitor IP is banned, hiding widget');
          hideWidgetCompletely();
          return;
        }
        
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn('Failed to update visitor location:', response.status, errorText);
      }
    } catch (error) {
      console.warn('Error updating visitor location:', error);
    }
  }

  // Get client IP address
  function getClientIP() {
    return visitorIP || 'Unknown';
  }

  // Get visitor location information
  function getVisitorLocation() {
    // Return the full location object if it has valid data
    if (visitorLocation && visitorLocation.country && visitorLocation.country !== 'Unknown') {
      return visitorLocation;
    }
    // Otherwise return minimal structure
    return {
      country: visitorLocation?.country || 'Unknown',
      city: visitorLocation?.city || 'Unknown',
      region: visitorLocation?.region || 'Unknown',
      timezone: visitorLocation?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
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

  async function initVisitorTracking() {
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
    
    // Always generate new session ID for each page load
    // (session ID represents a single browser session)
    sessionId = generateSessionId();
    // Store session ID for this session
    localStorage.setItem(`nxchat_session_id_${CONFIG.tenantId}`, sessionId);
    console.log('Generated new session ID:', sessionId);
    
    // Fetch IP and location data if not already fetched - WAIT for it before creating visitor
    if (!visitorIP || !visitorLocation.country || visitorLocation.country === 'Unknown') {
      console.log('Fetching IP and location before creating visitor...');
      await fetchIPAndLocation();
    }
    
    // Try to join visitor room if socket is already connected
    ensureVisitorRoomJoined();

    // Create or update visitor in database WITH location data
    await createOrUpdateVisitor(isReturningVisitor);

    // Track initial page view
    trackVisitorActivity();

    // Track page unload - use multiple events for better detection
    window.addEventListener('beforeunload', () => {
      updateVisitorStatus('offline');
      // Clear session ID on page unload (but keep visitor ID)
      localStorage.removeItem(`nxchat_session_id_${CONFIG.tenantId}`);
    });
    
    // Also track pagehide event (more reliable than beforeunload)
    window.addEventListener('pagehide', () => {
      updateVisitorStatus('offline');
      // Disconnect socket if still connected
      if (socket && socket.connected) {
        socket.disconnect();
      }
    });
    
    // Track visibility change - when tab becomes hidden, mark as away
    // When tab is closed, browser will trigger pagehide/beforeunload
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab is now hidden - could be minimized, switched tab, or closing
        // Use a timeout to detect if it's actually closing
        setTimeout(() => {
          // If still hidden after 2 seconds, might be closing
          // But we'll rely on pagehide/beforeunload for actual closes
          if (document.hidden) {
            updateVisitorStatus('away');
          }
        }, 2000);
      } else {
        // Tab is visible again
        updateVisitorStatus('online');
        trackVisitorActivity();
      }
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
          isReturning: isReturningVisitor,
          // Include UTM tracking data
          source: visitorInfo.source,
          medium: visitorInfo.medium,
          campaign: visitorInfo.campaign,
          content: visitorInfo.content,
          term: visitorInfo.term,
          keyword: visitorInfo.keyword,
          searchEngine: visitorInfo.searchEngine,
          landingPage: visitorInfo.landingPage
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
        const errorData = await response.json().catch(() => ({}));
        
        // Check if visitor is banned
        if (response.status === 403 && errorData.banned) {
          console.warn('Visitor IP is banned, hiding widget');
          hideWidgetCompletely();
          return;
        }
        
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