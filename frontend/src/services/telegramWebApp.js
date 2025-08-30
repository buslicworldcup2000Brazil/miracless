// Telegram Web App integration service with comprehensive error handling and graceful degradation
const TELEGRAM_WEBAPP_VERSION = '6.0';

class TelegramWebAppService {
  constructor() {
    this.webApp = null;
    this.userData = null;
    this.initData = null;
    this.isInitialized = false;
    this.isInTelegram = false;
    this.environment = 'unknown';
    this.initAttempts = 0;
    this.maxInitAttempts = 3;
    this.initPromise = null;
    this.eventListeners = new Map();

    // Bind methods to preserve context
    this.handleWebAppReady = this.handleWebAppReady.bind(this);
    this.handleViewportChanged = this.handleViewportChanged.bind(this);
    this.handleThemeChanged = this.handleThemeChanged.bind(this);
  }

  // Comprehensive logging utility
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[TelegramWebApp ${timestamp}] ${message}`;

    switch (level) {
      case 'error':
        console.error(logMessage, data);
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'info':
        console.info(logMessage, data);
        break;
      case 'debug':
        console.debug(logMessage, data);
        break;
      default:
        console.log(logMessage, data);
    }
  }

  // Detailed environment detection
  detectEnvironment() {
    if (typeof window === 'undefined') {
      this.environment = 'server';
      return false;
    }

    // Check for Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
      this.environment = 'telegram';
      this.isInTelegram = true;
      return true;
    }

    // Check for Telegram Web View (older versions)
    if (window.TelegramWebviewProxy) {
      this.environment = 'telegram-webview';
      this.isInTelegram = true;
      return true;
    }

    // Check for development/testing environment
    const isLocalhost = window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('.local');

    if (isLocalhost) {
      this.environment = 'development';
      return false;
    }

    this.environment = 'production-browser';
    return false;
  }

  // Initialize Telegram Web App with comprehensive error handling
  async init() {
    // Prevent multiple initialization attempts
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initInternal();
    return this.initPromise;
  }

  async _initInternal() {
    try {
      this.initAttempts++;
      this.log('info', `Initialization attempt ${this.initAttempts}/${this.maxInitAttempts}`);

      // Detect environment
      const isTelegramAvailable = this.detectEnvironment();

      if (!isTelegramAvailable) {
        this.log('warn', `Telegram Web App not available. Environment: ${this.environment}`);
        return this.initializeFallback();
      }

      // Initialize real Telegram Web App
      return await this.initializeTelegramWebApp();

    } catch (error) {
      this.log('error', 'Critical error during initialization', {
        error: error.message,
        stack: error.stack,
        environment: this.environment,
        attempts: this.initAttempts
      });

      // Try fallback if we haven't exceeded max attempts
      if (this.initAttempts < this.maxInitAttempts) {
        this.log('warn', 'Attempting fallback initialization');
        return this.initializeFallback();
      }

      // Complete failure
      this.isInitialized = false;
      return false;
    }
  }

  // Initialize real Telegram Web App
  async initializeTelegramWebApp() {
    try {
      this.webApp = window.Telegram.WebApp;

      // Validate WebApp object
      if (!this.webApp) {
        throw new Error('Telegram.WebApp is null or undefined');
      }

      // Check required properties
      if (!this.webApp.initDataUnsafe) {
        this.log('warn', 'initDataUnsafe not available, using empty data');
        this.initData = '';
        this.userData = null;
      } else {
        this.initData = this.webApp.initData || '';
        this.userData = this.webApp.initDataUnsafe.user || null;
      }

      // Set initialization flag
      this.isInitialized = true;

      // Configure WebApp
      await this.configureWebApp();

      // Setup event listeners
      this.setupEventListeners();

      this.log('info', 'Telegram Web App initialized successfully', {
        version: this.webApp.version,
        platform: this.webApp.platform,
        colorScheme: this.webApp.colorScheme,
        viewportHeight: this.webApp.viewportHeight,
        isExpanded: this.webApp.isExpanded,
        hasUser: !!this.userData
      });

      return true;

    } catch (error) {
      this.log('error', 'Failed to initialize Telegram Web App', {
        error: error.message,
        webApp: !!this.webApp,
        initDataUnsafe: !!(this.webApp?.initDataUnsafe),
        user: !!(this.webApp?.initDataUnsafe?.user)
      });
      throw error;
    }
  }

  // Configure WebApp settings
  async configureWebApp() {
    if (!this.webApp) return;

    try {
      // Expand to full screen
      if (typeof this.webApp.expand === 'function') {
        this.webApp.expand();
        this.log('debug', 'WebApp expanded to full screen');
      }

      // Set header color
      if (typeof this.webApp.setHeaderColor === 'function') {
        this.webApp.setHeaderColor('#1e40af');
        this.log('debug', 'Header color set to #1e40af');
      }

      // Set background color to match our theme
      if (typeof this.webApp.setBackgroundColor === 'function') {
        this.webApp.setBackgroundColor('#0f0f0f');
        this.log('debug', 'Background color set to #0f0f0f');
      }

      // Enable closing confirmation if needed
      if (typeof this.webApp.enableClosingConfirmation === 'function') {
        this.webApp.enableClosingConfirmation();
        this.log('debug', 'Closing confirmation enabled');
      }

    } catch (error) {
      this.log('warn', 'Error configuring WebApp', error);
    }
  }

  // Setup event listeners for WebApp events
  setupEventListeners() {
    if (!this.webApp) return;

    try {
      // WebApp ready event
      if (typeof this.webApp.onEvent === 'function') {
        this.webApp.onEvent('webAppReady', this.handleWebAppReady);
        this.webApp.onEvent('viewportChanged', this.handleViewportChanged);
        this.webApp.onEvent('themeChanged', this.handleThemeChanged);
        this.log('debug', 'WebApp event listeners set up');
      }

      // Fallback for older versions
      if (this.webApp.onViewportChanged) {
        this.webApp.onViewportChanged(this.handleViewportChanged);
      }

    } catch (error) {
      this.log('warn', 'Error setting up event listeners', error);
    }
  }

  // Event handlers
  handleWebAppReady() {
    this.log('info', 'WebApp ready event received');
  }

  handleViewportChanged() {
    this.log('debug', 'Viewport changed', {
      height: this.webApp?.viewportHeight,
      isExpanded: this.webApp?.isExpanded
    });
  }

  handleThemeChanged() {
    this.log('debug', 'Theme changed', {
      colorScheme: this.webApp?.colorScheme
    });
  }

  // Initialize fallback for development/testing
  initializeFallback() {
    this.log('info', 'Initializing fallback mode for development/testing');

    // Create comprehensive mock WebApp object
    this.webApp = this.createMockWebApp();
    this.initData = '';
    this.userData = this.webApp.initDataUnsafe.user;
    this.isInitialized = true;
    this.isInTelegram = false;

    this.log('info', 'Fallback mode initialized successfully', {
      environment: this.environment,
      mockUser: this.userData
    });

    return true;
  }

  // Create comprehensive mock WebApp object
  createMockWebApp() {
    return {
      version: TELEGRAM_WEBAPP_VERSION,
      platform: this.environment,
      initData: '',
      initDataUnsafe: {
        user: {
          id: 123456789,
          username: 'test_user',
          first_name: 'Test',
          last_name: 'User',
          language_code: 'en',
          is_premium: false,
          photo_url: null
        },
        chat: null,
        can_send_after: null
      },

      // Core methods
      expand: () => {
        this.log('debug', 'Mock: expand() called');
        document.body.style.height = '100vh';
      },

      close: () => {
        this.log('debug', 'Mock: close() called');
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      },

      // UI methods
      setHeaderColor: (color) => {
        this.log('debug', 'Mock: setHeaderColor() called', color);
        // Could update a mock header element
      },

      setBackgroundColor: (color) => {
        this.log('debug', 'Mock: setBackgroundColor() called', color);
        document.body.style.backgroundColor = color;
      },

      enableClosingConfirmation: () => {
        this.log('debug', 'Mock: enableClosingConfirmation() called');
      },

      // Alert methods
      showAlert: (message) => {
        this.log('debug', 'Mock: showAlert() called', message);
        alert(message);
      },

      showConfirm: (message, callback) => {
        this.log('debug', 'Mock: showConfirm() called', message);
        const result = confirm(message);
        if (typeof callback === 'function') {
          callback(result);
        }
      },

      showPopup: (params, callback) => {
        this.log('debug', 'Mock: showPopup() called', params);
        const result = confirm(params.message || 'Confirm action?');
        if (typeof callback === 'function') {
          callback({ button_id: result ? 'ok' : 'cancel' });
        }
      },

      // Haptic feedback
      HapticFeedback: {
        impactOccurred: (type) => {
          this.log('debug', 'Mock: HapticFeedback.impactOccurred()', type);
          // Could trigger visual feedback
        },
        notificationOccurred: (type) => {
          this.log('debug', 'Mock: HapticFeedback.notificationOccurred()', type);
        },
        selectionChanged: () => {
          this.log('debug', 'Mock: HapticFeedback.selectionChanged()');
        }
      },

      // Properties
      colorScheme: 'dark',
      viewportHeight: window.innerHeight,
      isExpanded: true,
      themeParams: {
        bg_color: '#0f0f0f',
        text_color: '#ffffff',
        hint_color: '#b0b0b0',
        link_color: '#6366f1',
        button_color: '#6366f1',
        button_text_color: '#ffffff'
      },

      // Event system (mock)
      onEvent: (eventType, callback) => {
        this.log('debug', 'Mock: onEvent() registered', eventType);
        if (!this.eventListeners.has(eventType)) {
          this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
      },

      offEvent: (eventType, callback) => {
        this.log('debug', 'Mock: offEvent() called', eventType);
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
      }
    };
  }

  // Get user data from Telegram with enhanced error handling
  getUserData() {
    try {
      if (!this.isInitialized) {
        this.log('warn', 'getUserData called before initialization, attempting to initialize');
        const initResult = this.init();
        if (!initResult) {
          this.log('error', 'Failed to initialize for getUserData');
          return this.getFallbackUserData();
        }
      }

      if (!this.userData) {
        this.log('warn', 'No user data available');
        return this.getFallbackUserData();
      }

      const userData = {
        telegram_id: this.userData.id?.toString() || '',
        username: this.userData.username || '',
        first_name: this.userData.first_name || '',
        last_name: this.userData.last_name || '',
        language_code: this.userData.language_code || 'en',
        photo_url: this.userData.photo_url || null,
        is_premium: this.userData.is_premium || false,
        // Additional fields for enhanced functionality
        allows_write_to_pm: this.userData.allows_write_to_pm || false,
        added_to_attachment_menu: this.userData.added_to_attachment_menu || false
      };

      this.log('debug', 'User data retrieved successfully', {
        hasId: !!userData.telegram_id,
        hasUsername: !!userData.username,
        isPremium: userData.is_premium
      });

      return userData;

    } catch (error) {
      this.log('error', 'Error getting user data', error);
      return this.getFallbackUserData();
    }
  }

  // Get fallback user data for development/testing
  getFallbackUserData() {
    const fallbackData = {
      telegram_id: '123456789',
      username: 'test_user',
      first_name: 'Test',
      last_name: 'User',
      language_code: 'en',
      photo_url: null,
      is_premium: false,
      allows_write_to_pm: true,
      added_to_attachment_menu: false
    };

    this.log('info', 'Using fallback user data', fallbackData);
    return fallbackData;
  }

  // Download and save user avatar with enhanced error handling
  async downloadUserAvatar(userId, photoUrl) {
    if (!photoUrl) {
      this.log('warn', 'No photo URL provided for avatar download');
      return null;
    }

    try {
      this.log('info', 'Starting avatar download', { userId, photoUrl });

      const response = await fetch(photoUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const blob = await response.blob();
      const formData = new FormData();
      formData.append('avatar', blob, `avatar_${userId}.jpg`);
      formData.append('userId', userId);
      formData.append('contentType', contentType);

      this.log('info', 'Uploading avatar to backend', {
        size: blob.size,
        type: contentType
      });

      // Upload to backend with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const uploadResponse = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      const result = await uploadResponse.json();

      if (!result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      this.log('info', 'Avatar uploaded successfully', {
        avatarUrl: result.avatarUrl
      });

      return result.avatarUrl;

    } catch (error) {
      this.log('error', 'Error downloading/uploading avatar', {
        error: error.message,
        userId,
        photoUrl
      });

      if (error.name === 'AbortError') {
        this.log('error', 'Avatar upload timeout');
      }

      return null;
    }
  }

  // Get init data for backend validation
  getInitData() {
    try {
      if (!this.isInitialized) {
        this.log('warn', 'getInitData called before initialization');
        return '';
      }

      return this.initData || '';
    } catch (error) {
      this.log('error', 'Error getting init data', error);
      return '';
    }
  }

  // Check if running in Telegram
  isInTelegram() {
    return this.isInTelegram && this.isInitialized && !!this.webApp;
  }

  // Get initialization status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isInTelegram: this.isInTelegram,
      environment: this.environment,
      initAttempts: this.initAttempts,
      hasWebApp: !!this.webApp,
      hasUserData: !!this.userData,
      webAppVersion: this.webApp?.version || null,
      platform: this.webApp?.platform || null
    };
  }

  // Show alert with enhanced error handling
  showAlert(message) {
    try {
      if (!message || typeof message !== 'string') {
        this.log('warn', 'Invalid message for showAlert', { message });
        message = 'An error occurred';
      }

      if (this.webApp && typeof this.webApp.showAlert === 'function') {
        this.webApp.showAlert(message);
        this.log('debug', 'Telegram alert shown', { message });
      } else {
        alert(message);
        this.log('debug', 'Browser alert shown', { message });
      }
    } catch (error) {
      this.log('error', 'Error showing alert', error);
      // Fallback to browser alert
      alert(message);
    }
  }

  // Show confirmation with enhanced error handling
  showConfirm(message, callback) {
    try {
      if (!message || typeof message !== 'string') {
        this.log('warn', 'Invalid message for showConfirm', { message });
        message = 'Confirm action?';
      }

      if (this.webApp && typeof this.webApp.showConfirm === 'function') {
        this.webApp.showConfirm(message, (result) => {
          this.log('debug', 'Telegram confirmation result', { result });
          if (typeof callback === 'function') {
            callback(result);
          }
        });
      } else {
        const result = confirm(message);
        this.log('debug', 'Browser confirmation result', { result });
        if (typeof callback === 'function') {
          callback(result);
        }
      }
    } catch (error) {
      this.log('error', 'Error showing confirmation', error);
      // Fallback to browser confirm
      const result = confirm(message);
      if (typeof callback === 'function') {
        callback(result);
      }
    }
  }

  // Show popup with enhanced functionality
  showPopup(params, callback) {
    try {
      if (!params || typeof params !== 'object') {
        this.log('warn', 'Invalid params for showPopup', { params });
        return;
      }

      if (this.webApp && typeof this.webApp.showPopup === 'function') {
        this.webApp.showPopup(params, (result) => {
          this.log('debug', 'Telegram popup result', result);
          if (typeof callback === 'function') {
            callback(result);
          }
        });
      } else {
        // Fallback to browser confirm
        const message = params.message || params.title || 'Confirm action?';
        const result = confirm(message);
        if (typeof callback === 'function') {
          callback({ button_id: result ? 'ok' : 'cancel' });
        }
      }
    } catch (error) {
      this.log('error', 'Error showing popup', error);
      if (typeof callback === 'function') {
        callback({ button_id: 'cancel' });
      }
    }
  }

  // Close the app with enhanced error handling
  close() {
    try {
      if (this.webApp && typeof this.webApp.close === 'function') {
        this.webApp.close();
        this.log('info', 'Telegram WebApp closed');
      } else {
        this.log('warn', 'WebApp close not available, using browser fallback');
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      }
    } catch (error) {
      this.log('error', 'Error closing app', error);
    }
  }

  // Get platform info with fallback
  getPlatform() {
    try {
      return this.webApp?.platform || this.environment || 'unknown';
    } catch (error) {
      this.log('error', 'Error getting platform', error);
      return 'unknown';
    }
  }

  // Check if app is expanded
  isExpanded() {
    try {
      return this.webApp?.isExpanded || false;
    } catch (error) {
      this.log('error', 'Error checking expansion status', error);
      return false;
    }
  }

  // Get viewport height with fallback
  getViewportHeight() {
    try {
      return this.webApp?.viewportHeight || window.innerHeight || 0;
    } catch (error) {
      this.log('error', 'Error getting viewport height', error);
      return window.innerHeight || 0;
    }
  }

  // Get theme parameters
  getThemeParams() {
    try {
      return this.webApp?.themeParams || {
        bg_color: '#0f0f0f',
        text_color: '#ffffff',
        hint_color: '#b0b0b0',
        link_color: '#6366f1',
        button_color: '#6366f1',
        button_text_color: '#ffffff'
      };
    } catch (error) {
      this.log('error', 'Error getting theme params', error);
      return {};
    }
  }

  // Get color scheme
  getColorScheme() {
    try {
      return this.webApp?.colorScheme || 'dark';
    } catch (error) {
      this.log('error', 'Error getting color scheme', error);
      return 'dark';
    }
  }

  // Haptic feedback with enhanced error handling
  hapticFeedback(type = 'light') {
    try {
      if (!this.webApp?.HapticFeedback) {
        this.log('debug', 'Haptic feedback not available');
        return;
      }

      switch (type) {
        case 'light':
          this.webApp.HapticFeedback.impactOccurred('light');
          break;
        case 'medium':
          this.webApp.HapticFeedback.impactOccurred('medium');
          break;
        case 'heavy':
          this.webApp.HapticFeedback.impactOccurred('heavy');
          break;
        case 'success':
          this.webApp.HapticFeedback.notificationOccurred('success');
          break;
        case 'error':
          this.webApp.HapticFeedback.notificationOccurred('error');
          break;
        case 'warning':
          this.webApp.HapticFeedback.notificationOccurred('warning');
          break;
        default:
          this.webApp.HapticFeedback.selectionChanged();
      }

      this.log('debug', 'Haptic feedback triggered', { type });

    } catch (error) {
      this.log('error', 'Error triggering haptic feedback', error);
    }
  }

  // Send data to bot
  sendData(data) {
    try {
      if (!this.webApp || typeof this.webApp.sendData !== 'function') {
        this.log('warn', 'sendData not available');
        return false;
      }

      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      this.webApp.sendData(dataString);
      this.log('info', 'Data sent to bot', { dataLength: dataString.length });
      return true;

    } catch (error) {
      this.log('error', 'Error sending data', error);
      return false;
    }
  }

  // Switch inline query
  switchInlineQuery(query, chooseChatTypes = []) {
    try {
      if (!this.webApp || typeof this.webApp.switchInlineQuery !== 'function') {
        this.log('warn', 'switchInlineQuery not available');
        return false;
      }

      this.webApp.switchInlineQuery(query, chooseChatTypes);
      this.log('info', 'Switched to inline query', { query, chooseChatTypes });
      return true;

    } catch (error) {
      this.log('error', 'Error switching inline query', error);
      return false;
    }
  }

  // Open link
  openLink(url, options = {}) {
    try {
      if (!url || typeof url !== 'string') {
        this.log('warn', 'Invalid URL for openLink', { url });
        return false;
      }

      if (this.webApp && typeof this.webApp.openLink === 'function') {
        this.webApp.openLink(url, options);
        this.log('info', 'Link opened via Telegram', { url, options });
      } else {
        window.open(url, options.target || '_blank');
        this.log('info', 'Link opened via browser', { url, options });
      }

      return true;

    } catch (error) {
      this.log('error', 'Error opening link', error);
      return false;
    }
  }

  // Open Telegram link
  openTelegramLink(url) {
    try {
      if (!url || typeof url !== 'string') {
        this.log('warn', 'Invalid URL for openTelegramLink', { url });
        return false;
      }

      if (this.webApp && typeof this.webApp.openTelegramLink === 'function') {
        this.webApp.openTelegramLink(url);
        this.log('info', 'Telegram link opened', { url });
      } else {
        this.openLink(url);
      }

      return true;

    } catch (error) {
      this.log('error', 'Error opening Telegram link', error);
      return false;
    }
  }

  // Share URL
  shareUrl(url, text = '') {
    try {
      if (!url || typeof url !== 'string') {
        this.log('warn', 'Invalid URL for shareUrl', { url });
        return false;
      }

      if (this.webApp && typeof this.webApp.shareUrl === 'function') {
        this.webApp.shareUrl(url, text);
        this.log('info', 'URL shared via Telegram', { url, text });
      } else {
        // Fallback to Web Share API if available
        if (navigator.share) {
          navigator.share({ url, text });
          this.log('info', 'URL shared via Web Share API', { url, text });
        } else {
          this.openLink(url);
        }
      }

      return true;

    } catch (error) {
      this.log('error', 'Error sharing URL', error);
      return false;
    }
  }

  // Read text from clipboard
  async readTextFromClipboard() {
    try {
      if (this.webApp && typeof this.webApp.readTextFromClipboard === 'function') {
        return new Promise((resolve) => {
          this.webApp.readTextFromClipboard((text) => {
            this.log('debug', 'Text read from clipboard via Telegram');
            resolve(text);
          });
        });
      } else {
        // Fallback to Clipboard API
        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          const text = await navigator.clipboard.readText();
          this.log('debug', 'Text read from clipboard via Clipboard API');
          return text;
        } else {
          this.log('warn', 'Clipboard API not available');
          return '';
        }
      }
    } catch (error) {
      this.log('error', 'Error reading from clipboard', error);
      return '';
    }
  }

  // Request write access to clipboard
  requestWriteAccess(callback) {
    try {
      if (this.webApp && typeof this.webApp.requestWriteAccess === 'function') {
        this.webApp.requestWriteAccess((granted) => {
          this.log('debug', 'Write access request result', { granted });
          if (typeof callback === 'function') {
            callback(granted);
          }
        });
      } else {
        // Assume write access is granted in browser
        this.log('debug', 'Write access assumed granted (browser fallback)');
        if (typeof callback === 'function') {
          callback(true);
        }
      }
    } catch (error) {
      this.log('error', 'Error requesting write access', error);
      if (typeof callback === 'function') {
        callback(false);
      }
    }
  }

  // Request contact
  requestContact(callback) {
    try {
      if (this.webApp && typeof this.webApp.requestContact === 'function') {
        this.webApp.requestContact((contact) => {
          this.log('debug', 'Contact request result', { hasContact: !!contact });
          if (typeof callback === 'function') {
            callback(contact);
          }
        });
      } else {
        this.log('warn', 'Contact request not available');
        if (typeof callback === 'function') {
          callback(null);
        }
      }
    } catch (error) {
      this.log('error', 'Error requesting contact', error);
      if (typeof callback === 'function') {
        callback(null);
      }
    }
  }

  // Get current status summary
  getStatusSummary() {
    const status = this.getStatus();
    return {
      ...status,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer
    };
  }

  // Cleanup method
  destroy() {
    try {
      // Remove event listeners
      this.eventListeners.clear();

      // Reset state
      this.webApp = null;
      this.userData = null;
      this.initData = null;
      this.isInitialized = false;
      this.isInTelegram = false;
      this.initPromise = null;

      this.log('info', 'TelegramWebApp service destroyed');
    } catch (error) {
      this.log('error', 'Error during destruction', error);
    }
  }
}

// Create singleton instance with enhanced error handling
let telegramWebAppInstance = null;

const createTelegramWebAppInstance = () => {
  if (!telegramWebAppInstance) {
    try {
      telegramWebAppInstance = new TelegramWebAppService();
    } catch (error) {
      console.error('[TelegramWebApp] Failed to create instance:', error);
      // Return a minimal fallback instance
      telegramWebAppInstance = {
        init: () => Promise.resolve(false),
        getUserData: () => null,
        isInTelegram: () => false,
        showAlert: (message) => alert(message),
        log: (level, message) => console[level]?.(message)
      };
    }
  }
  return telegramWebAppInstance;
};

// Export singleton instance
const telegramWebApp = createTelegramWebAppInstance();

export default telegramWebApp;

// Export class for advanced usage
export { TelegramWebAppService };

// Export utility functions
export const getTelegramWebAppStatus = () => telegramWebApp.getStatusSummary();
export const isTelegramWebAppAvailable = () => telegramWebApp.isInTelegram();
export const getCurrentUser = () => telegramWebApp.getUserData();