// Vercel Serverless Function: /api/balance
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const balanceService = require('../src/balance');
const { getUserBalance } = require('../src/auth');

console.log('💰 [API-BALANCE] Инициализация API баланса с новой системой пополнения');

app.use(express.json());

// Middleware для логирования всех запросов
router.use((req, res, next) => {
    console.log('💰 [API-BALANCE] Новый запрос:', req.method, req.path);
    console.log('🌐 [API-BALANCE] IP:', req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    req.startTime = Date.now();
    next();
});

// Получить баланс пользователя
router.get('/:userId', async (req, res) => {
    console.log('💰 [GET-BALANCE] Запрос баланса пользователя:', req.params.userId);

    try {
        const balance = await balanceService.getUserBalance(req.params.userId);
        const duration = Date.now() - req.startTime;

        console.log('✅ [GET-BALANCE] Баланс получен:', balance);
        console.log('⏱️ [GET-BALANCE] Время выполнения:', `${duration}ms`);

        res.json({
            success: true,
            balance: balance
        });

    } catch (error) {
        const duration = Date.now() - req.startTime;
        console.error('💥 [GET-BALANCE] Ошибка получения баланса:', error.message);
        console.error('⏱️ [GET-BALANCE] Время до ошибки:', `${duration}ms`);

        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        try {
            await prisma.$disconnect();
        } catch (disconnectError) {
            console.warn('⚠️ [GET-BALANCE] Ошибка отключения от БД:', disconnectError.message);
        }
    }
});

// Создать запрос на пополнение баланса
router.post('/deposit', async (req, res) => {
    console.log('💰 [CREATE-DEPOSIT] Создание запроса на пополнение');

    try {
        const { userId, currency, amount } = req.body;

        console.log('👤 [CREATE-DEPOSIT] User ID:', userId);
        console.log('💱 [CREATE-DEPOSIT] Currency:', currency);
        console.log('💵 [CREATE-DEPOSIT] Amount:', amount);

        if (!userId || !currency || !amount) {
            console.error('❌ [CREATE-DEPOSIT] Отсутствуют обязательные поля');
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userId, currency, amount'
            });
        }

        const depositRequest = await balanceService.createDepositRequest(userId, currency, parseFloat(amount));
        const duration = Date.now() - req.startTime;

        console.log('✅ [CREATE-DEPOSIT] Запрос создан успешно');
        console.log('⏱️ [CREATE-DEPOSIT] Время выполнения:', `${duration}ms`);

        res.json({
            success: true,
            data: depositRequest
        });

    } catch (error) {
        const duration = Date.now() - req.startTime;
        console.error('💥 [CREATE-DEPOSIT] Ошибка создания запроса:', error.message);
        console.error('⏱️ [CREATE-DEPOSIT] Время до ошибки:', `${duration}ms`);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Подтвердить платеж
router.post('/confirm-payment', async (req, res) => {
    console.log('💰 [CONFIRM-PAYMENT] Подтверждение платежа');

    try {
        const { userId, currency, txHash } = req.body;

        console.log('👤 [CONFIRM-PAYMENT] User ID:', userId);
        console.log('💱 [CONFIRM-PAYMENT] Currency:', currency);
        console.log('🔗 [CONFIRM-PAYMENT] TX Hash:', txHash);

        if (!userId || !currency || !txHash) {
            console.error('❌ [CONFIRM-PAYMENT] Отсутствуют обязательные поля');
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userId, currency, txHash'
            });
        }

        const result = await balanceService.processPaymentConfirmation(userId, currency, txHash);
        const duration = Date.now() - req.startTime;

        if (result.success) {
            console.log('✅ [CONFIRM-PAYMENT] Платеж подтвержден успешно');
            console.log('💵 [CONFIRM-PAYMENT] Сумма:', result.usdAmount, 'USD');
            console.log('⏱️ [CONFIRM-PAYMENT] Время выполнения:', `${duration}ms`);

            res.json({
                success: true,
                data: result
            });
        } else {
            console.warn('⚠️ [CONFIRM-PAYMENT] Платеж не подтвержден:', result.message);
            console.log('⏱️ [CONFIRM-PAYMENT] Время выполнения:', `${duration}ms`);

            res.json({
                success: false,
                message: result.message,
                data: result
            });
        }

    } catch (error) {
        const duration = Date.now() - req.startTime;
        console.error('💥 [CONFIRM-PAYMENT] Ошибка подтверждения платежа:', error.message);
        console.error('⏱️ [CONFIRM-PAYMENT] Время до ошибки:', `${duration}ms`);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Получить историю пополнений
router.get('/deposit-history/:userId', async (req, res) => {
    console.log('💰 [DEPOSIT-HISTORY] Запрос истории пополнений');

    try {
        const { userId } = req.params;
        const { limit = 20 } = req.query;

        console.log('👤 [DEPOSIT-HISTORY] User ID:', userId);
        console.log('📊 [DEPOSIT-HISTORY] Limit:', limit);

        const history = await balanceService.getDepositHistory(userId, parseInt(limit));
        const duration = Date.now() - req.startTime;

        console.log('✅ [DEPOSIT-HISTORY] История получена:', history.length, 'записей');
        console.log('⏱️ [DEPOSIT-HISTORY] Время выполнения:', `${duration}ms`);

        res.json({
            success: true,
            data: history
        });

    } catch (error) {
        const duration = Date.now() - req.startTime;
        console.error('💥 [DEPOSIT-HISTORY] Ошибка получения истории:', error.message);
        console.error('⏱️ [DEPOSIT-HISTORY] Время до ошибки:', `${duration}ms`);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Получить адреса для пополнения
router.get('/addresses/:userId', async (req, res) => {
    console.log('💰 [PAYMENT-ADDRESSES] Запрос адресов для пополнения');

    try {
        const { userId } = req.params;

        console.log('👤 [PAYMENT-ADDRESSES] User ID:', userId);

        const addresses = balanceService.getAllPaymentAddresses();
        const duration = Date.now() - req.startTime;

        console.log('✅ [PAYMENT-ADDRESSES] Адреса получены');
        console.log('⏱️ [PAYMENT-ADDRESSES] Время выполнения:', `${duration}ms`);

        res.json({
            success: true,
            addresses: addresses
        });

    } catch (error) {
        const duration = Date.now() - req.startTime;
        console.error('💥 [PAYMENT-ADDRESSES] Ошибка получения адресов:', error.message);
        console.error('⏱️ [PAYMENT-ADDRESSES] Время до ошибки:', `${duration}ms`);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Получить информацию о валюте
router.get('/currency/:currency', async (req, res) => {
    console.log('💰 [CURRENCY-INFO] Запрос информации о валюте');

    try {
        const { currency } = req.params;

        console.log('💱 [CURRENCY-INFO] Currency:', currency);

        const currencyInfo = balanceService.getCurrencyInfo(currency);
        const duration = Date.now() - req.startTime;

        console.log('✅ [CURRENCY-INFO] Информация получена');
        console.log('⏱️ [CURRENCY-INFO] Время выполнения:', `${duration}ms`);

        res.json({
            success: true,
            data: currencyInfo
        });

    } catch (error) {
        const duration = Date.now() - req.startTime;
        console.error('💥 [CURRENCY-INFO] Ошибка получения информации:', error.message);
        console.error('⏱️ [CURRENCY-INFO] Время до ошибки:', `${duration}ms`);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.use('/api/balance', router);
module.exports = app;
module.exports.handler = serverless(app);
