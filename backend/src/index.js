const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const { logAdminAction } = require('./adminLogger');
const { authenticateUser, getUserBalance } = require('./auth');
const lotteryScheduler = require('./lotteryScheduler');
const notificationService = require('./notificationService');

// --- Инициализация ---
console.log('🚀 [SERVER] НАЧАЛО ЗАПУСКА СЕРВЕРА');
console.log('📊 [SERVER] Node.js версия:', process.version);
console.log('🌍 [SERVER] Окружение:', process.env.NODE_ENV || 'development');

const app = express();
const port = process.env.PORT || 3000;

console.log('⚙️ [SERVER] Настройка Express...');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

console.log('✅ [SERVER] Express настроен');

// --- КОНФИГУРАЦИЯ ---
const ADMIN_IDS = ["5206288199", "1329896342"];
const MAIN_ADMIN = "5206288199"; // Главный админ с полными правами
const RESTRICTED_ADMIN = "1329896342"; // Ограниченный админ
const COINGECKO_API_KEY = "CG-7ZzjP5H5QkdkC78DXGU9mCpY";

// --- Database Инициализация ---
console.log('🗄️ [SERVER] Инициализация PostgreSQL через Prisma...');

// Используем только Prisma с PostgreSQL
try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
        log: ['error', 'warn'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    });

    console.log('🔗 [SERVER] DATABASE_URL:', process.env.DATABASE_URL ? 'настроена' : 'не настроена');

    // Тестируем подключение
    prisma.$connect()
        .then(async () => {
            console.log('✅ [SERVER] PostgreSQL подключен успешно через Prisma');

            // Тестируем простой запрос
            try {
                const userCount = await prisma.user.count();
                console.log(`📊 [SERVER] Тестовый запрос успешен. Пользователей в БД: ${userCount}`);
            } catch (testError) {
                console.warn('⚠️ [SERVER] Тестовый запрос не удался, но подключение работает:', testError.message);
            }
        })
        .catch((error) => {
            console.error('❌ [SERVER] Ошибка подключения к PostgreSQL:', error);
            console.error('🔍 [SERVER] Детали ошибки:', {
                message: error.message,
                code: error.code,
                meta: error.meta
            });
            process.exit(1);
        });

    global.prisma = prisma;
} catch (error) {
    console.error('❌ [SERVER] Ошибка инициализации Prisma:', error);
    console.error('🔍 [SERVER] Детали ошибки:', {
        message: error.message,
        stack: error.stack
    });
    process.exit(1);
}

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
console.log('🛣️ [SERVER] Настройка API маршрутов...');

// Аутентификация пользователя
app.post('/api/auth', async (req, res) => {
    console.log('🔐 [API] Получен запрос POST /api/auth');
    console.log('📥 [API] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📦 [API] Body:', JSON.stringify(req.body, null, 2));

    try {
        const result = await authenticateUser(req, res);
        console.log('✅ [API] Запрос /api/auth обработан успешно');
    } catch (error) {
        console.error('❌ [API] Ошибка в /api/auth:', error);
        console.error('🔍 [API] Детали ошибки:', {
            message: error.message,
            stack: error.stack,
            status: res.statusCode
        });
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
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
console.log('🚀 [SERVER] Запуск сервера...');
console.log('🔌 [SERVER] Порт:', port);
console.log('🌐 [SERVER] Прослушивание подключений...');

app.listen(port, () => {
    console.log(`✅ [SERVER] СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${port}`);
    console.log(`📊 [SERVER] Admin IDs: ${ADMIN_IDS.join(', ')}`);
    console.log(`👑 [SERVER] Main Admin: ${MAIN_ADMIN}`);
    console.log(`🔒 [SERVER] Restricted Admin: ${RESTRICTED_ADMIN}`);
    console.log(`🔗 [SERVER] API endpoints:`);
    console.log(`   POST /api/auth - Аутентификация`);
    console.log(`   GET /api/balance/:userId - Баланс пользователя`);
    console.log(`   GET /api/exchange-rates - Курсы валют`);
    console.log('🎉 [SERVER] ГОТОВ К РАБОТЕ!');
});

// Graceful shutdown
console.log('🛡️ [SERVER] Настройка graceful shutdown...');

process.on('SIGINT', async () => {
    console.log('🛑 [SERVER] Получен сигнал SIGINT (Ctrl+C)');
    console.log('🔄 [SERVER] Начинаем graceful shutdown...');
    try {
        if (global.prisma) {
            await global.prisma.$disconnect();
            console.log('✅ [SERVER] PostgreSQL отключена');
        }
        console.log('👋 [SERVER] Сервер остановлен');
        process.exit(0);
    } catch (error) {
        console.error('❌ [SERVER] Ошибка при отключении БД:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('🛑 [SERVER] Получен сигнал SIGTERM');
    console.log('🔄 [SERVER] Начинаем graceful shutdown...');
    try {
        if (global.prisma) {
            await global.prisma.$disconnect();
            console.log('✅ [SERVER] PostgreSQL отключена');
        }
        console.log('👋 [SERVER] Сервер остановлен');
        process.exit(0);
    } catch (error) {
        console.error('❌ [SERVER] Ошибка при отключении БД:', error);
        process.exit(1);
    }
});

console.log('✅ [SERVER] Graceful shutdown настроен');

module.exports = app;
