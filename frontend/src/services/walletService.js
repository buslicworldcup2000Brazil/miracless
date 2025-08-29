// Wallet integration service for Trust Wallet and MetaMask
class WalletService {
  constructor() {
    this.connectedWallet = null;
    this.walletType = null; // 'metamask', 'trust', 'walletconnect'
    this.chainId = null;
    this.account = null;
    this.isConnecting = false;
    this.listeners = new Set();
    this.supportedChains = {
      1: { name: 'Ethereum Mainnet', symbol: 'ETH' },
      56: { name: 'Binance Smart Chain', symbol: 'BNB' },
      137: { name: 'Polygon Mainnet', symbol: 'MATIC' },
      42161: { name: 'Arbitrum One', symbol: 'ETH' }
    };
  }

  // Initialize wallet service
  async init() {
    if (typeof window === 'undefined') return false;

    // Check for MetaMask
    if (window.ethereum && window.ethereum.isMetaMask) {
      this.walletType = 'metamask';
      this.setupMetaMaskListeners();
      return true;
    }

    // Check for Trust Wallet
    if (window.ethereum && window.ethereum.isTrust) {
      this.walletType = 'trust';
      this.setupTrustWalletListeners();
      return true;
    }

    // Check for WalletConnect (for mobile wallets)
    if (this.checkWalletConnectSupport()) {
      this.walletType = 'walletconnect';
      return true;
    }

    console.log('No supported wallet found');
    return false;
  }

  // Setup MetaMask event listeners
  setupMetaMaskListeners() {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        this.account = accounts[0];
        this.notifyListeners('account-changed', this.account);
      } else {
        this.disconnect();
      }
    });

    window.ethereum.on('chainChanged', (chainId) => {
      this.chainId = parseInt(chainId, 16);
      this.notifyListeners('chain-changed', this.chainId);
    });

    window.ethereum.on('disconnect', () => {
      this.disconnect();
    });
  }

  // Setup Trust Wallet event listeners
  setupTrustWalletListeners() {
    this.setupMetaMaskListeners(); // Trust Wallet uses similar API
  }

  // Check WalletConnect support
  checkWalletConnectSupport() {
    // WalletConnect integration would go here
    // For now, return false as it's more complex to implement
    return false;
  }

  // Connect to wallet
  async connect(walletType = 'auto') {
    if (this.isConnecting) {
      throw new Error('Already connecting to wallet');
    }

    this.isConnecting = true;

    try {
      if (walletType === 'auto') {
        walletType = this.walletType;
      }

      switch (walletType) {
        case 'metamask':
          return await this.connectMetaMask();
        case 'trust':
          return await this.connectTrustWallet();
        case 'walletconnect':
          return await this.connectWalletConnect();
        default:
          throw new Error('Unsupported wallet type');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  // Connect to MetaMask
  async connectMetaMask() {
    if (!window.ethereum || !window.ethereum.isMetaMask) {
      throw new Error('MetaMask not found');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.account = accounts[0];
      this.walletType = 'metamask';
      this.connectedWallet = 'MetaMask';

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      this.chainId = parseInt(chainId, 16);

      this.notifyListeners('connected', {
        wallet: this.connectedWallet,
        account: this.account,
        chainId: this.chainId
      });

      return {
        wallet: this.connectedWallet,
        account: this.account,
        chainId: this.chainId
      };
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('User rejected connection');
      }
      throw error;
    }
  }

  // Connect to Trust Wallet
  async connectTrustWallet() {
    if (!window.ethereum || !window.ethereum.isTrust) {
      throw new Error('Trust Wallet not found');
    }

    // Trust Wallet uses the same API as MetaMask
    return await this.connectMetaMask();
  }

  // Connect via WalletConnect
  async connectWalletConnect() {
    // WalletConnect implementation would go here
    throw new Error('WalletConnect not implemented yet');
  }

  // Disconnect wallet
  async disconnect() {
    this.connectedWallet = null;
    this.walletType = null;
    this.chainId = null;
    this.account = null;

    this.notifyListeners('disconnected');
  }

  // Get current account
  getAccount() {
    return this.account;
  }

  // Get current chain ID
  getChainId() {
    return this.chainId;
  }

  // Get wallet info
  getWalletInfo() {
    return {
      connected: !!this.connectedWallet,
      wallet: this.connectedWallet,
      type: this.walletType,
      account: this.account,
      chainId: this.chainId,
      chainName: this.supportedChains[this.chainId]?.name || 'Unknown',
      chainSymbol: this.supportedChains[this.chainId]?.symbol || 'Unknown'
    };
  }

  // Check if wallet is connected
  isConnected() {
    return !!this.connectedWallet && !!this.account;
  }

  // Switch to specific chain
  async switchChain(chainId) {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected');
    }

    if (!window.ethereum) {
      throw new Error('Ethereum provider not available');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });
    } catch (error) {
      if (error.code === 4902) {
        // Chain not added, try to add it
        await this.addChain(chainId);
      } else {
        throw error;
      }
    }
  }

  // Add chain to wallet
  async addChain(chainId) {
    if (!window.ethereum) return;

    const chainConfigs = {
      56: { // BSC
        chainId: '0x38',
        chainName: 'Binance Smart Chain',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com/']
      },
      137: { // Polygon
        chainId: '0x89',
        chainName: 'Polygon Mainnet',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com/'],
        blockExplorerUrls: ['https://polygonscan.com/']
      }
    };

    const config = chainConfigs[chainId];
    if (!config) {
      throw new Error('Chain configuration not found');
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [config]
    });
  }

  // Send transaction
  async sendTransaction(to, value, data = '0x') {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected');
    }

    if (!window.ethereum) {
      throw new Error('Ethereum provider not available');
    }

    const transactionParameters = {
      to,
      from: this.account,
      value: `0x${value.toString(16)}`,
      data
    };

    try {
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters]
      });

      this.notifyListeners('transaction-sent', { txHash, to, value });
      return txHash;
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  // Sign message
  async signMessage(message) {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected');
    }

    if (!window.ethereum) {
      throw new Error('Ethereum provider not available');
    }

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, this.account]
      });

      return signature;
    } catch (error) {
      console.error('Sign error:', error);
      throw error;
    }
  }

  // Get balance
  async getBalance() {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected');
    }

    if (!window.ethereum) {
      throw new Error('Ethereum provider not available');
    }

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [this.account, 'latest']
      });

      return parseInt(balance, 16) / 1e18; // Convert from wei to ETH
    } catch (error) {
      console.error('Balance error:', error);
      throw error;
    }
  }

  // Subscribe to wallet events
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

  // Get supported wallets
  getSupportedWallets() {
    const wallets = [];

    if (window.ethereum?.isMetaMask) {
      wallets.push({
        type: 'metamask',
        name: 'MetaMask',
        icon: '🦊'
      });
    }

    if (window.ethereum?.isTrust) {
      wallets.push({
        type: 'trust',
        name: 'Trust Wallet',
        icon: '🔐'
      });
    }

    return wallets;
  }

  // Check if wallet is available
  isWalletAvailable(walletType) {
    switch (walletType) {
      case 'metamask':
        return !!(window.ethereum?.isMetaMask);
      case 'trust':
        return !!(window.ethereum?.isTrust);
      case 'walletconnect':
        return this.checkWalletConnectSupport();
      default:
        return false;
    }
  }

  // Cleanup
  destroy() {
    this.listeners.clear();
    this.disconnect();
  }
}

// Create singleton instance
const walletService = new WalletService();

export default walletService;