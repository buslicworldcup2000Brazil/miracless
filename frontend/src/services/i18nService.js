// Internationalization service for multi-language support
class I18nService {
  constructor() {
    this.currentLanguage = 'ru'; // Default language
    this.fallbackLanguage = 'en';
    this.translations = {};
    this.listeners = new Set();
    this.isLoaded = false;
  }

  // Initialize i18n service
  async init(defaultLanguage = 'ru') {
    this.currentLanguage = defaultLanguage;
    await this.loadTranslations(defaultLanguage);
    this.isLoaded = true;
    console.log('i18n service initialized with language:', defaultLanguage);
  }

  // Load translations for a language
  async loadTranslations(language) {
    try {
      // In a real app, this would load from separate JSON files
      // For now, we'll use inline translations
      const translations = this.getBuiltInTranslations(language);

      if (!this.translations[language]) {
        this.translations[language] = {};
      }

      // Merge with existing translations
      Object.assign(this.translations[language], translations);

      console.log(`Translations loaded for ${language}`);
    } catch (error) {
      console.error(`Error loading translations for ${language}:`, error);
      // Fallback to English if available
      if (language !== 'en' && this.translations.en) {
        this.translations[language] = { ...this.translations.en };
      }
    }
  }

  // Get built-in translations
  getBuiltInTranslations(language) {
    const translations = {
      ru: {
        // Common
        'common.save': 'Сохранить',
        'common.cancel': 'Отмена',
        'common.delete': 'Удалить',
        'common.edit': 'Редактировать',
        'common.create': 'Создать',
        'common.loading': 'Загрузка...',
        'common.error': 'Ошибка',
        'common.success': 'Успех',
        'common.warning': 'Предупреждение',
        'common.info': 'Информация',
        'common.confirm': 'Подтвердить',
        'common.back': 'Назад',
        'common.next': 'Далее',
        'common.previous': 'Предыдущий',
        'common.close': 'Закрыть',
        'common.search': 'Поиск',
        'common.filter': 'Фильтр',
        'common.sort': 'Сортировка',
        'common.export': 'Экспорт',
        'common.import': 'Импорт',

        // Navigation
        'nav.home': 'Главная',
        'nav.balance': 'Баланс',
        'nav.lottery': 'Лотерея',
        'nav.statistics': 'Статистика',
        'nav.profile': 'Профиль',
        'nav.admin': 'Админ',

        // Home
        'home.welcome': 'Добро пожаловать в Miracless',
        'home.subtitle': 'Ваша премиум лотерея в Telegram',
        'home.startPlaying': 'Начать игру',

        // Balance
        'balance.title': 'Ваш баланс',
        'balance.replenish': 'Пополнить баланс',
        'balance.methods': 'Способы пополнения',
        'balance.amount': 'Сумма',
        'balance.currency': 'Валюта',
        'balance.usd': 'USD',
        'balance.convert': 'Конвертировать',
        'balance.pay': 'Оплатить',
        'balance.processing': 'Обработка...',
        'balance.success': 'Платеж успешно обработан!',
        'balance.failed': 'Ошибка платежа',

        // Lottery
        'lottery.title': 'Активные лотереи',
        'lottery.participants': 'Участники',
        'lottery.prize': 'Приз',
        'lottery.cost': 'Стоимость участия',
        'lottery.join': 'Участвовать',
        'lottery.joined': 'Участие...',
        'lottery.winner': 'Победитель',
        'lottery.completed': 'Завершена',
        'lottery.active': 'Активна',

        // Admin
        'admin.title': 'Панель администратора',
        'admin.createLottery': 'Создать лотерею',
        'admin.fakeUsers': 'Fake пользователи',
        'admin.statistics': 'Статистика',
        'admin.logs': 'Логи',
        'admin.mainAdmin': 'Главный админ',
        'admin.restrictedAdmin': 'Ограниченный админ',
        'admin.onlyView': 'Только просмотр',

        // Forms
        'form.title': 'Название',
        'form.description': 'Описание',
        'form.price': 'Цена',
        'form.date': 'Дата',
        'form.time': 'Время',
        'form.required': 'Обязательно',
        'form.optional': 'Необязательно',

        // Messages
        'message.welcome': 'Добро пожаловать!',
        'message.goodbye': 'До свидания!',
        'message.error': 'Произошла ошибка',
        'message.success': 'Операция выполнена успешно',
        'message.confirmDelete': 'Вы уверены, что хотите удалить это?',
        'message.noData': 'Нет данных',
        'message.loading': 'Загрузка...',

        // Errors
        'error.network': 'Ошибка сети',
        'error.server': 'Ошибка сервера',
        'error.validation': 'Ошибка валидации',
        'error.permission': 'Недостаточно прав',
        'error.notFound': 'Не найдено',

        // Success
        'success.saved': 'Сохранено успешно',
        'success.deleted': 'Удалено успешно',
        'success.created': 'Создано успешно',
        'success.updated': 'Обновлено успешно'
      },
      en: {
        // Common
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.create': 'Create',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.warning': 'Warning',
        'common.info': 'Info',
        'common.confirm': 'Confirm',
        'common.back': 'Back',
        'common.next': 'Next',
        'common.previous': 'Previous',
        'common.close': 'Close',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.sort': 'Sort',
        'common.export': 'Export',
        'common.import': 'Import',

        // Navigation
        'nav.home': 'Home',
        'nav.balance': 'Balance',
        'nav.lottery': 'Lottery',
        'nav.statistics': 'Statistics',
        'nav.profile': 'Profile',
        'nav.admin': 'Admin',

        // Home
        'home.welcome': 'Welcome to Miracless',
        'home.subtitle': 'Your premium Telegram lottery',
        'home.startPlaying': 'Start Playing',

        // Balance
        'balance.title': 'Your Balance',
        'balance.replenish': 'Replenish Balance',
        'balance.methods': 'Payment Methods',
        'balance.amount': 'Amount',
        'balance.currency': 'Currency',
        'balance.usd': 'USD',
        'balance.convert': 'Convert',
        'balance.pay': 'Pay',
        'balance.processing': 'Processing...',
        'balance.success': 'Payment processed successfully!',
        'balance.failed': 'Payment failed',

        // Lottery
        'lottery.title': 'Active Lotteries',
        'lottery.participants': 'Participants',
        'lottery.prize': 'Prize',
        'lottery.cost': 'Entry Cost',
        'lottery.join': 'Join',
        'lottery.joined': 'Joining...',
        'lottery.winner': 'Winner',
        'lottery.completed': 'Completed',
        'lottery.active': 'Active',

        // Admin
        'admin.title': 'Admin Panel',
        'admin.createLottery': 'Create Lottery',
        'admin.fakeUsers': 'Fake Users',
        'admin.statistics': 'Statistics',
        'admin.logs': 'Logs',
        'admin.mainAdmin': 'Main Admin',
        'admin.restrictedAdmin': 'Restricted Admin',
        'admin.onlyView': 'View Only',

        // Forms
        'form.title': 'Title',
        'form.description': 'Description',
        'form.price': 'Price',
        'form.date': 'Date',
        'form.time': 'Time',
        'form.required': 'Required',
        'form.optional': 'Optional',

        // Messages
        'message.welcome': 'Welcome!',
        'message.goodbye': 'Goodbye!',
        'message.error': 'An error occurred',
        'message.success': 'Operation completed successfully',
        'message.confirmDelete': 'Are you sure you want to delete this?',
        'message.noData': 'No data',
        'message.loading': 'Loading...',

        // Errors
        'error.network': 'Network error',
        'error.server': 'Server error',
        'error.validation': 'Validation error',
        'error.permission': 'Insufficient permissions',
        'error.notFound': 'Not found',

        // Success
        'success.saved': 'Saved successfully',
        'success.deleted': 'Deleted successfully',
        'success.created': 'Created successfully',
        'success.updated': 'Updated successfully'
      }
    };

    return translations[language] || translations[this.fallbackLanguage] || {};
  }

