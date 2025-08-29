// Conversion service for handling currency conversions
const COINGECKO_API_KEY = 'CG-7ZzjP5H5QkdkC78DXGU9mCpY';

class ConversionService {
  constructor() {
    this.prices = {};
    this.lastUpdate = null;
    this.updateInterval = 5 * 60 * 1000; // 5 minutes
  }

  // Get current prices from CoinGecko
  async fetchPrices() {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,ethereum,binancecoin,matic-network,tron,tether&vs_currencies=usd&x_cg_demo_api_key=${COINGECKO_API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }

      const data = await response.json();
      this.prices = {
        TON: data['the-open-network']?.usd || 0,
        ETH: data['ethereum']?.usd || 0,
        BNB: data['binancecoin']?.usd || 0,
        MATIC: data['matic-network']?.usd || 0,
        TRX: data['tron']?.usd || 0,
        USDT: data['tether']?.usd || 1
      };

      this.lastUpdate = Date.now();
      console.log('Prices updated:', this.prices);
      return this.prices;
    } catch (error) {
      console.error('Error fetching prices:', error);
      // Return cached prices or fallback
      return this.prices || {
        TON: 2.50,
        ETH: 3200.00,
        BNB: 300.00,
        MATIC: 0.80,
        TRX: 0.07,
        USDT: 1.00
      };
    }
  }

  // Get price for specific currency
  getPrice(currency) {
    const normalizedCurrency = this.normalizeCurrency(currency);
    return this.prices[normalizedCurrency] || 0;
  }

  // Convert crypto amount to USD
  convertToUSD(amount, currency) {
    const price = this.getPrice(currency);
    return parseFloat(amount) * price;
  }

  // Convert USD amount to crypto
  convertFromUSD(usdAmount, currency) {
    const price = this.getPrice(currency);
    if (price === 0) return 0;
    return parseFloat(usdAmount) / price;
  }

  // Convert between cryptocurrencies
  convertBetween(amount, fromCurrency, toCurrency) {
    const usdAmount = this.convertToUSD(amount, fromCurrency);
    return this.convertFromUSD(usdAmount, toCurrency);
  }

  // Normalize currency name
  normalizeCurrency(currency) {
    return currency.replace(' ', '_').replace('(', '_').replace(')', '').toUpperCase().split('_')[0];
  }

  // Get all prices
  getAllPrices() {
    return { ...this.prices };
  }

  // Check if prices need update
  needsUpdate() {
    if (!this.lastUpdate) return true;
    return Date.now() - this.lastUpdate > this.updateInterval;
  }

  // Auto-update prices
  startAutoUpdate() {
    // Initial fetch
    this.fetchPrices();

    // Set up interval
    setInterval(() => {
      this.fetchPrices();
    }, this.updateInterval);
  }

  // Format currency amount
  formatAmount(amount, currency, decimals = 6) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '0';

    const currencyInfo = this.getCurrencyInfo(currency);
    return numAmount.toFixed(currencyInfo?.decimals || decimals);
  }

  // Get currency information
  getCurrencyInfo(currency) {
    const normalizedCurrency = this.normalizeCurrency(currency);

    const currencyMap = {
      'TON': { symbol: 'TON', decimals: 9, network: 'TON' },
      'ETH': { symbol: 'ETH', decimals: 18, network: 'Ethereum' },
      'BNB': { symbol: 'BNB', decimals: 18, network: 'BSC' },
      'MATIC': { symbol: 'MATIC', decimals: 18, network: 'Polygon' },
      'TRX': { symbol: 'TRX', decimals: 6, network: 'Tron' },
      'USDT': { symbol: 'USDT', decimals: 6, network: 'Multi-chain' }
    };

    return currencyMap[normalizedCurrency];
  }

  // Calculate minimum deposit amount in USD
  getMinDepositUSD() {
    return 1.00; // $1 minimum
  }

  // Calculate minimum deposit amount in crypto
  getMinDepositCrypto(currency) {
    return this.convertFromUSD(this.getMinDepositUSD(), currency);
  }

  // Validate deposit amount
  validateDeposit(amount, currency) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { valid: false, error: 'Invalid amount' };
    }

    const minAmount = this.getMinDepositCrypto(currency);
    if (numAmount < minAmount) {
      return {
        valid: false,
        error: `Minimum amount: ${this.formatAmount(minAmount, currency)} ${currency}`
      };
    }

    return { valid: true };
  }

  // Calculate fee (if any)
  calculateFee(amount, currency) {
    // For now, no fee
    return 0;
  }

  // Get estimated confirmation time
  getConfirmationTime(currency) {
    const normalizedCurrency = this.normalizeCurrency(currency);

    const times = {
      'TON': '1-3 minutes',
      'ETH': '3-5 minutes',
      'BNB': '3-5 minutes',
      'MATIC': '1-2 minutes',
      'TRX': '1 minute',
      'USDT': '1-5 minutes (depends on network)'
    };

    return times[normalizedCurrency] || 'Confirmation time unknown';
  }
}

const conversionService = new ConversionService();
export default conversionService;