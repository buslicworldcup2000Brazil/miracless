// Vercel Serverless Function: /api/analytics
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

console.log('📊 [API-ANALYTICS] Инициализация API аналитики с PostgreSQL');
console.log('🔗 [API-ANALYTICS] DATABASE_URL:', process.env.DATABASE_URL ? 'настроена' : 'не настроена');

app.use(express.json());

// Конфигурация администраторов
const MAIN_ADMIN_ID = "5206288199";
const RESTRICTED_ADMIN_ID = "1329896342";

// Middleware для проверки прав администратора
const isAdmin = (req, res, next) => {
    const { adminId } = req.body;
    const adminIdStr = String(adminId);
    if (adminIdStr === MAIN_ADMIN_ID || adminIdStr === RESTRICTED_ADMIN_ID) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Permission denied' });
    }
};

// Получить общую статистику
router.get('/overview', async (req, res) => {
    console.log('📊 [ANALYTICS-OVERVIEW] НАЧАЛО ЗАПРОСА ОБЩЕЙ СТАТИСТИКИ');
    try {
        const { adminId } = req.body;
        console.log('👑 [ANALYTICS-OVERVIEW] Admin ID:', adminId);

        // Проверка прав администратора
        const adminIdStr = String(adminId);
        if (adminIdStr !== "5206288199" && adminIdStr !== "1329896342") {
            console.error('❌ [ANALYTICS-OVERVIEW] ДОСТУП ЗАПРЕЩЕН');
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }

        console.log('👥 [ANALYTICS-OVERVIEW] Получение статистики пользователей...');
        // Получаем статистику пользователей
        const totalUsers = await prisma.user.count();
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const activeUsers = await prisma.user.count({
            where: { last_seen: { gt: weekAgo } }
        });
        console.log('✅ [ANALYTICS-OVERVIEW] Пользователи:', { total: totalUsers, active: activeUsers });

        console.log('🎰 [ANALYTICS-OVERVIEW] Получение статистики лотерей...');
        // Получаем статистику лотерей
        const totalLotteries = await prisma.lottery.count();
        const activeLotteries = await prisma.lottery.count({
            where: { status: 'active' }
        });
        console.log('✅ [ANALYTICS-OVERVIEW] Лотереи:', { total: totalLotteries, active: activeLotteries });

        console.log('💰 [ANALYTICS-OVERVIEW] Получение статистики транзакций...');
        // Получаем статистику транзакций
        const totalTransactions = await prisma.transaction.count();
        const transactions = await prisma.transaction.findMany();
        const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.usd_amount || 0), 0);

        // Получаем статистику за последние 30 дней
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentTransactions = await prisma.transaction.findMany({
            where: { submitted_at: { gt: thirtyDaysAgo } }
        });
        const monthlyRevenue = recentTransactions.reduce((sum, tx) => sum + (tx.usd_amount || 0), 0);

        console.log('✅ [ANALYTICS-OVERVIEW] Транзакции:', {
            total: totalTransactions,
            totalRevenue: totalRevenue,
            monthlyRevenue: monthlyRevenue
        });

        const result = {
            users: { total: totalUsers, active: activeUsers },
            lotteries: { total: totalLotteries, active: activeLotteries },
            transactions: { total: totalTransactions, totalRevenue, monthlyRevenue }
        };

        console.log('📤 [ANALYTICS-OVERVIEW] Отправка ответа клиенту...');
        res.json({ success: true, data: result });
        console.log('✅ [ANALYTICS-OVERVIEW] Ответ отправлен успешно');

    } catch (error) {
        console.error('💥 [ANALYTICS-OVERVIEW] Ошибка получения статистики:', error);
        console.error('🔍 [ANALYTICS-OVERVIEW] Детали ошибки:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Failed to get analytics overview'
        });
        console.log('❌ [ANALYTICS-OVERVIEW] Отправлен ответ об ошибке');
    } finally {
        try {
            await prisma.$disconnect();
        } catch (disconnectError) {
            console.warn('⚠️ [ANALYTICS-OVERVIEW] Ошибка отключения от БД:', disconnectError.message);
        }
    }
});

// Получить статистику доходов по дням
router.get('/revenue/daily', isAdmin, async (req, res) => {
    try {
        const { adminId, days = 30 } = req.body;
        const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const transactionsSnapshot = await db.collection('transactions')
            .where('timestamp', '>', daysAgo)
            .orderBy('timestamp', 'asc')
            .get();

        const dailyRevenue = {};
        transactionsSnapshot.docs.forEach(doc => {
            const tx = doc.data();
            const date = tx.timestamp?.toDate();
            if (date) {
                const dateKey = date.toISOString().split('T')[0];
                dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (tx.amount || 0);
            }
        });

        // Заполняем пропущенные дни
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dateKey = date.toISOString().split('T')[0];
            result.push({
                date: dateKey,
                revenue: dailyRevenue[dateKey] || 0
            });
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Daily revenue analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get daily revenue analytics'
        });
    }
});

