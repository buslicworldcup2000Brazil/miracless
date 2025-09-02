// Balance service for managing cryptocurrency deposits and withdrawals
const { PrismaClient } = require('@prisma/client');
const transactionMonitor = require('./transactionMonitor');
const { logAdminAction } = require('./adminLogger');
const notificationService = require('./notificationService');

const prisma = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

console.log('💰 [BALANCE-SERVICE] Инициализация сервиса баланса с PostgreSQL');

// Payment addresses for different currencies
const PAYMENT_ADDRESSES = {
    'TON': 'UQC5JgHh2woeEVsNf197RxYWc7y_ybp3TKczyOR8Q1ck9LVo',
    'USDT_TRC20': 'TAqVqKZ5zHbX4Cz5x5ZGodXLQkuvLCFCYD',
    'USDT_ERC20': '0x25c03364243614BbA73d5d214E29cBFcE241A825',
    'ETH': '0x25c03364243614BbA73d5d214E29cBFcE241A825',
    'BNB': '0x25c03364243614BbA73d5d214E29cBFcE241A825'
};

// Supported currencies
const SUPPORTED_CURRENCIES = Object.keys(PAYMENT_ADDRESSES);

// Transaction timeout (10 minutes)
const TRANSACTION_TIMEOUT = 10 * 60 * 1000;

class BalanceService {
    constructor() {
        this.pendingTransactions = new Map();
        this.processedTransactions = new Set();
        this.pendingTimeouts = new Map();
    }

    // Get payment address for currency
    getPaymentAddress(currency) {
        console.log('💰 [BALANCE-SERVICE] Запрос адреса для валюты:', currency);
        const address = PAYMENT_ADDRESSES[currency];
        if (!address) {
            console.error('❌ [BALANCE-SERVICE] Адрес не найден для валюты:', currency);
            throw new Error(`Payment address not found for currency: ${currency}`);
        }
        console.log('✅ [BALANCE-SERVICE] Адрес найден:', this.formatAddress(address));
        return address;
    }

    // Get all payment addresses
    getAllPaymentAddresses() {
        console.log('💰 [BALANCE-SERVICE] Запрос всех адресов оплаты');
        return { ...PAYMENT_ADDRESSES };
    }

    // Format address for display
    formatAddress(address, length = 8) {
        if (!address) return '';
        if (address.length <= length * 2) return address;
        return `${address.slice(0, length)}...${address.slice(-length)}`;
    }

    // Get currency info
    getCurrencyInfo(currency) {
        const currencyMap = {
            'TON': {
                name: 'TON',
                fullName: 'The Open Network',
                network: 'TON',
                decimals: 9,
                minAmount: 0.01
            },
            'USDT_TRC20': {
                name: 'USDT',
                fullName: 'Tether (TRC-20)',
                network: 'Tron',
                decimals: 6,
                minAmount: 1
            },
            'USDT_ERC20': {
                name: 'USDT',
                fullName: 'Tether (ERC-20)',
                network: 'Ethereum',
                decimals: 6,
                minAmount: 1
            },
            'ETH': {
                name: 'ETH',
                fullName: 'Ethereum',
                network: 'Ethereum',
                decimals: 18,
                minAmount: 0.001
            },
            'BNB': {
                name: 'BNB',
                fullName: 'Binance Coin',
                network: 'BSC',
                decimals: 18,
                minAmount: 0.01
            }
        };

        return currencyMap[currency] || currencyMap.TON;
    }

    // Validate currency
    isValidCurrency(currency) {
        return SUPPORTED_CURRENCIES.includes(currency);
    }

