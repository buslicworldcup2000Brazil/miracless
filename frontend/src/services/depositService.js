// Deposit service for managing cryptocurrency deposits with new balance system
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

class DepositService {
  constructor() {
    this.addresses = new Map();
    this.pendingRequests = new Map();
  }

  // Get all payment addresses (they are the same for all users)
  async getAllAddresses(userId) {
    try {
      console.log('💰 [DEPOSIT-SERVICE] Getting all payment addresses');
      const response = await fetch(`${API_BASE_URL}/balance/addresses/${userId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ [DEPOSIT-SERVICE] Addresses received:', Object.keys(data.addresses));
          return data.addresses;
        }
      }

      throw new Error('Failed to fetch payment addresses');
    } catch (error) {
      console.error('💥 [DEPOSIT-SERVICE] Error fetching addresses:', error);
      // Return fallback addresses
      return {
        'TON': 'UQC5JgHh2woeEVsNf197RxYWc7y_ybp3TKczyOR8Q1ck9LVo',
        'USDT_TRC20': 'TAqVqKZ5zHbX4Cz5x5ZGodXLQkuvLCFCYD',
        'USDT_ERC20': '0x25c03364243614BbA73d5d214E29cBFcE241A825',
        'ETH': '0x25c03364243614BbA73d5d214E29cBFcE241A825',
        'BNB': '0x25c03364243614BbA73d5d214E29cBFcE241A825'
      };
    }
  }

  // Get payment address for specific currency
  async getDepositAddress(userId, currency) {
    try {
      console.log('💰 [DEPOSIT-SERVICE] Getting address for currency:', currency);
      const addresses = await this.getAllAddresses(userId);
      return addresses[currency] || null;
    } catch (error) {
      console.error('💥 [DEPOSIT-SERVICE] Error getting address:', error);
      return null;
    }
  }

  // Create deposit request
  async createDepositRequest(userId, currency, amount) {
    try {
      console.log('💰 [DEPOSIT-SERVICE] Creating deposit request');
      console.log('👤 [DEPOSIT-SERVICE] User ID:', userId);
      console.log('💱 [DEPOSIT-SERVICE] Currency:', currency);
      console.log('💵 [DEPOSIT-SERVICE] Amount:', amount);

      const response = await fetch(`${API_BASE_URL}/balance/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          currency: currency,
          amount: parseFloat(amount)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ [DEPOSIT-SERVICE] Deposit request created:', data.data.id);
          return data.data;
        }
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create deposit request');

    } catch (error) {
      console.error('💥 [DEPOSIT-SERVICE] Error creating deposit request:', error);
      throw error;
    }
  }

  // Confirm payment with transaction hash
  async confirmPayment(userId, currency, txHash) {
    try {
      console.log('💰 [DEPOSIT-SERVICE] Confirming payment');
      console.log('👤 [DEPOSIT-SERVICE] User ID:', userId);
      console.log('💱 [DEPOSIT-SERVICE] Currency:', currency);
      console.log('🔗 [DEPOSIT-SERVICE] TX Hash:', txHash);

      const response = await fetch(`${API_BASE_URL}/balance/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          currency: currency,
          txHash: txHash
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ [DEPOSIT-SERVICE] Payment confirmed successfully');
        return data.data;
      } else {
        console.warn('⚠️ [DEPOSIT-SERVICE] Payment not confirmed:', data.message);
        return {
          success: false,
          message: data.message,
          status: data.data?.status,
          confirmations: data.data?.confirmations
        };
      }

    } catch (error) {
      console.error('💥 [DEPOSIT-SERVICE] Error confirming payment:', error);
      throw error;
    }
  }

  // Get deposit history
  async getDepositHistory(userId, limit = 20) {
    try {
      console.log('💰 [DEPOSIT-SERVICE] Getting deposit history');
      const response = await fetch(`${API_BASE_URL}/balance/deposit-history/${userId}?limit=${limit}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ [DEPOSIT-SERVICE] History received:', data.data.length, 'records');
          return data.data;
        }
      }

      throw new Error('Failed to fetch deposit history');
    } catch (error) {
      console.error('💥 [DEPOSIT-SERVICE] Error fetching history:', error);
      return [];
    }
  }


  // Legacy methods for backward compatibility
  async checkTransaction(currency, txHash) {
    console.warn('⚠️ [DEPOSIT-SERVICE] checkTransaction is deprecated, use confirmPayment instead');
    return { status: 'unknown', confirmations: 0 };
  }

  async getTransactionHistory(userId, limit = 10) {
    console.warn('⚠️ [DEPOSIT-SERVICE] getTransactionHistory is deprecated, use getDepositHistory instead');
    return this.getDepositHistory(userId, limit);
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