// Payment service for handling crypto deposits
const PAYMENT_ADDRESSES = {
  'TON': 'UQC5JgHh2woeEVsNf197RxYWc7y_ybp3TKczyOR8Q1ck9LVo',
  'USDT_TRC20': 'TAqVqKZ5zHbX4Cz5x5ZGodXLQkuvLCFCYD',
  'USDT_ERC20': '0x25c03364243614BbA73d5d214E29cBFcE241A825',
  'ETH': '0x25c03364243614BbA73d5d214E29cBFcE241A825',
  'BNB': '0x25c03364243614BbA73d5d214E29cBFcE241A825',
  'MATIC': '0x25c03364243614BbA73d5d214E29cBFcE241A825'
};

class PaymentService {
  // Get payment address for specific currency
  getPaymentAddress(currency) {
    const normalizedCurrency = currency.replace(' ', '_').replace('(', '_').replace(')', '').toUpperCase();
    return PAYMENT_ADDRESSES[normalizedCurrency] || null;
  }

  // Get all payment addresses
  getAllAddresses() {
    return PAYMENT_ADDRESSES;
  }

  // Copy address to clipboard
  async copyAddress(currency) {
    const address = this.getPaymentAddress(currency);
    if (!address) {
      throw new Error('Адрес для данной валюты не найден');
    }

    try {
      await navigator.clipboard.writeText(address);
      return address;
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return address;
    }
  }

  // Generate payment link for wallets
  generatePaymentLink(currency, amount) {
    const address = this.getPaymentAddress(currency);
    if (!address) {
      return null;
    }

    const normalizedCurrency = currency.replace(' ', '_').replace('(', '_').replace(')', '').toUpperCase();

    switch (normalizedCurrency) {
      case 'TON':
        return `ton://transfer/${address}?amount=${amount || ''}`;
      case 'USDT_TRC20':
        return `tronlink://transfer?to=${address}&amount=${amount || ''}`;
      case 'ETH':
      case 'USDT_ERC20':
        return `ethereum:${address}?value=${amount || ''}`;
      case 'BNB':
        return `bsc:${address}?value=${amount || ''}`;
      case 'MATIC':
        return `polygon:${address}?value=${amount || ''}`;
      default:
        return null;
    }
  }

  // Get currency info
  getCurrencyInfo(currency) {
    const normalizedCurrency = currency.replace(' ', '_').replace('(', '_').replace(')', '').toUpperCase();

    const currencyInfo = {
      'TON': {
        name: 'TON',
        fullName: 'The Open Network',
        network: 'TON',
        decimals: 9,
        icon: '🟣'
      },
      'USDT_TRC20': {
        name: 'USDT',
        fullName: 'Tether (TRC-20)',
        network: 'Tron',
        decimals: 6,
        icon: '🟢'
      },
      'USDT_ERC20': {
        name: 'USDT',
        fullName: 'Tether (ERC-20)',
        network: 'Ethereum',
        decimals: 6,
        icon: '🟢'
      },
      'ETH': {
        name: 'ETH',
        fullName: 'Ethereum',
        network: 'Ethereum',
        decimals: 18,
        icon: '🔷'
      },
      'BNB': {
        name: 'BNB',
        fullName: 'Binance Coin',
        network: 'BSC',
        decimals: 18,
        icon: '🟡'
      },
      'MATIC': {
        name: 'MATIC',
        fullName: 'Polygon',
        network: 'Polygon',
        decimals: 18,
        icon: '🟣'
      }
    };

    return currencyInfo[normalizedCurrency] || null;
  }

  // Validate payment amount
  validateAmount(amount, currency) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { valid: false, error: 'Некорректная сумма' };
    }

    const currencyInfo = this.getCurrencyInfo(currency);
    if (!currencyInfo) {
      return { valid: false, error: 'Неизвестная валюта' };
    }

    // Check minimum amount (0.01 USD equivalent)
    const minAmount = 0.01;
    if (numAmount < minAmount) {
      return { valid: false, error: `Минимальная сумма: ${minAmount}` };
    }

    return { valid: true };
  }

  // Format address for display
  formatAddress(address, length = 8) {
    if (!address) return '';
    if (address.length <= length * 2) return address;
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }
}

const paymentService = new PaymentService();
export default paymentService;