  // Get translation for key
  t(key, params = {}) {
    const keys = key.split('.');
    let translation = this.translations[this.currentLanguage];

    // Navigate through nested object
    for (const k of keys) {
      if (translation && typeof translation === 'object') {
        translation = translation[k];
      } else {
        translation = undefined;
        break;
      }
    }

    // If translation not found, try fallback language
    if (!translation && this.currentLanguage !== this.fallbackLanguage) {
      let fallbackTranslation = this.translations[this.fallbackLanguage];
      for (const k of keys) {
        if (fallbackTranslation && typeof fallbackTranslation === 'object') {
          fallbackTranslation = fallbackTranslation[k];
        } else {
          fallbackTranslation = undefined;
          break;
        }
      }
      translation = fallbackTranslation;
    }

    // If still not found, return key
    if (!translation) {
      console.warn(`Translation not found for key: ${key}`);
      return key;
    }

    // Replace parameters
    if (typeof translation === 'string' && Object.keys(params).length > 0) {
      return translation.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match;
      });
    }

    return translation;
  }

  // Set current language
  async setLanguage(language) {
    if (!this.translations[language]) {
      await this.loadTranslations(language);
    }

    this.currentLanguage = language;
    this.notifyListeners('language-changed', language);
    console.log('Language changed to:', language);
  }

  // Get current language
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // Get available languages
  getAvailableLanguages() {
    return Object.keys(this.translations);
  }

  // Add custom translations
  addTranslations(language, translations) {
    if (!this.translations[language]) {
      this.translations[language] = {};
    }

    this.mergeTranslations(this.translations[language], translations);
  }

  // Merge translations recursively
  mergeTranslations(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        this.mergeTranslations(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  // Subscribe to language changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify listeners
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error notifying i18n listener:', error);
      }
    });
  }

  // Get language info
  getLanguageInfo(language) {
    const languages = {
      ru: { name: 'Русский', nativeName: 'Русский', flag: '🇷🇺' },
      en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
      es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
      fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
      de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
      it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
      pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
      zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
      ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
      ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' }
    };

    return languages[language] || { name: language, nativeName: language, flag: '🏳️' };
  }

  // Format number according to locale
  formatNumber(number, options = {}) {
    const locale = this.getLocaleForLanguage(this.currentLanguage);
    return new Intl.NumberFormat(locale, options).format(number);
  }

  // Format currency
  formatCurrency(amount, currency = 'USD') {
    return this.formatNumber(amount, {
      style: 'currency',
      currency: currency
    });
  }

  // Format date
  formatDate(date, options = {}) {
    const locale = this.getLocaleForLanguage(this.currentLanguage);
    return new Intl.DateTimeFormat(locale, options).format(new Date(date));
  }

  // Get locale for language
  getLocaleForLanguage(language) {
    const locales = {
      ru: 'ru-RU',
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-BR',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR'
    };

    return locales[language] || 'en-US';
  }

  // Check if RTL language
  isRTL() {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(this.currentLanguage);
  }

  // Get text direction
  getDirection() {
    return this.isRTL() ? 'rtl' : 'ltr';
  }

  // Cleanup
  destroy() {
    this.listeners.clear();
    this.translations = {};
  }
}

// Create singleton instance
const i18nService = new I18nService();

export default i18nService;