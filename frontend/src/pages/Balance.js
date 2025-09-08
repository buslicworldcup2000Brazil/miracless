import React, { useState, useEffect } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowsRightLeftIcon,
  ClipboardDocumentIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import lotteryService from '../services/lotteryService';
import telegramWebApp from '../services/telegramWebApp';
import paymentService from '../services/paymentService';
import conversionService from '../services/conversionService';
import depositService from '../services/depositService';

// Conversion service will be initialized when needed

// Импортируем SVG иконки
const CryptoIcons = {
  TON: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#6366f1" d="M19.011 9.201L12.66 19.316a.857.857 0 0 1-1.453-.005L4.98 9.197a1.8 1.8 0 0 1-.266-.943a1.856 1.856 0 0 1 1.881-1.826h10.817c1.033 0 1.873.815 1.873 1.822c0 .334-.094.664-.274.951M6.51 8.863l4.632 7.144V8.143H6.994c-.48 0-.694.317-.484.72m6.347 7.144l4.633-7.144c.214-.403-.005-.72-.485-.72h-4.148z"/></svg>
  ),
  USDT: () => (
    <svg width="24" height="24" viewBox="0 0 510.99 444.52">
      <path fill="#f59e0b" d="M94.57,23.9,1.39,219.61A3.81,3.81,0,0,0,2.21,224L253.85,465.17a3.84,3.84,0,0,0,5.31,0L510.8,224.05a3.79,3.79,0,0,0,.82-4.42L418.44,23.91A3.74,3.74,0,0,0,415,21.72H98a3.75,3.75,0,0,0-3.46,2.18Z"/>
      <path fill="#0a0a0a" d="M288.84,239.71h0c-1.81.14-11.14.69-32,.69-16.56,0-28.31-.49-32.44-.69h0c-64-2.82-111.77-14-111.77-27.29S160.43,188,224.43,185.09v43.52c4.19.31,16.17,1,32.73,1,19.87,0,29.82-.82,31.62-1V185.12c63.86,2.85,111.52,14,111.52,27.3s-47.65,24.44-111.52,27.27h0Zm0-59.09v-39H378V82.28H135.31v59.39h89.11V180.6c-72.43,3.33-126.9,17.68-126.9,34.87S152,247,224.42,250.34v124.8h64.4V250.29c72.26-3.32,126.64-17.66,126.64-34.83S361.13,184,288.82,180.6h0Zm0,0Z"/>
    </svg>
  ),
  BNB: () => (
    <svg width="24" height="24" viewBox="0 0 511.97 511.97">
      <path fill="#f59e0b" d="M156.56,215.14,256,115.71l99.47,99.47,57.86-57.85L256,0,98.71,157.28l57.85,57.85M0,256l57.86-57.87L115.71,256,57.85,313.83Zm156.56,40.85L256,396.27l99.47-99.47,57.89,57.82,0,0L256,512,98.71,354.7l-.08-.09,57.93-57.77M396.27,256l57.85-57.85L512,256l-57.85,57.85Z"/>
      <path fill="#f59e0b" d="M314.66,256h0L256,197.25,212.6,240.63h0l-5,5L197.33,255.9l-.08.08.08.08L256,314.72l58.7-58.7,0,0-.05,0"/>
    </svg>
  ),
  ETH: () => (
    <svg width="24" height="24" viewBox="0 0 311.39 507.11">
      <polygon fill="#6366f1" points="155.65 0 152.25 11.56 152.25 346.87 155.65 350.26 311.3 258.26 155.65 0"/>
      <polygon fill="#8b5cf6" points="155.65 0 0 258.26 155.65 350.27 155.65 187.51 155.65 0"/>
      <polygon fill="#4f46e5" points="155.65 379.74 153.73 382.07 153.73 501.52 155.65 507.11 311.39 287.78 155.65 379.74"/>
      <polygon fill="#8b5cf6" points="155.65 507.11 155.65 379.73 0 287.78 155.65 507.11"/>
      <polygon fill="#1e293b" points="155.65 350.26 311.3 258.26 155.65 187.51 155.65 350.26"/>
      <polygon fill="#334155" points="0 258.26 155.65 350.26 155.65 187.51 0 258.26"/>
    </svg>
  ),
  MATIC: () => (
    <svg width="24" height="24" viewBox="0 0 507.91 446.91">
      <path fill="#8b5cf6" d="M384.58,136.59c-9.28-5.3-21.22-5.3-31.83,0l-74.26,43.77L228.1,208.2,155.16,252c-9.28,5.3-21.22,5.3-31.83,0l-57-34.48a32.33,32.33,0,0,1-15.92-27.85V123.33c0-10.61,5.31-21.22,15.92-27.85l57-33.15c9.28-5.31,21.22-5.31,31.83,0l57,34.48a32.31,32.31,0,0,1,15.92,27.85v43.76l50.39-29.18V94.16c0-10.61-5.3-21.22-15.91-27.85L156.48,4c-9.28-5.31-21.21-5.31-31.82,0L15.91,67.63C5.3,72.94,0,83.55,0,94.16V218.81C0,229.42,5.3,240,15.91,246.66L123.33,309c9.28,5.31,21.22,5.31,31.83,0l72.94-42.44,50.39-29.17,72.94-42.44c9.28-5.3,21.22-5.3,31.83,0l57,33.16A32.32,32.32,0,0,1,456.19,256v66.3c0,10.61-5.3,21.22-15.91,27.85l-55.7,33.16c-9.28,5.3-21.22,5.3-31.83,0l-57-33.16a32.32,32.32,0,0,1-15.91-27.85V279.82L229.42,309v43.76c0,10.61,5.31,21.22,15.92,27.85l107.41,62.33c9.29,5.31,21.22,5.31,31.83,0L492,380.6a32.32,32.32,0,0,0,15.91-27.85v-126c0-10.61-5.3-21.22-15.91-27.85Z"/>
    </svg>
  )
};

