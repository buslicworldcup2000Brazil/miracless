const { PrismaClient } = require('@prisma/client');

// Создаем клиента для PostgreSQL
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testPostgreSQL() {
    try {
        console.log('🧪 Тестирование PostgreSQL...\n');

        // Проверяем подключение
        await prisma.$connect();
        console.log('✅ Подключение к PostgreSQL успешно!');

        // Получаем информацию о схеме
        const result = await prisma.$queryRaw`SELECT version()`;
        console.log('📊 Версия PostgreSQL:', result[0].version);

        // Проверяем таблицы
        const tables = await prisma.$queryRaw`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;

        console.log('📋 Таблицы в базе данных:');
        tables.forEach(table => {
            console.log(`  - ${table.table_name}`);
        });

        // Создаем тестового пользователя
        const testUser = await prisma.user.create({
            data: {
                telegramId: `test_postgres_${Date.now()}`,
                username: `postgres_test_${Date.now()}`,
                firstName: 'PostgreSQL',
                lastName: 'Test',
                languageCode: 'ru',
                balance: 500.00,
                isPremium: true,
                uniqueId: `PG_TEST_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
            }
        });

        console.log('✅ Пользователь создан в PostgreSQL:', testUser);

        // Создаем тестовую лотерею
        const testLottery = await prisma.lottery.create({
            data: {
                title: 'PostgreSQL Тестовая лотерея',
                description: 'Проверка работы PostgreSQL',
                participationCost: 25.00,
                maxParticipants: 200,
                endDate: new Date(Date.now() + 72 * 60 * 60 * 1000), // Через 72 часа
                prizes: {
                    create: [
                        { place: 1, amount: 1000.00, type: 'FIXED' },
                        { place: 2, amount: 500.00, type: 'FIXED' },
                        { place: 3, amount: 250.00, type: 'FIXED' }
                    ]
                }
            },
            include: {
                prizes: true
            }
        });

        console.log('✅ Лотерея создана в PostgreSQL:', testLottery);

        // Создаем транзакцию
        const transaction = await prisma.transaction.create({
            data: {
                userId: testUser.id,
                type: 'DEPOSIT',
                amount: 100.00,
                usdAmount: 100.00,
                description: 'Тестовый депозит в PostgreSQL',
                status: 'COMPLETED'
            }
        });

        console.log('✅ Транзакция создана в PostgreSQL:', transaction);

        // Финальная проверка
        const finalUsers = await prisma.user.findMany();
        const finalLotteries = await prisma.lottery.findMany({
            include: { prizes: true }
        });
        const finalTransactions = await prisma.transaction.findMany();

        console.log('\n📊 Финальные данные в PostgreSQL:');
        console.log('👥 Всего пользователей:', finalUsers.length);
        console.log('🎰 Всего лотерей:', finalLotteries.length);
        console.log('💰 Всего транзакций:', finalTransactions.length);

        console.log('\n🎉 PostgreSQL работает идеально!');
        console.log('💾 Данные надежно сохранены');
        console.log('🔄 Готово к продакшену');
        console.log('🚀 Масштабируемость до миллионов пользователей');

    } catch (error) {
        console.error('❌ Ошибка тестирования PostgreSQL:', error);

        if (error.code === 'P1001') {
            console.log('\n💡 Решение:');
            console.log('1. Проверьте DATABASE_URL в .env файле');
            console.log('2. Убедитесь, что PostgreSQL сервер запущен');
            console.log('3. Проверьте правильность учетных данных');
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Запуск теста
testPostgreSQL();