    // Create deposit request
    async createDepositRequest(userId, currency, expectedAmount) {
        console.log('💰 [DEPOSIT-REQUEST] НАЧАЛО СОЗДАНИЯ ЗАПРОСА НА ПОПОЛНЕНИЕ');
        console.log('👤 [DEPOSIT-REQUEST] User ID:', userId);
        console.log('💱 [DEPOSIT-REQUEST] Currency:', currency);
        console.log('💵 [DEPOSIT-REQUEST] Expected Amount:', expectedAmount);

        try {
            // Validate currency
            if (!this.isValidCurrency(currency)) {
                console.error('❌ [DEPOSIT-REQUEST] Неподдерживаемая валюта:', currency);
                throw new Error(`Unsupported currency: ${currency}`);
            }

            // Validate amount
            const currencyInfo = this.getCurrencyInfo(currency);
            if (expectedAmount < currencyInfo.minAmount) {
                console.error('❌ [DEPOSIT-REQUEST] Сумма меньше минимальной:', expectedAmount, 'Min:', currencyInfo.minAmount);
                throw new Error(`Amount too small. Minimum: ${currencyInfo.minAmount} ${currency}`);
            }

            // Get payment address
            const paymentAddress = this.getPaymentAddress(currency);
            console.log('📍 [DEPOSIT-REQUEST] Payment Address:', this.formatAddress(paymentAddress));

            // Create deposit request in database
            const depositRequest = await prisma.depositRequest.create({
                data: {
                    user_id: String(userId),
                    currency: currency,
                    expected_amount: expectedAmount,
                    payment_address: paymentAddress,
                    status: 'pending',
                    created_at: new Date(),
                    expires_at: new Date(Date.now() + TRANSACTION_TIMEOUT)
                }
            });

            console.log('✅ [DEPOSIT-REQUEST] Запрос создан в БД:', depositRequest.id);

            // Store in pending transactions
            const requestKey = `${userId}_${currency}_${Date.now()}`;
            this.pendingTransactions.set(requestKey, {
                id: depositRequest.id,
                userId,
                currency,
                expectedAmount,
                paymentAddress,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + TRANSACTION_TIMEOUT)
            });

            console.log('📋 [DEPOSIT-REQUEST] Добавлено в ожидающие транзакции');

            // Set timeout for automatic expiration
            const timeoutId = setTimeout(async () => {
                try {
                    console.log('⏰ [TIMEOUT] Истекло время ожидания для запроса:', depositRequest.id);

                    // Update request status to expired
                    await prisma.depositRequest.update({
                        where: { id: depositRequest.id },
                        data: { status: 'expired' }
                    });

                    // Send notification about expiration
                    const timeoutMessage = this.formatBalanceUpdateMessage(0, 'timeout');
                    await notificationService.sendToUser(userId, timeoutMessage, {
                        parseMode: 'HTML'
                    });

                    // Log timeout event
                    await logAdminAction('system', 'deposit_timeout', {
                        userId,
                        currency,
                        requestId: depositRequest.id,
                        expectedAmount
                    });

                    // Clean up
                    this.pendingTransactions.delete(requestKey);
                    this.pendingTimeouts.delete(depositRequest.id);

                    console.log('✅ [TIMEOUT] Запрос отмечен как истекший');

                } catch (error) {
                    console.error('💥 [TIMEOUT] Ошибка обработки таймаута:', error);
                }
            }, TRANSACTION_TIMEOUT);

            this.pendingTimeouts.set(depositRequest.id, timeoutId);
            console.log('⏰ [TIMEOUT] Установлен таймер на 10 минут');

            return {
                id: depositRequest.id,
                address: paymentAddress,
                currency,
                expectedAmount,
                expiresAt: depositRequest.expires_at
            };

        } catch (error) {
            console.error('💥 [DEPOSIT-REQUEST] Ошибка создания запроса:', error);
            console.error('🔍 [DEPOSIT-REQUEST] Детали ошибки:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            throw error;
        }
    }