// Получить статистику пользователей
router.get('/users/stats', isAdmin, async (req, res) => {
    try {
        const { adminId } = req.body;

        const usersSnapshot = await db.collection('users').get();

        const userStats = {
            total: usersSnapshot.size,
            withBalance: 0,
            totalBalance: 0,
            newUsersToday: 0,
            newUsersWeek: 0,
            newUsersMonth: 0
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        usersSnapshot.docs.forEach(doc => {
            const user = doc.data();

            if (user.balance > 0) {
                userStats.withBalance++;
                userStats.totalBalance += user.balance;
            }

            const createdAt = user.created_at?.toDate();
            if (createdAt) {
                if (createdAt >= today) {
                    userStats.newUsersToday++;
                }
                if (createdAt >= weekAgo) {
                    userStats.newUsersWeek++;
                }
                if (createdAt >= monthAgo) {
                    userStats.newUsersMonth++;
                }
            }
        });

        res.json({
            success: true,
            data: userStats
        });

    } catch (error) {
        console.error('User stats analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user stats'
        });
    }
});

// Получить статистику лотерей
router.get('/lotteries/stats', isAdmin, async (req, res) => {
    try {
        const { adminId } = req.body;

        const lotteriesSnapshot = await db.collection('lotteries').get();

        const lotteryStats = {
            total: lotteriesSnapshot.size,
            active: 0,
            completed: 0,
            totalParticipants: 0,
            totalPrizePool: 0,
            averageParticipants: 0
        };

        lotteriesSnapshot.docs.forEach(doc => {
            const lottery = doc.data();

            if (lottery.status === 'active') {
                lotteryStats.active++;
            } else if (lottery.status === 'completed') {
                lotteryStats.completed++;
            }

            lotteryStats.totalParticipants += lottery.participants?.length || 0;
            lotteryStats.totalPrizePool += lottery.prizePool || 0;
        });

        if (lotteryStats.total > 0) {
            lotteryStats.averageParticipants = Math.round(lotteryStats.totalParticipants / lotteryStats.total);
        }

        res.json({
            success: true,
            data: lotteryStats
        });

    } catch (error) {
        console.error('Lottery stats analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get lottery stats'
        });
    }
});

// Получить топ пользователей по балансу
router.get('/users/top-balance', isAdmin, async (req, res) => {
    try {
        const { adminId, limit = 10 } = req.body;

        const usersSnapshot = await db.collection('users')
            .orderBy('balance', 'desc')
            .limit(parseInt(limit))
            .get();

        const topUsers = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            username: doc.data().username,
            balance: doc.data().balance,
            created_at: doc.data().created_at
        }));

        res.json({
            success: true,
            data: topUsers
        });

    } catch (error) {
        console.error('Top balance users analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get top balance users'
        });
    }
});

// Получить статистику по источникам платежей
router.get('/payments/sources', isAdmin, async (req, res) => {
    try {
        const { adminId } = req.body;

        const transactionsSnapshot = await db.collection('transactions').get();

        const paymentSources = {};
        transactionsSnapshot.docs.forEach(doc => {
            const tx = doc.data();
            const source = tx.network || 'unknown';
            paymentSources[source] = (paymentSources[source] || 0) + (tx.amount || 0);
        });

        const result = Object.entries(paymentSources).map(([source, amount]) => ({
            source,
            amount
        })).sort((a, b) => b.amount - a.amount);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Payment sources analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payment sources analytics'
        });
    }
});

// Получить статистику уведомлений
router.get('/notifications/stats', isAdmin, async (req, res) => {
    try {
        const { adminId } = req.body;

        const notificationsSnapshot = await db.collection('notifications').get();

        const notificationStats = {
            total: notificationsSnapshot.size,
            byType: {},
            sent: 0,
            failed: 0
        };

        notificationsSnapshot.docs.forEach(doc => {
            const notification = doc.data();
            const type = notification.type || 'unknown';

            notificationStats.byType[type] = (notificationStats.byType[type] || 0) + 1;

            if (notification.status === 'sent') {
                notificationStats.sent++;
            } else {
                notificationStats.failed++;
            }
        });

        res.json({
            success: true,
            data: notificationStats
        });

    } catch (error) {
        console.error('Notification stats analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notification stats'
        });
    }
});

app.use('/api/analytics', router);
module.exports = app;
module.exports.handler = serverless(app);