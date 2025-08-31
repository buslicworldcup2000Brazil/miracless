const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const { logAdminAction } = require('./adminLogger');
const { authenticateUser, getUserBalance } = require('./auth');
const lotteryScheduler = require('./lotteryScheduler');
const notificationService = require('./notificationService');

// --- Инициализация ---
const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- КОНФИГУРАЦИЯ ---
const ADMIN_IDS = ["5206288199", "1329896342"];
const MAIN_ADMIN = "5206288199"; // Главный админ с полными правами
const RESTRICTED_ADMIN = "1329896342"; // Ограниченный админ
const COINGECKO_API_KEY = "CG-7ZzjP5H5QkdkC78DXGU9mCpY";

// --- Database Инициализация ---
// Используем Prisma с SQLite
const prisma = require('./prisma');

// --- Клиент CoinGecko API ---
const getExchangeRate = (currencyIds) => {
    return new Promise((resolve, reject) => {
        const ids = currencyIds.join(',');
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&api_key=${COINGECKO_API_KEY}`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const rates = JSON.parse(data);
                    resolve(rates);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
};

// --- API Routes ---

// Аутентификация пользователя
app.post('/api/auth', async (req, res) => {
    try {
        const result = await authenticateUser(req, res);
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Получение баланса пользователя
app.get('/api/balance/:userId', async (req, res) => {
    try {
        const result = await getUserBalance(req, res);
    } catch (error) {
        console.error('Balance error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Получение курса валют
app.get('/api/exchange-rates', async (req, res) => {
    try {
        const rates = await getExchangeRate(['bitcoin', 'ethereum', 'tether']);
        res.json({ success: true, rates });
    } catch (error) {
        console.error('Exchange rates error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch exchange rates' });
    }
});

// --- Запуск сервера ---
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📊 Admin IDs: ${ADMIN_IDS.join(', ')}`);
    console.log(`👑 Main Admin: ${MAIN_ADMIN}`);
    console.log(`🔒 Restricted Admin: ${RESTRICTED_ADMIN}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

module.exports = app;
