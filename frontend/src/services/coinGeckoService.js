// CoinGecko API service for real-time cryptocurrency prices
class CoinGeckoService {
  constructor() {
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.apiKey = process.env.REACT_APP_COINGECKO_API_KEY || 'CG-7ZzjP5H5QkdkC78DXGU9mCpY';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.isUpdating = false;
    this.updateInterval = null;
    this.listeners = new Set();
  }

  // Initialize service with auto-update
  init() {
    this.startAutoUpdate();
    console.log('CoinGecko service initialized');
  }

  // Start automatic price updates
  startAutoUpdate(interval = 300000) { // 5 minutes default
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, interval);

    // Initial update
    this.updatePrices();
  }

  // Stop automatic updates
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Update all prices
  async updatePrices() {
    if (this.isUpdating) return;

    this.isUpdating = true;

    try {
      const prices = await this.fetchPrices();
      this.cache.set('all', {
        data: prices,
        timestamp: Date.now()
      });

      // Notify listeners
      this.notifyListeners('prices-updated', prices);

      console.log('Prices updated:', prices);
    } catch (error) {
      console.error('Error updating prices:', error);
      this.notifyListeners('prices-error', error);
    } finally {
      this.isUpdating = false;
    }
  }

  // Fetch prices from CoinGecko API
  async fetchPrices() {
    const coinIds = [
      'bitcoin', 'ethereum', 'binancecoin', 'matic-network',
      'tron', 'tether', 'usd-coin', 'dai'
    ];

    const url = `${this.baseUrl}/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&x_cg_demo_api_key=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // Map to our currency codes
    return {
      BTC: data.bitcoin?.usd || 0,
      ETH: data.ethereum?.usd || 0,
      BNB: data.binancecoin?.usd || 0,
      MATIC: data['matic-network']?.usd || 0,
      TRX: data.tron?.usd || 0,
      USDT: data.tether?.usd || 1,
      USDC: data['usd-coin']?.usd || 1,
      DAI: data.dai?.usd || 1,
      TON: await this.getTonPrice() // TON not directly available on CoinGecko
    };
  }

  // Get TON price (using alternative method)
  async getTonPrice() {
    try {
      // Try to get TON price from alternative source or cache
      const cachedTon = this.cache.get('ton_price');
      if (cachedTon && (Date.now() - cachedTon.timestamp) < this.cacheTimeout) {
        return cachedTon.price;
      }

      // For now, return a reasonable estimate
      // In production, you might use a different API or DEX data
      const tonPrice = 2.45; // Approximate current price

      this.cache.set('ton_price', {
        price: tonPrice,
        timestamp: Date.now()
      });

      return tonPrice;
    } catch (error) {
      console.error('Error fetching TON price:', error);
      return 2.45; // Fallback price
    }
  }

  // Get price for specific currency
  async getPrice(currency) {
    const prices = await this.getAllPrices();
    return prices[currency.toUpperCase()] || 0;
  }

  // Get all prices
  async getAllPrices() {
    const cached = this.cache.get('all');

    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    // If no cache or expired, fetch fresh data
    await this.updatePrices();
    const fresh = this.cache.get('all');
    return fresh ? fresh.data : {};
  }

  // Convert amount from crypto to USD
  async convertToUSD(amount, currency) {
    const price = await this.getPrice(currency);
    return amount * price;
  }

  // Convert amount from USD to crypto
  async convertFromUSD(usdAmount, currency) {
    const price = await this.getPrice(currency);
    return price > 0 ? usdAmount / price : 0;
  }

  // Format amount with appropriate decimals
  formatAmount(amount, currency) {
    const decimals = this.getCurrencyDecimals(currency);
    return parseFloat(amount).toFixed(decimals);
  }

  // Get appropriate decimal places for currency
  getCurrencyDecimals(currency) {
    const decimals = {
      'BTC': 8,
      'ETH': 6,
      'BNB': 4,
      'MATIC': 4,
      'TRX': 2,
      'USDT': 2,
      'USDC': 2,
      'DAI': 2,
      'TON': 4
    };

    return decimals[currency.toUpperCase()] || 6;
  }

  // Get currency info
  getCurrencyInfo(currency) {
    const info = {
      BTC: { name: 'Bitcoin', symbol: 'BTC', network: 'Bitcoin' },
      ETH: { name: 'Ethereum', symbol: 'ETH', network: 'Ethereum' },
      BNB: { name: 'Binance Coin', symbol: 'BNB', network: 'BSC' },
      MATIC: { name: 'Polygon', symbol: 'MATIC', network: 'Polygon' },
      TRX: { name: 'Tron', symbol: 'TRX', network: 'Tron' },
      USDT: { name: 'Tether', symbol: 'USDT', network: 'Multi-chain' },
      USDC: { name: 'USD Coin', symbol: 'USDC', network: 'Multi-chain' },
      DAI: { name: 'Dai', symbol: 'DAI', network: 'Multi-chain' },
      TON: { name: 'Toncoin', symbol: 'TON', network: 'TON' }
    };

    return info[currency.toUpperCase()] || { name: currency, symbol: currency, network: 'Unknown' };
  }

  // Get confirmation time for currency
  getConfirmationTime(currency) {
    const times = {
      'BTC': '~10 minutes',
      'ETH': '~15 seconds',
      'BNB': '~3 seconds',
      'MATIC': '~2 seconds',
      'TRX': '~1 minute',
      'USDT': 'Varies by network',
      'USDC': 'Varies by network',
      'DAI': 'Varies by network',
      'TON': '~10 seconds'
    };

    return times[currency.toUpperCase()] || 'Varies';
  }

  // Validate deposit amount
  validateDeposit(amount, currency) {
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return { valid: false, error: 'Invalid amount' };
    }

    const minDeposit = this.getMinDeposit(currency);
    if (numAmount < minDeposit) {
      return { valid: false, error: `Minimum deposit: ${minDeposit} ${currency}` };
    }

    const maxDeposit = this.getMaxDeposit(currency);
    if (numAmount > maxDeposit) {
      return { valid: false, error: `Maximum deposit: ${maxDeposit} ${currency}` };
    }

    return { valid: true };
  }

  // Get minimum deposit amount
  getMinDeposit(currency) {
    const minDeposits = {
      'BTC': 0.0001,
      'ETH': 0.001,
      'BNB': 0.01,
      'MATIC': 1,
      'TRX': 10,
      'USDT': 1,
      'USDC': 1,
      'DAI': 1,
      'TON': 0.1
    };

    return minDeposits[currency.toUpperCase()] || 0.01;
  }

  // Get maximum deposit amount
  getMaxDeposit(currency) {
    const maxDeposits = {
      'BTC': 10,
      'ETH': 100,
      'BNB': 1000,
      'MATIC': 10000,
      'TRX': 100000,
      'USDT': 10000,
      'USDC': 10000,
      'DAI': 10000,
      'TON': 1000
    };

    return maxDeposits[currency.toUpperCase()] || 10000;
  }

  // Subscribe to price updates
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
        console.error('Error notifying listener:', error);
      }
    });
  }

  // Get cache info
  getCacheInfo() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      }))
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('Price cache cleared');
  }

  // Cleanup
  destroy() {
    this.stopAutoUpdate();
    this.listeners.clear();
    this.cache.clear();
  }
}

// Create singleton instance
const coinGeckoService = new CoinGeckoService();

export default coinGeckoService;