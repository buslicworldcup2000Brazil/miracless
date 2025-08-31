// Vercel Serverless Function: /api/analytics
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();

let db;
try {
    const { db: firestoreDb } = require('../src/firebase').initializeFirebase();
    db = firestoreDb;
    console.log("Firebase Firestore (Analytics): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase:", error);
}

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
router.get('/overview', isAdmin, async (req, res) => {
    try {
        const { adminId } = req.body;

        // Получаем статистику пользователей
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;
        const activeUsers = usersSnapshot.docs.filter(doc => {
            const user = doc.data();
            const lastSeen = user.last_seen?.toDate();
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return lastSeen && lastSeen > weekAgo;
        }).length;

        // Получаем статистику лотерей
        const lotteriesSnapshot = await db.collection('lotteries').get();
        const totalLotteries = lotteriesSnapshot.size;
        const activeLotteries = lotteriesSnapshot.docs.filter(doc => {
            const lottery = doc.data();
            return lottery.status === 'active';
        }).length;

        // Получаем статистику транзакций
        const transactionsSnapshot = await db.collection('transactions').get();
        const totalTransactions = transactionsSnapshot.size;
        const totalRevenue = transactionsSnapshot.docs.reduce((sum, doc) => {
            const tx = doc.data();
            return sum + (tx.amount || 0);
        }, 0);

        // Получаем статистику за последние 30 дней
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentTransactions = transactionsSnapshot.docs.filter(doc => {
            const tx = doc.data();
            return tx.timestamp?.toDate() > thirtyDaysAgo;
        });
        const monthlyRevenue = recentTransactions.reduce((sum, doc) => {
            const tx = doc.data();
            return sum + (tx.amount || 0);
        }, 0);

        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    active: activeUsers
                },
                lotteries: {
                    total: totalLotteries,
                    active: activeLotteries
                },
                transactions: {
                    total: totalTransactions,
                    totalRevenue: totalRevenue,
                    monthlyRevenue: monthlyRevenue
                }
            }
        });

    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get analytics overview'
        });
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