    // Process payment confirmation
    async processPaymentConfirmation(userId, currency, txHash) {
        console.log('💰 [PAYMENT-CONFIRMATION] НАЧАЛО ОБРАБОТКИ ПОДТВЕРЖДЕНИЯ ПЛАТЕЖА');
        console.log('👤 [PAYMENT-CONFIRMATION] User ID:', userId);
        console.log('💱 [PAYMENT-CONFIRMATION] Currency:', currency);
        console.log('🔗 [PAYMENT-CONFIRMATION] TX Hash:', txHash);

        try {
            // Check if transaction already processed
            if (this.processedTransactions.has(txHash)) {
                console.warn('⚠️ [PAYMENT-CONFIRMATION] Транзакция уже обработана:', txHash);
                await logAdminAction('system', 'duplicate_transaction_attempt', {
                    userId,
                    currency,
                    txHash,
                    reason: 'Transaction already processed'
                });
                return { success: false, message: 'Transaction already processed' };
            }

            // Check for duplicate in database
            const existingTransaction = await prisma.transaction.findFirst({
                where: { tx_hash: txHash }
            });

            if (existingTransaction) {
                console.warn('⚠️ [PAYMENT-CONFIRMATION] Транзакция уже существует в БД:', txHash);
                await logAdminAction('system', 'duplicate_transaction_db', {
                    userId,
                    currency,
                    txHash,
                    existingTxId: existingTransaction.id
                });
                return { success: false, message: 'Transaction already exists in database' };
            }

            // Get payment address for currency
            const paymentAddress = this.getPaymentAddress(currency);
            console.log('📍 [PAYMENT-CONFIRMATION] Payment Address:', this.formatAddress(paymentAddress));

            // Find pending deposit request
            const pendingRequest = await prisma.depositRequest.findFirst({
                where: {
                    user_id: String(userId),
                    currency: currency,
                    status: 'pending',
                    expires_at: {
                        gt: new Date()
                    }
                },
                orderBy: {
                    created_at: 'desc'
                }
            });

            if (!pendingRequest) {
                console.error('❌ [PAYMENT-CONFIRMATION] Активный запрос на пополнение не найден');
                return { success: false, message: 'No active deposit request found' };
            }

            console.log('📋 [PAYMENT-CONFIRMATION] Найден запрос:', pendingRequest.id);

            // Check transaction using blockchain API
            console.log('🔍 [PAYMENT-CONFIRMATION] Проверка транзакции через блокчейн...');
            const txResult = await transactionMonitor.checkTransaction(txHash, currency);

            if (txResult.status !== 'confirmed') {
                console.warn('⚠️ [PAYMENT-CONFIRMATION] Транзакция не подтверждена:', txResult.status);
                return {
                    success: false,
                    message: 'Transaction not confirmed yet. Please wait.',
                    status: txResult.status,
                    confirmations: txResult.confirmations
                };
            }

            console.log('✅ [PAYMENT-CONFIRMATION] Транзакция подтверждена');

            // Get current exchange rate
            console.log('💱 [PAYMENT-CONFIRMATION] Получение курса валюты...');
            const exchangeRate = await this.getExchangeRate(currency);
            const usdAmount = txResult.amount * exchangeRate;

            console.log('💵 [PAYMENT-CONFIRMATION] Сумма в USD:', usdAmount);

            // Update user balance
            console.log('💰 [PAYMENT-CONFIRMATION] Обновление баланса пользователя...');
            const user = await prisma.user.findUnique({
                where: { telegram_id: String(userId) }
            });

            if (!user) {
                console.error('❌ [PAYMENT-CONFIRMATION] Пользователь не найден');
                throw new Error('User not found');
            }

            const newBalance = user.balance + usdAmount;
            await prisma.user.update({
                where: { telegram_id: String(userId) },
                data: { balance: newBalance }
            });

            console.log('✅ [PAYMENT-CONFIRMATION] Баланс обновлен:', user.balance, '→', newBalance);

            // Update deposit request status
            await prisma.depositRequest.update({
                where: { id: pendingRequest.id },
                data: {
                    status: 'completed',
                    tx_hash: txHash,
                    actual_amount: txResult.amount,
                    usd_amount: usdAmount,
                    completed_at: new Date()
                }
            });

            // Cancel timeout for this request
            if (this.pendingTimeouts.has(pendingRequest.id)) {
                clearTimeout(this.pendingTimeouts.get(pendingRequest.id));
                this.pendingTimeouts.delete(pendingRequest.id);
            }

            // Create transaction record
            const transaction = await prisma.transaction.create({
                data: {
                    tx_hash: txHash,
                    currency: currency,
                    user_id: String(userId),
                    amount: txResult.amount,
                    usd_amount: usdAmount,
                    status: 'completed',
                    type: 'deposit',
                    processed_at: new Date()
                }
            });

            console.log('✅ [PAYMENT-CONFIRMATION] Транзакция записана в БД:', transaction.id);

            // Mark as processed
            this.processedTransactions.add(txHash);

            // Send notification
            console.log('📢 [PAYMENT-CONFIRMATION] Отправка уведомления пользователю...');
            const depositMessage = this.formatBalanceUpdateMessage(usdAmount, 'deposit');
            await notificationService.sendToUser(userId, depositMessage, {
                parseMode: 'HTML'
            });

            // Log admin action
            await logAdminAction('system', 'deposit_processed', {
                userId,
                currency,
                amount: txResult.amount,
                usdAmount,
                txHash
            });

            console.log('🎉 [PAYMENT-CONFIRMATION] ПОПОЛНЕНИЕ УСПЕШНО ОБРАБОТАНО');

            return {
                success: true,
                amount: txResult.amount,
                usdAmount,
                newBalance,
                txHash
            };

        } catch (error) {
            console.error('💥 [PAYMENT-CONFIRMATION] Ошибка обработки платежа:', error);
            console.error('🔍 [PAYMENT-CONFIRMATION] Детали ошибки:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });

            // Log error
            await logAdminAction('system', 'deposit_error', {
                userId,
                currency,
                txHash,
                error: error.message
            });

            throw error;
        }
    }

    // Get exchange rate from CoinGecko
    async getExchangeRate(currency) {
        try {
            console.log('💱 [EXCHANGE-RATE] Получение курса для:', currency);

            // Map currency to CoinGecko ID
            const coinGeckoIds = {
                'TON': 'the-open-network',
                'ETH': 'ethereum',
                'BNB': 'binancecoin',
                'USDT_TRC20': 'tether',
                'USDT_ERC20': 'tether'
            };

            const coinId = coinGeckoIds[currency];
            if (!coinId) {
                console.warn('⚠️ [EXCHANGE-RATE] CoinGecko ID не найден, используем 1 для USDT');
                return 1; // USDT = 1 USD
            }

            // For now, return cached/default rates
            // In production, integrate with CoinGecko API
            const defaultRates = {
                'TON': 2.45,
                'ETH': 3200.00,
                'BNB': 300.00,
                'USDT_TRC20': 1.00,
                'USDT_ERC20': 1.00
            };

            const rate = defaultRates[currency] || 1;
            console.log('✅ [EXCHANGE-RATE] Курс получен:', rate, 'USD');
            return rate;

        } catch (error) {
            console.error('💥 [EXCHANGE-RATE] Ошибка получения курса:', error);
            // Return default rate
            return 1;
        }
    }

    // Check expired requests and clean up
    async cleanupExpiredRequests() {
        console.log('🧹 [CLEANUP] Очистка истекших запросов на пополнение');

        try {
            const expiredRequests = await prisma.depositRequest.updateMany({
                where: {
                    status: 'pending',
                    expires_at: {
                        lt: new Date()
                    }
                },
                data: {
                    status: 'expired'
                }
            });

            console.log('✅ [CLEANUP] Истекших запросов:', expiredRequests.count);

            // Clean up processed transactions (keep last 1000)
            if (this.processedTransactions.size > 1000) {
                const toRemove = Array.from(this.processedTransactions).slice(0, 100);
                toRemove.forEach(tx => this.processedTransactions.delete(tx));
                console.log('🧹 [CLEANUP] Очищено обработанных транзакций:', toRemove.length);
            }

        } catch (error) {
            console.error('💥 [CLEANUP] Ошибка очистки:', error);
        }
    }

    // Get user balance
    async getUserBalance(userId) {
        console.log('💰 [GET-BALANCE] Запрос баланса пользователя:', userId);

        try {
            const user = await prisma.user.findUnique({
                where: { telegram_id: String(userId) },
                select: { balance: true }
            });

            if (!user) {
                console.error('❌ [GET-BALANCE] Пользователь не найден');
                throw new Error('User not found');
            }

            console.log('✅ [GET-BALANCE] Баланс получен:', user.balance);
            return user.balance;

        } catch (error) {
            console.error('💥 [GET-BALANCE] Ошибка получения баланса:', error);
            throw error;
        }
    }

    // Get deposit history
    async getDepositHistory(userId, limit = 20) {
        console.log('📋 [DEPOSIT-HISTORY] Запрос истории пополнений:', userId);

        try {
            const history = await prisma.depositRequest.findMany({
                where: { user_id: String(userId) },
                orderBy: { created_at: 'desc' },
                take: limit,
                include: {
                    transaction: true
                }
            });

            console.log('✅ [DEPOSIT-HISTORY] Найдено записей:', history.length);
            return history;

        } catch (error) {
            console.error('💥 [DEPOSIT-HISTORY] Ошибка получения истории:', error);
            throw error;
        }
    }

    // Format balance update message
    formatBalanceUpdateMessage(amount, type) {
        if (type === 'timeout') {
            return `⏰ <b>Время ожидания истекло</b>

Ваша транзакция не была подтверждена в течение 10 минут.

💡 <b>Что делать:</b>
1. Проверьте, что оплата была отправлена
2. Создайте новый запрос на пополнение
3. Если проблема persists, обратитесь в поддержку

Спасибо за понимание! 🙏`;
        }

        const sign = type === 'deposit' ? '+' : '-';
        const action = type === 'deposit' ? 'пополнен' : 'списан';

        return `💰 <b>Баланс ${action}</b>

📈 Сумма: <b>${sign}$${amount.toFixed(2)}</b>

⏰ Время: ${new Date().toLocaleString('ru-RU')}

Спасибо за использование нашего сервиса! 🎉`;
    }
}

// Create singleton instance
const balanceService = new BalanceService();

// Cleanup expired requests every 5 minutes
setInterval(() => {
    balanceService.cleanupExpiredRequests();
}, 5 * 60 * 1000);

module.exports = balanceService;