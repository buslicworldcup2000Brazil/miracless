// Auto registration service for seamless user onboarding
import telegramWebApp from './telegramWebApp';
import paymentService from './paymentService';
import conversionService from './conversionService';

class AutoRegistrationService {
  constructor() {
    this.registrationInProgress = false;
    this.registrationData = null;
  }

  // Main auto-registration function triggered by "Start" button
  async registerUserOnStart() {
    if (this.registrationInProgress) {
      console.log('Registration already in progress');
      return this.registrationData;
    }

    try {
      this.registrationInProgress = true;
      console.log('Starting automatic user registration...');

      // Step 1: Get user data from Telegram
      const telegramUser = telegramWebApp.getUserData();
      if (!telegramUser) {
        throw new Error('Unable to get user data from Telegram');
      }

      // Step 2: Download and save user avatar
      let avatarUrl = null;
      if (telegramUser.photo_url) {
        console.log('Downloading user avatar...');
        avatarUrl = await telegramWebApp.downloadUserAvatar(
          telegramUser.telegram_id,
          telegramUser.photo_url
        );
      }

      // Step 3: Prepare registration data
      const registrationData = {
        telegram_id: telegramUser.telegram_id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        language_code: telegramUser.language_code,
        avatar_url: avatarUrl,
        is_premium: telegramUser.is_premium,
        registration_source: 'telegram_mini_app',
        registration_timestamp: new Date().toISOString(),
        // Generate unique identifier
        unique_id: this.generateUniqueId(telegramUser.telegram_id)
      };

      // Step 4: Register user in backend
      console.log('Registering user in backend...');
      const authResult = await this.registerUserInBackend(registrationData);

      if (!authResult.success) {
        throw new Error(authResult.message || 'Registration failed');
      }

      // Step 5: Initialize payment system for new user
      await this.initializePaymentSystem(authResult.user);

      // Step 6: Set up conversion rates for user
      await this.initializeConversionRates(authResult.user);

      // Step 7: Store registration data
      this.registrationData = {
        ...authResult.user,
        paymentAddresses: this.getUserPaymentAddresses(authResult.user.telegram_id),
        conversionRates: conversionService.getAllPrices()
      };

      console.log('User registration completed successfully!');
      telegramWebApp.showAlert('Добро пожаловать! Регистрация завершена.');

      return this.registrationData;

    } catch (error) {
      console.error('Auto registration failed:', error);
      telegramWebApp.showAlert(`Ошибка регистрации: ${error.message}`);
      throw error;
    } finally {
      this.registrationInProgress = false;
    }
  }

