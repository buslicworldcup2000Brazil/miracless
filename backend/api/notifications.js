// Vercel Serverless Function: /api/notifications
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const https = require('https');

let db;
try {
    const admin = require("firebase-admin");
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    console.log("Firebase Firestore (Notifications): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase:", error);
}

app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8496155312:AAFhh5xiXJJYQxy0GjB3u7Bg79rWYYSJHA0";

// Отправка уведомления через Telegram Bot API
const sendTelegramNotification = async (chatId, message, options = {}) => {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: options.parseMode || 'HTML',
            disable_web_page_preview: options.disablePreview || true,
            reply_markup: options.keyboard ? {
                inline_keyboard: options.keyboard
            } : undefined
        });

        const requestOptions = {
            hostname: 'api.telegram.org',
            path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.ok) {
                        resolve(response.result);
                    } else {
                        reject(new Error(`Telegram API error: ${response.description}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => reject(new Error('Timeout')));
        req.write(postData);
        req.end();
    });
};

// Получить Telegram Chat ID пользователя
const getUserChatId = async (userId) => {
    try {
        const userRef = db.collection('users').doc(String(userId));
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const user = userDoc.data();
            return user.telegram_id;
        }
        return null;
    } catch (error) {
        console.error('Error getting user chat ID:', error);
        return null;
    }
};

// Отправить уведомление о выигрыше
router.post('/lottery-win', async (req, res) => {
    try {
        const { userId, lotteryTitle, prizeAmount, lotteryId } = req.body;

        if (!userId || !lotteryTitle || !prizeAmount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const chatId = await getUserChatId(userId);
        if (!chatId) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const message = `🎉 <b>Поздравляем!</b>\n\n` +
                       `Вы выиграли в лотерее "${lotteryTitle}"!\n` +
                       `💰 Приз: $${prizeAmount}\n\n` +
                       `Приз уже зачислен на ваш баланс.`;

        const keyboard = [[{
            text: '🎰 Играть еще',
            url: `https://t.me/your_bot_username?start=lottery_${lotteryId}`
        }]];

        await sendTelegramNotification(chatId, message, { keyboard });

        // Логируем уведомление
        await db.collection('notifications').add({
            userId,
            type: 'lottery_win',
            message,
            timestamp: new Date(),
            status: 'sent'
        });

        res.json({ success: true, message: 'Notification sent' });

    } catch (error) {
        console.error('Lottery win notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send notification'
        });
    }
});

// Отправить уведомление о начале лотереи
router.post('/lottery-start', async (req, res) => {
    try {
        const { lotteryTitle, participants, lotteryId } = req.body;

        if (!lotteryTitle || !participants || !Array.isArray(participants)) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const message = `🎰 <b>Новая лотерея запущена!</b>\n\n` +
                       `"${lotteryTitle}"\n\n` +
                       `Участвуйте прямо сейчас!`;

        const keyboard = [[{
            text: '🎯 Участвовать',
            url: `https://t.me/your_bot_username?start=lottery_${lotteryId}`
        }]];

        const results = [];

        for (const userId of participants) {
            try {
                const chatId = await getUserChatId(userId);
                if (chatId) {
                    await sendTelegramNotification(chatId, message, { keyboard });
                    results.push({ userId, status: 'sent' });
                } else {
                    results.push({ userId, status: 'user_not_found' });
                }
            } catch (error) {
                console.error(`Failed to notify user ${userId}:`, error);
                results.push({ userId, status: 'error' });
            }
        }

        // Логируем массовую рассылку
        await db.collection('notifications').add({
            type: 'lottery_start',
            lotteryId,
            recipients: results,
            timestamp: new Date(),
            message
        });

        res.json({
            success: true,
            message: 'Notifications sent',
            results
        });

    } catch (error) {
        console.error('Lottery start notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send notifications'
        });
    }
});

// Отправить уведомление о завершении лотереи
router.post('/lottery-end', async (req, res) => {
    try {
        const { lotteryTitle, winnerId, participants, lotteryId } = req.body;

        if (!lotteryTitle || !participants || !Array.isArray(participants)) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const winnerChatId = winnerId ? await getUserChatId(winnerId) : null;
        const winnerMessage = winnerChatId ?
            `🏆 <b>Лотерея завершена!</b>\n\n` +
            `"${lotteryTitle}"\n\n` +
            `🎉 Вы стали победителем!\n` +
            `Проверьте свой баланс.` :
            null;

        const participantMessage = `🏁 <b>Лотерея завершена!</b>\n\n` +
                                  `"${lotteryTitle}"\n\n` +
                                  `Результаты доступны в приложении.`;

        const keyboard = [[{
            text: '📱 Открыть приложение',
            url: `https://t.me/your_bot_username?start=app`
        }]];

        const results = [];

        // Отправляем уведомления всем участникам
        for (const userId of participants) {
            try {
                const chatId = await getUserChatId(userId);
                if (chatId) {
                    const isWinner = String(userId) === String(winnerId);
                    const message = isWinner && winnerMessage ? winnerMessage : participantMessage;

                    await sendTelegramNotification(chatId, message, { keyboard });
                    results.push({ userId, status: 'sent', isWinner });
                } else {
                    results.push({ userId, status: 'user_not_found' });
                }
            } catch (error) {
                console.error(`Failed to notify user ${userId}:`, error);
                results.push({ userId, status: 'error' });
            }
        }

        // Логируем массовую рассылку
        await db.collection('notifications').add({
            type: 'lottery_end',
            lotteryId,
            winnerId,
            recipients: results,
            timestamp: new Date(),
            winnerMessage,
            participantMessage
        });

        res.json({
            success: true,
            message: 'Notifications sent',
            results
        });

    } catch (error) {
        console.error('Lottery end notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send notifications'
        });
    }
});

// Отправить уведомление о пополнении баланса
router.post('/balance-update', async (req, res) => {
    try {
        const { userId, amount, currency } = req.body;

        if (!userId || !amount || !currency) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const chatId = await getUserChatId(userId);
        if (!chatId) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const message = `💰 <b>Баланс пополнен!</b>\n\n` +
                       `+$${amount} ${currency}\n` +
                       `Средства зачислены на ваш счет.`;

        await sendTelegramNotification(chatId, message);

        // Логируем уведомление
        await db.collection('notifications').add({
            userId,
            type: 'balance_update',
            amount,
            currency,
            message,
            timestamp: new Date(),
            status: 'sent'
        });

        res.json({ success: true, message: 'Notification sent' });

    } catch (error) {
        console.error('Balance update notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send notification'
        });
    }
});

// Получить историю уведомлений пользователя
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50 } = req.query;

        const notificationsRef = db.collection('notifications');
        const snapshot = await notificationsRef
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(parseInt(limit))
            .get();

        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            data: notifications
        });

    } catch (error) {
        console.error('Get notifications history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notifications history'
        });
    }
});

app.use('/api/notifications', router);
module.exports = app;
module.exports.handler = serverless(app);