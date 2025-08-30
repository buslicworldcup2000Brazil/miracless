// Telegram Web App integration service
const TELEGRAM_WEBAPP_VERSION = '6.0';

class TelegramWebAppService {
  constructor() {
    this.webApp = null;
    this.userData = null;
    this.initData = null;
    this.isInitialized = false;
  }

  // Initialize Telegram Web App
  init() {
    // Check if running in Telegram Web App
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      try {
        this.webApp = window.Telegram.WebApp;
        this.initData = this.webApp.initData;
        this.userData = this.webApp.initDataUnsafe?.user;
        this.isInitialized = true;

        // Expand the app to full screen
        if (this.webApp.expand) {
          this.webApp.expand();
        }

        // Set header color
        if (this.webApp.setHeaderColor) {
          this.webApp.setHeaderColor('#1e40af');
        }

        console.log('Telegram Web App initialized:', {
          version: this.webApp.version,
          platform: this.webApp.platform,
          user: this.userData
        });

        return true;
      } catch (error) {
        console.error('Error initializing Telegram Web App:', error);
        return false;
      }
    }

    // Fallback for development/testing - simulate Telegram Web App
    console.warn('Telegram Web App not available, using development mode');

    // Create mock WebApp object for development
    this.webApp = {
      version: '6.0',
      platform: 'development',
      initData: '',
      initDataUnsafe: {
        user: {
          id: 123456789,
          username: 'test_user',
          first_name: 'Test',
          last_name: 'User',
          language_code: 'en',
          is_premium: false
        }
      },
      expand: () => console.log('Mock expand called'),
      setHeaderColor: (color) => console.log('Mock setHeaderColor called:', color),
      showAlert: (message) => alert(message),
      showConfirm: (message, callback) => {
        const result = confirm(message);
        callback(result);
      },
      close: () => console.log('Mock close called'),
      HapticFeedback: {
        impactOccurred: (type) => console.log('Mock haptic feedback:', type),
        notificationOccurred: (type) => console.log('Mock notification feedback:', type),
        selectionChanged: () => console.log('Mock selection changed')
      }
    };

    this.initData = '';
    this.userData = this.webApp.initDataUnsafe.user;
    this.isInitialized = true;

    return true;
  }

  // Get user data from Telegram
  getUserData() {
    if (!this.isInitialized) {
      this.init();
    }

    if (this.userData) {
      return {
        telegram_id: this.userData.id.toString(),
        username: this.userData.username || '',
        first_name: this.userData.first_name || '',
        last_name: this.userData.last_name || '',
        language_code: this.userData.language_code || 'en',
        photo_url: this.userData.photo_url || null,
        is_premium: this.userData.is_premium || false
      };
    }

    return null;
  }

  // Download and save user avatar
  async downloadUserAvatar(userId, photoUrl) {
    if (!photoUrl) return null;

    try {
      const response = await fetch(photoUrl);
      if (!response.ok) throw new Error('Failed to download avatar');

      const blob = await response.blob();
      const formData = new FormData();
      formData.append('avatar', blob, `avatar_${userId}.jpg`);
      formData.append('userId', userId);

      // Upload to backend
      const uploadResponse = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload avatar');

      const result = await uploadResponse.json();
      return result.avatarUrl;
    } catch (error) {
      console.error('Error downloading avatar:', error);
      return null;
    }
  }

  // Get init data for backend validation
  getInitData() {
    return this.initData;
  }

  // Check if running in Telegram
  isInTelegram() {
    return this.isInitialized && this.webApp;
  }

  // Show alert
  showAlert(message) {
    if (this.webApp && this.webApp.showAlert) {
      this.webApp.showAlert(message);
    } else {
      alert(message);
    }
  }

  // Show confirmation
  showConfirm(message, callback) {
    if (this.webApp && this.webApp.showConfirm) {
      this.webApp.showConfirm(message, callback);
    } else {
      const result = window.confirm(message);
      callback(result);
    }
  }

  // Close the app
  close() {
    if (this.webApp && this.webApp.close) {
      this.webApp.close();
    }
  }

  // Get platform info
  getPlatform() {
    return this.webApp?.platform || 'unknown';
  }

  // Check if app is expanded
  isExpanded() {
    return this.webApp?.isExpanded || false;
  }

  // Get viewport height
  getViewportHeight() {
    return this.webApp?.viewportHeight || window.innerHeight;
  }

  // Haptic feedback
  hapticFeedback(type = 'light') {
    if (this.webApp?.HapticFeedback) {
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
        default:
          this.webApp.HapticFeedback.selectionChanged();
      }
    }
  }
}

// Create singleton instance
const telegramWebApp = new TelegramWebAppService();

export default telegramWebApp;