  // Register user in backend
  async registerUserInBackend(userData) {
    console.log('🚀 [AUTO-REG] НАЧАЛО РЕГИСТРАЦИИ В БЭКЕНДЕ');
    console.log('📤 [AUTO-REG] Отправляемые данные:', JSON.stringify(userData, null, 2));

    try {
      console.log('🌐 [AUTO-REG] Отправка POST запроса на /api/auth...');
      console.log('🔗 [AUTO-REG] URL:', window.location.origin + '/api/auth');

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      console.log('📊 [AUTO-REG] Статус ответа:', response.status);
      console.log('📋 [AUTO-REG] Заголовки ответа:', Object.fromEntries(response.headers.entries()));

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [AUTO-REG] HTTP Ошибка:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Check if response has content
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');

      console.log('📏 [AUTO-REG] Content-Length:', contentLength);
      console.log('🏷️ [AUTO-REG] Content-Type:', contentType);

      if (contentLength === '0') {
        console.error('❌ [AUTO-REG] ПУСТОЙ ОТВЕТ ОТ СЕРВЕРА');
        console.error('🔍 [AUTO-REG] Возможные причины:');
        console.error('   - Бэкенд не запущен');
        console.error('   - База данных не подключена');
        console.error('   - Ошибка в коде бэкенда');
        throw new Error('Server returned empty response');
      }

      // Try to parse JSON
      let result;
      try {
        const responseText = await response.text();
        console.log('📄 [AUTO-REG] Полный текст ответа:', responseText);

        if (!responseText || responseText.trim() === '') {
          console.error('❌ [AUTO-REG] ПУСТАЯ СТРОКА В ОТВЕТЕ');
          throw new Error('Empty response body');
        }

        // Check if response is HTML (error page)
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          console.error('❌ [AUTO-REG] СЕРВЕР ВЕРНУЛ HTML ВМЕСТО JSON:');
          console.error(responseText.substring(0, 500));
          throw new Error('Server returned HTML error page instead of JSON');
        }

        result = JSON.parse(responseText);
        console.log('✅ [AUTO-REG] УСПЕШНЫЙ ПАРСИНГ JSON:', result);
      } catch (jsonError) {
        console.error('❌ [AUTO-REG] ОШИБКА ПАРСИНГА JSON:', jsonError);
        console.error('🔍 [AUTO-REG] Проверьте формат ответа сервера');
        throw new Error(`Invalid JSON response: ${jsonError.message}`);
      }

      if (!result.success) {
        console.error('❌ [AUTO-REG] СЕРВЕР ВЕРНУЛ ОШИБКУ:', result.message);
        throw new Error(result.message || 'Backend registration failed');
      }

      console.log('🎉 [AUTO-REG] РЕГИСТРАЦИЯ ПРОШЛА УСПЕШНО');
      console.log('👤 [AUTO-REG] Пользователь создан:', result.user?.telegram_id);
      return result;

    } catch (error) {
      console.error('💥 [AUTO-REG] КРИТИЧЕСКАЯ ОШИБКА РЕГИСТРАЦИИ:', error);
      console.error('🔍 [AUTO-REG] Детали ошибки:', {
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Initialize payment system for new user
  async initializePaymentSystem(user) {
    try {
      console.log('Initializing payment system...');

      // Get payment addresses for user
      const addresses = this.getUserPaymentAddresses(user.telegram_id);

      // Initialize transaction monitoring for user
      await fetch('/api/init-payment-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.telegram_id,
          addresses: addresses
        })
      });

      console.log('Payment system initialized');
    } catch (error) {
      console.error('Payment system initialization failed:', error);
      // Don't throw error here, as it's not critical for registration
    }
  }

  // Initialize conversion rates for user
  async initializeConversionRates(user) {
    try {
      console.log('Initializing conversion rates...');

      // Conversion service is already auto-updating
      // Just ensure it's ready for the user
      const prices = conversionService.getAllPrices();

      await fetch('/api/init-conversion-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.telegram_id,
          currentRates: prices
        })
      });

      console.log('Conversion rates initialized');
    } catch (error) {
      console.error('Conversion rates initialization failed:', error);
      // Don't throw error here, as it's not critical for registration
    }
  }

  // Get payment addresses for user
  getUserPaymentAddresses(userId) {
    return {
      TON: paymentService.getPaymentAddress('TON'),
      USDT_TRC20: paymentService.getPaymentAddress('USDT_TRC20'),
      USDT_ERC20: paymentService.getPaymentAddress('USDT_ERC20'),
      ETH: paymentService.getPaymentAddress('ETH'),
      BNB: paymentService.getPaymentAddress('BNB'),
      MATIC: paymentService.getPaymentAddress('MATIC')
    };
  }

  // Generate unique identifier for user
  generateUniqueId(telegramId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `MF_${telegramId}_${timestamp}_${random}`.toUpperCase();
  }

  // Check if user is already registered
  async isUserRegistered(telegramId) {
    try {
      const response = await fetch(`/api/user/${telegramId}/status`);

      if (!response.ok) {
        console.error('HTTP Error checking registration:', response.status);
        return false;
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        console.error('Empty response from user status API');
        return false;
      }

      const result = JSON.parse(responseText);
      return result.registered || false;
    } catch (error) {
      console.error('Error checking registration status:', error);
      return false;
    }
  }

  // Get registration data
  getRegistrationData() {
    return this.registrationData;
  }

  // Clear registration data
  clearRegistrationData() {
    this.registrationData = null;
    this.registrationInProgress = false;
  }

  // Quick registration check for app startup
  async quickRegistrationCheck() {
    const telegramUser = telegramWebApp.getUserData();
    if (!telegramUser) return false;

    const isRegistered = await this.isUserRegistered(telegramUser.telegram_id);
    if (!isRegistered) {
      console.log('User not registered, starting auto-registration...');
      await this.registerUserOnStart();
      return true;
    }

    return false;
  }
}

const autoRegistrationService = new AutoRegistrationService();
export default autoRegistrationService;