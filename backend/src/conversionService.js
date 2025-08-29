// Backend conversion service for handling currency conversions
const https = require('https');

class ConversionService {
    constructor() {
        this.prices = {};
        this.lastUpdate = null;
        this.updateInterval = 5 * 60 * 1000; // 5 minutes
        this.apiKey = process.env.COINGECKO_API_KEY || 'CG-7ZzjP5H5QkdkC78DXGU9mCpY';
        this.startAutoUpdate();
    }

    // Get current prices from CoinGecko
    async fetchPrices() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.coingecko.com',
                path: `/api/v3/simple/price?ids=the-open-network,ethereum,binancecoin,matic-network,tron,tether&vs_currencies=usd&x_cg_demo_api_key=${this.apiKey}`,
                method: 'GET'
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        this.prices = {
                            TON: response['the-open-network']?.usd || 0,
                            ETH: response['ethereum']?.usd || 0,
                            BNB: response['binancecoin']?.usd || 0,
                            MATIC: response['matic-network']?.usd || 0,
                            TRX: response['tron']?.usd || 0,
                            USDT: response['tether']?.usd || 1
                        };

                        this.lastUpdate = Date.now();
                        console.log('Backend prices updated:', this.prices);
                        resolve(this.prices);
                    } catch (error) {
                        console.error('Error parsing CoinGecko response:', error);
                        resolve(this.getFallbackPrices());
                    }
                });
            });

            req.on('error', (error) => {
                console.error('CoinGecko API error:', error);
                resolve(this.getFallbackPrices());
            });

            req.setTimeout(10000, () => {
                req.destroy();
                console.warn('CoinGecko request timeout');
                resolve(this.getFallbackPrices());
            });

            req.end();
        });
    }

    // Get fallback prices
    getFallbackPrices() {
        return {
            TON: 2.50,
            ETH: 3200.00,
            BNB: 300.00,
            MATIC: 0.80,
            TRX: 0.07,
            USDT: 1.00
        };
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

    // Convert amount for transaction processing
    convertForTransaction(amount, fromCurrency, toCurrency = 'USD') {
        if (toCurrency === 'USD') {
            return this.convertToUSD(amount, fromCurrency);
        } else {
            return this.convertBetween(amount, fromCurrency, toCurrency);
        }
    }

    // Get exchange rate between two currencies
    getExchangeRate(fromCurrency, toCurrency) {
        const fromPrice = this.getPrice(fromCurrency);
        const toPrice = this.getPrice(toCurrency);

        if (fromPrice === 0 || toPrice === 0) return 0;
        return fromPrice / toPrice;
    }

    // Get price history (for analytics)
    async getPriceHistory(currency, days = 7) {
        return new Promise((resolve, reject) => {
            const normalizedCurrency = this.normalizeCurrency(currency);
            const coinId = this.getCoinGeckoId(normalizedCurrency);

            if (!coinId) {
                resolve([]);
                return;
            }

            const options = {
                hostname: 'api.coingecko.com',
                path: `/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&x_cg_demo_api_key=${this.apiKey}`,
                method: 'GET'
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        resolve(response.prices || []);
                    } catch (error) {
                        console.error('Error parsing price history:', error);
                        resolve([]);
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                resolve([]);
            });

            req.end();
        });
    }

    // Get CoinGecko ID for currency
    getCoinGeckoId(currency) {
        const coinMap = {
            'TON': 'the-open-network',
            'ETH': 'ethereum',
            'BNB': 'binancecoin',
            'MATIC': 'matic-network',
            'TRX': 'tron',
            'USDT': 'tether'
        };

        return coinMap[currency];
    }

    // Get statistics
    getStats() {
        return {
            lastUpdate: this.lastUpdate,
            prices: { ...this.prices },
            nextUpdateIn: this.updateInterval - (Date.now() - (this.lastUpdate || 0))
        };
    }
}

const conversionService = new ConversionService();
module.exports = conversionService;