const Balance = ({ userId, modalView = false }) => {
  const [showReplenish, setShowReplenish] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const [paymentData, setPaymentData] = useState({
    currency: 'TON',
    amount: '',
    txHash: '',
    isConfirming: false,
    usdAmount: ''
  });
  const [transaction, setTransaction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [txHash, setTxHash] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [depositAddresses, setDepositAddresses] = useState({});
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Load user balance and deposit addresses on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load user balance
        if (userId) {
          const balance = await lotteryService.getUserBalance(userId);
          setUserBalance(balance);

          // Load deposit addresses
          setLoadingAddresses(true);
          const addresses = await depositService.getAllAddresses(userId);
          setDepositAddresses(addresses);
          setLoadingAddresses(false);
        }
      } catch (error) {
        console.error('Error loading balance data:', error);
        telegramWebApp.showAlert('Error loading balance data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  const showSnackbar = (message, type = 'info') => {
    setSnackbar({ message, type });
    setTimeout(() => setSnackbar(null), 3000);
  };

  const handleReplenish = (method) => {
    const currency = method.replace(' ', '_').replace('(', '_').replace(')', '').toUpperCase();
    setPaymentData({
      currency: currency,
      amount: '',
      usdAmount: ''
    });
    setShowReplenish(true);
  };

  const handleCurrencyChange = (currency) => {
    setPaymentData({
      ...paymentData,
      currency: currency.replace(' ', '_').replace('(', '_').replace(')', '').toUpperCase()
    });
  };

  const handleAmountChange = (e) => {
    const amount = e.target.value;
    const usdAmount = conversionService.convertToUSD(parseFloat(amount) || 0, paymentData.currency);
    setPaymentData({
      ...paymentData,
      amount: amount,
      usdAmount: usdAmount.toFixed(2)
    });
  };

  const handleUSDAmountChange = (e) => {
    const usdAmount = e.target.value;
    const cryptoAmount = conversionService.convertFromUSD(parseFloat(usdAmount) || 0, paymentData.currency);

    setPaymentData({
      ...paymentData,
      usdAmount: usdAmount,
      amount: conversionService.formatAmount(cryptoAmount, paymentData.currency)
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // Validate amount using conversion service
    const validation = conversionService.validateDeposit(paymentData.amount, paymentData.currency);
    if (!validation.valid) {
      showSnackbar(validation.error, 'error');
      return;
    }

    setIsProcessing(true);

    try {
      // Get payment address
      const recipientAddress = paymentService.getPaymentAddress(paymentData.currency);
      if (!recipientAddress) {
        throw new Error('Адрес для данной валюты не найден');
      }

      // Show payment instructions
      const currencyInfo = paymentService.getCurrencyInfo(paymentData.currency);
      const formattedAddress = paymentService.formatAddress(recipientAddress);

      showSnackbar(
        `Отправьте ${paymentData.amount} ${currencyInfo?.name || paymentData.currency} на адрес: ${formattedAddress}`,
        'info'
      );

      // Set transaction info for display
      setTransaction({
        address: recipientAddress,
        network: currencyInfo?.network || paymentData.currency,
        status: 'pending',
        amount: paymentData.amount,
        currency: paymentData.currency,
        usdAmount: paymentData.usdAmount,
        formattedAddress: formattedAddress
      });

    } catch (error) {
      showSnackbar(`Ошибка: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyAddress = async (currency) => {
    try {
      const address = depositAddresses[currency];
      if (!address) {
        showSnackbar('Address not available', 'error');
        return;
      }

      const success = await depositService.copyAddress(address);
      if (success) {
        showSnackbar(`Address copied: ${depositService.formatAddress(address)}`, 'success');
        telegramWebApp.hapticFeedback('success');
      } else {
        showSnackbar('Failed to copy address', 'error');
      }
    } catch (error) {
      showSnackbar('Error copying address', 'error');
    }
  };

  const handleOpenWallet = (currency, amount) => {
    try {
      const paymentLink = paymentService.generatePaymentLink(currency, amount);
      if (paymentLink) {
        window.open(paymentLink, '_blank');
        showSnackbar('Открываем кошелек...', 'info');
      } else {
        showSnackbar('Ссылка для кошелька недоступна', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка открытия кошелька', 'error');
    }
  };

  const handleSubmitTransaction = async () => {
    if (!txHash.trim()) {
      showSnackbar('Введите хеш транзакции', 'error');
      return;
    }

    if (!transaction) {
      showSnackbar('Сначала укажите сумму пополнения', 'error');
      return;
    }

    setIsSubmittingTx(true);

    try {
      console.log('💰 [PAYMENT-CONFIRMATION] Подтверждение платежа через новую систему');

      // Use new deposit service to confirm payment
      const result = await depositService.confirmPayment(userId, transaction.currency, txHash.trim());

      if (result.success) {
        showSnackbar(`✅ Платеж подтвержден! Баланс пополнен на $${result.usdAmount}`, 'success');
        telegramWebApp.hapticFeedback('success');

        // Update local balance
        setUserBalance(prev => prev + result.usdAmount);

        // Reset form
        setTxHash('');
        setTransaction(null);
        setPaymentData({
          currency: 'TON',
          amount: '',
          usdAmount: '',
          txHash: '',
          isConfirming: false
        });
      } else {
        showSnackbar(result.message || 'Платеж не подтвержден', 'warning');
      }

    } catch (error) {
      console.error('💥 [PAYMENT-CONFIRMATION] Ошибка подтверждения платежа:', error);
      showSnackbar(error.message || 'Ошибка подтверждения платежа', 'error');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Handle "I Paid" button click
  const handlePaymentCompleted = async () => {
    if (!transaction) {
      showSnackbar('Сначала укажите сумму пополнения', 'error');
      return;
    }

    setPaymentData(prev => ({ ...prev, isConfirming: true }));

    try {
      console.log('💰 [PAYMENT-COMPLETED] Пользователь нажал "Оплатил"');

      // Create deposit request first
      await depositService.createDepositRequest(
        userId,
        transaction.currency,
        parseFloat(transaction.amount)
      );

      showSnackbar('✅ Запрос на пополнение создан! Ожидаем подтверждения транзакции...', 'info');

      // Auto-check payment after 30 seconds
      setTimeout(async () => {
        try {
          console.log('🔍 [AUTO-CHECK] Автоматическая проверка платежа...');
          // This would be handled by the backend monitoring system
          showSnackbar('🔄 Проверяем транзакцию...', 'info');
        } catch (error) {
          console.error('💥 [AUTO-CHECK] Ошибка автоматической проверки:', error);
        }
      }, 30000);

    } catch (error) {
      console.error('💥 [PAYMENT-COMPLETED] Ошибка создания запроса:', error);
      showSnackbar(error.message || 'Ошибка создания запроса на пополнение', 'error');
    } finally {
      setPaymentData(prev => ({ ...prev, isConfirming: false }));
    }
  };


  const replenishMethods = [
    { name: 'TON', icon: CryptoIcons.TON },
    { name: 'USDT (TRC-20)', icon: CryptoIcons.USDT },
    { name: 'USDT (ERC-20)', icon: CryptoIcons.USDT },
    { name: 'ETH', icon: CryptoIcons.ETH },
    { name: 'MATIC', icon: CryptoIcons.MATIC },
    { name: 'BNB', icon: CryptoIcons.BNB }
  ];

  const getCurrencyIcon = (currency) => {
    switch(currency.split('_')[0]) {
      case 'TON': return <CryptoIcons.TON />;
      case 'USDT': return <CryptoIcons.USDT />;
      case 'ETH': return <CryptoIcons.ETH />;
      case 'MATIC': return <CryptoIcons.MATIC />;
      case 'BNB': return <CryptoIcons.BNB />;
      default: return <CryptoIcons.TON />;
    }
  };

  if (loading) {
    return (
      <div className="balance-container">
        <div className="loading-spinner"></div>
        <p>Loading balance...</p>
      </div>
    );
  }

  if (modalView) {
    return (
      <div className="balance-modal-content">
        <div className="replenish-section">
          <h3>Deposit Methods</h3>
          <div className="replenish-methods">
            {replenishMethods.map((method, index) => (
              <button
                key={index}
                className="replenish-btn"
                onClick={() => handleReplenish(method.name)}
              >
                <method.icon />
                {method.name}
              </button>
            ))}
          </div>
        </div>

        {snackbar && (
          <div className={`snackbar ${snackbar.type}`}>
            {snackbar.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="balance-container">
      <div className="balance-card">
        <div className="balance-header">
          <div className="balance-info">
            <h2>Your Balance</h2>
            <div className="balance-amount">${userBalance.toFixed(2)}</div>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => setShowReplenish(!showReplenish)}
        >
          <ArrowDownTrayIcon width={20} height={20} />
          Пополнить баланс
        </button>
      </div>

      {showReplenish && (
        <div className="replenish-section">
          <h3>Способы пополнения</h3>
          <div className="replenish-methods">
            {replenishMethods.map((method, index) => (
              <button
                key={index}
                className="replenish-btn"
                onClick={() => handleReplenish(method.name)}
              >
                <method.icon />
                {method.name}
              </button>
            ))}
          </div>

          {paymentData.currency && (
            <div className="payment-address-section">
              <h4>Deposit Address for {paymentData.currency}</h4>
              <div className="address-display">
                <code>
                  {loadingAddresses
                    ? 'Loading address...'
                    : depositService.formatAddress(depositAddresses[paymentData.currency] || 'Not available')
                  }
                </code>
                <button
                  className="btn-icon"
                  onClick={() => handleCopyAddress(paymentData.currency)}
                  title="Copy address"
                  disabled={loadingAddresses}
                >
                  <ClipboardDocumentIcon width={16} height={16} />
                </button>
                <button
                  className="btn-icon"
                  onClick={() => handleOpenWallet(paymentData.currency, paymentData.amount)}
                  title="Open in wallet"
                >
                  <LinkIcon width={16} height={16} />
                </button>
              </div>
              <div className="exchange-rate-info">
                <h5>Current Rate:</h5>
                <p>1 {paymentData.currency} = ${conversionService.getPrice(paymentData.currency).toFixed(4)} USD</p>
                <p className="confirmation-time">
                  Confirmation time: {conversionService.getConfirmationTime(paymentData.currency)}
                </p>
              </div>
              <p className="address-note">
                Send funds to this address. Your balance will be updated automatically after transaction confirmation.
              </p>
            </div>
          )}
        </div>
      )}

      {showPaymentForm && (
        <div className="payment-modal">
          <div className="payment-form">
            <h3>Пополнение баланса</h3>
            
            <form onSubmit={handlePaymentSubmit}>
              <div className="form-group">
                <label>Валюта:</label>
                <div className="currency-selector">
                  {getCurrencyIcon(paymentData.currency)}
                  <select 
                    value={paymentData.currency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="currency-select"
                  >
                    <option value="TON">TON</option>
                    <option value="USDT_TRC20">USDT (TRC-20)</option>
                    <option value="USDT_ERC20">USDT (ERC-20)</option>
                    <option value="ETH">ETH</option>
                    <option value="MATIC">MATIC</option>
                    <option value="BNB">BNB</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Сумма:</label>
                <div className="amount-inputs">
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Количество"
                    value={paymentData.amount}
                    onChange={handleAmountChange}
                    className="amount-input"
                  />
                  <ArrowsRightLeftIcon className="swap-icon" />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="USD"
                    value={paymentData.usdAmount}
                    onChange={handleUSDAmountChange}
                    className="usd-input"
                  />
                </div>
              </div>
              
              <div className="payment-info">
                {paymentData.amount && (
                  <p>Вы отправляете: {paymentData.amount} {paymentData.currency}</p>
                )}
                {paymentData.usdAmount && (
                  <p>Это примерно: ${paymentData.usdAmount} USD</p>
                )}
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowPaymentForm(false)}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isProcessing || !paymentData.amount}
                >
                  {isProcessing ? 'Обработка...' : 'Оплатить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {transaction && (
        <div className="transaction-status">
          <h4>Инструкции по оплате</h4>
          <div className="transaction-details">
            <div className="address-info">
              <p><strong>Адрес:</strong></p>
              <code className="payment-address">{transaction.address}</code>
              <button
                className="btn-icon"
                onClick={() => handleCopyAddress(transaction.currency)}
                title="Копировать адрес"
              >
                <ClipboardDocumentIcon width={16} height={16} />
              </button>
              <button
                className="btn-primary"
                onClick={handlePaymentCompleted}
                disabled={paymentData.isConfirming}
                title="Я оплатил"
              >
                {paymentData.isConfirming ? 'Создание...' : 'Оплатил'}
              </button>
            </div>
            <p><strong>Сумма:</strong> {transaction.amount} {transaction.currency} (${transaction.usdAmount})</p>
            <p><strong>Сеть:</strong> {transaction.network}</p>
            <div className="payment-actions">
              <button
                className="btn-secondary"
                onClick={() => handleOpenWallet(transaction.currency, transaction.amount)}
              >
                <LinkIcon width={16} height={16} />
                Открыть в кошельке
              </button>
            </div>
            <div className="transaction-hash-section">
              <h5>Подтверждение транзакции</h5>
              <p>После отправки средств введите хеш транзакции:</p>
              <input
                type="text"
                placeholder="Хеш транзакции (TX Hash)"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="tx-hash-input"
              />
              <button
                className="btn-primary"
                onClick={handleSubmitTransaction}
                disabled={isSubmittingTx || !txHash.trim()}
              >
                {isSubmittingTx ? 'Отправка...' : 'Я отправил средства'}
              </button>
            </div>
            <p className="payment-note">
              После подтверждения транзакции баланс будет автоматически обновлен.
            </p>
          </div>
        </div>
      )}

      {snackbar && (
        <div className={`snackbar ${snackbar.type}`}>
          {snackbar.message}
        </div>
      )}
    </div>
  );
};

export default Balance;