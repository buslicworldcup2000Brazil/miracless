// Vercel Serverless Function: /api/transactions
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const transactionMonitor = require('../src/transactionMonitor');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

console.log('💰 [API-TRANSACTIONS] Инициализация API транзакций с PostgreSQL');
console.log('🔗 [API-TRANSACTIONS] DATABASE_URL:', process.env.DATABASE_URL ? 'настроена' : 'не настроена');

app.use(express.json());

// Submit transaction for monitoring
router.post('/monitor', async (req, res) => {
    console.log('💰 [MONITOR-TX] НАЧАЛО МОНИТОРИНГА ТРАНЗАКЦИИ');
    try {
        const { txHash, currency, userId, expectedAmount, usdAmount } = req.body;

        console.log('🔗 [MONITOR-TX] TX Hash:', txHash);
        console.log('💱 [MONITOR-TX] Currency:', currency);
        console.log('👤 [MONITOR-TX] User ID:', userId);
        console.log('💵 [MONITOR-TX] Expected Amount:', expectedAmount);
        console.log('💵 [MONITOR-TX] USD Amount:', usdAmount);

        // Валидация входных данных
        if (!txHash || !currency || !userId || !expectedAmount || !usdAmount) {
            console.error('❌ [MONITOR-TX] НЕДОСТАЮТ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ');
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: txHash, currency, userId, expectedAmount, usdAmount'
            });
        }

        console.log('📊 [MONITOR-TX] Добавление транзакции в мониторинг...');
        // Add transaction to monitoring
        transactionMonitor.addTransaction({
            txHash,
            currency,
            userId,
            expectedAmount,
            usdAmount
        });
        console.log('✅ [MONITOR-TX] Транзакция добавлена в мониторинг');

        console.log('💾 [MONITOR-TX] Сохранение в PostgreSQL...');
        // Сохранить в PostgreSQL
        const transaction = await prisma.transaction.create({
            data: {
                tx_hash: txHash,
                currency: currency,
                user_id: String(userId),
                expected_amount: parseFloat(expectedAmount),
                usd_amount: parseFloat(usdAmount),
                status: 'monitoring',
                submitted_at: new Date()
            }
        });
        console.log('✅ [MONITOR-TX] Транзакция сохранена в БД:', transaction.id);

        console.log('📤 [MONITOR-TX] Отправка ответа клиенту...');
        res.json({
            success: true,
            message: 'Transaction submitted for monitoring',
            txHash,
            transactionId: transaction.id
        });
        console.log('✅ [MONITOR-TX] Ответ отправлен успешно');

    } catch (error) {
        console.error('💥 [MONITOR-TX] Ошибка мониторинга транзакции:', error);
        console.error('🔍 [MONITOR-TX] Детали ошибки:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
        console.log('❌ [MONITOR-TX] Отправлен ответ об ошибке');
    } finally {
        // Всегда отключаемся от БД
        try {
            await prisma.$disconnect();
        } catch (disconnectError) {
            console.warn('⚠️ [MONITOR-TX] Ошибка отключения от БД:', disconnectError.message);
        }
    }
});

// Get transaction monitoring stats
router.get('/stats', async (req, res) => {
    console.log('📊 [TX-STATS] Запрос статистики транзакций');
    try {
        console.log('📈 [TX-STATS] Получение статистики от монитора...');
        const stats = transactionMonitor.getStats();
        console.log('✅ [TX-STATS] Статистика получена:', JSON.stringify(stats, null, 2));

        console.log('📤 [TX-STATS] Отправка ответа клиенту...');
        res.json({
            success: true,
            data: stats
        });
        console.log('✅ [TX-STATS] Ответ отправлен успешно');

    } catch (error) {
        console.error('💥 [TX-STATS] Ошибка получения статистики:', error);
        console.error('🔍 [TX-STATS] Детали ошибки:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
        console.log('❌ [TX-STATS] Отправлен ответ об ошибке');
    }
});

// Get user's transactions
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const transactionsSnapshot = await db
            .collection('transactions')
            .where('userId', '==', userId)
            .orderBy('processedAt', 'desc')
            .limit(20)
            .get();

        const transactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error("Error getting user transactions:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Get all transactions (admin only)
router.get('/', async (req, res) => {
    try {
        const { adminId } = req.query;

        // Admin access control
        const MAIN_ADMIN_ID = "5206288199";
        const RESTRICTED_ADMIN_ID = "1329896342";
        const adminIdStr = String(adminId);

        if (adminIdStr !== MAIN_ADMIN_ID && adminIdStr !== RESTRICTED_ADMIN_ID) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const transactionsSnapshot = await db
            .collection('transactions')
            .orderBy('processedAt', 'desc')
            .limit(100)
            .get();

        const transactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error("Error getting transactions:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

app.use('/api/transactions', router);
module.exports = app;
module.exports.handler = serverless(app);