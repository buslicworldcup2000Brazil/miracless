// Deposit service for managing cryptocurrency addresses and transactions
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

class DepositService {
  constructor() {
    this.addresses = new Map();
    this.transactions = new Map();
  }

  // Get deposit addresses for user
  async getDepositAddresses(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/deposit/addresses/${userId}`);
      if (response.ok) {
        const data = await response.json();
        return data.addresses || {};
      }
      throw new Error('Failed to fetch deposit addresses');
    } catch (error) {
      console.error('Error fetching deposit addresses:', error);
      return {}; // Return empty object if API fails
    }
  }

  // Generate or get address for specific currency
  async getDepositAddress(userId, currency) {
    try {
      const response = await fetch(`${API_BASE_URL}/deposit/address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, currency })
      });

      if (response.ok) {
        const data = await response.json();
        return data.address;
      }
      throw new Error('Failed to generate deposit address');
    } catch (error) {
      console.error(`Error getting ${currency} address:`, error);
      return null; // Return null if API fails
    }
  }

  // Get all addresses for user
  async getAllAddresses(userId) {
    const currencies = ['TON', 'USDT_TRC20', 'USDT_ERC20', 'ETH', 'MATIC', 'BNB'];
    const addresses = {};

    for (const currency of currencies) {
      addresses[currency] = await this.getDepositAddress(userId, currency);
    }

    return addresses;
  }

  // Address generation methods removed - use real API endpoints

  // Check transaction status
  async checkTransaction(currency, txHash) {
    try {
      const response = await fetch(`${API_BASE_URL}/deposit/check-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currency, txHash })
      });

      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to check transaction');
    } catch (error) {
      console.error('Error checking transaction:', error);
      return { status: 'unknown', confirmations: 0 };
    }
  }

  // Get transaction history for user
  async getTransactionHistory(userId, limit = 10) {
    try {
      const response = await fetch(`${API_BASE_URL}/deposit/transactions/${userId}?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        return data.transactions || [];
      }
      throw new Error('Failed to fetch transaction history');
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }

  // Format address for display
  formatAddress(address, currency) {
    if (!address) return 'Not available';

    const maxLength = 20;
    if (address.length <= maxLength) return address;

    return `${address.substring(0, 10)}...${address.substring(address.length - 8)}`;
  }

  // Copy address to clipboard
  async copyAddress(address) {
    try {
      await navigator.clipboard.writeText(address);
      return true;
    } catch (error) {
      console.error('Failed to copy address:', error);
      return false;
    }
  }

  // Get currency info
  getCurrencyInfo(currency) {
    const currencyMap = {
      TON: {
        name: 'Toncoin',
        symbol: 'TON',
        network: 'TON Network',
        decimals: 9,
        icon: '💎'
      },
      USDT_TRC20: {
        name: 'Tether',
        symbol: 'USDT',
        network: 'Tron (TRC-20)',
        decimals: 6,
        icon: '🟡'
      },
      USDT_ERC20: {
        name: 'Tether',
        symbol: 'USDT',
        network: 'Ethereum (ERC-20)',
        decimals: 6,
        icon: '🟡'
      },
      ETH: {
        name: 'Ethereum',
        symbol: 'ETH',
        network: 'Ethereum',
        decimals: 18,
        icon: '🔷'
      },
      MATIC: {
        name: 'Polygon',
        symbol: 'MATIC',
        network: 'Polygon',
        decimals: 18,
        icon: '🟣'
      },
      BNB: {
        name: 'Binance Coin',
        symbol: 'BNB',
        network: 'BNB Smart Chain',
        decimals: 18,
        icon: '🟡'
      }
    };

    return currencyMap[currency] || currencyMap.TON;
  }

  // Validate transaction amount
  validateAmount(amount, currency) {
    const minAmounts = {
      TON: 0.01,
      USDT_TRC20: 1,
      USDT_ERC20: 1,
      ETH: 0.001,
      MATIC: 1,
      BNB: 0.001
    };

    const minAmount = minAmounts[currency] || 0.01;
    return parseFloat(amount) >= minAmount;
  }

  // Get minimum deposit amount for currency
  getMinDepositAmount(currency) {
    const minAmounts = {
      TON: 0.01,
      USDT_TRC20: 1,
      USDT_ERC20: 1,
      ETH: 0.001,
      MATIC: 1,
      BNB: 0.001
    };

    return minAmounts[currency] || 0.01;
  }
}

// Create singleton instance
const depositService = new DepositService();

export default depositService;