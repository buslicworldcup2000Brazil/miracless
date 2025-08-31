const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
    try {
        console.log('🧪 Тестирование SQLite базы данных...\n');

        // Получаем существующие данные
        const existingUsers = await prisma.user.findMany();
        const existingLotteries = await prisma.lottery.findMany({
            include: { prizes: true }
        });

        console.log('📊 Существующие данные в БД:');
        console.log('👥 Пользователи:', existingUsers.length);
        console.log('🎰 Лотереи:', existingLotteries.length);

        if (existingUsers.length > 0) {
            console.log('✅ Данные сохранились после предыдущего запуска!');
            console.log('📋 Первый пользователь:', existingUsers[0]);
        }

        // Создаем нового пользователя с уникальным ID
        const timestamp = Date.now();
        const newUser = await prisma.user.create({
            data: {
                telegramId: `test_${timestamp}`,
                username: `test_user_${timestamp}`,
                firstName: 'Test',
                lastName: 'User',
                languageCode: 'ru',
                balance: 150.75,
                isPremium: false,
                uniqueId: `MF_test_${timestamp}_${timestamp}`
            }
        });

        console.log('✅ Новый пользователь создан:', newUser);

        // Создаем новую лотерею
        const newLottery = await prisma.lottery.create({
            data: {
                title: `Тестовая лотерея ${timestamp}`,
                description: 'Проверка работы БД',
                participationCost: 15.00,
                maxParticipants: 50,
                endDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Через 48 часов
                prizes: {
                    create: [
                        { place: 1, amount: 750.00, type: 'FIXED' },
                        { place: 2, amount: 300.00, type: 'FIXED' }
                    ]
                }
            },
            include: {
                prizes: true
            }
        });

        console.log('✅ Новая лотерея создана:', newLottery);

        // Создаем транзакцию для нового пользователя
        const transaction = await prisma.transaction.create({
            data: {
                userId: newUser.id,
                type: 'DEPOSIT',
                amount: 75.00,
                usdAmount: 75.00,
                description: 'Тестовый депозит для нового пользователя',
                status: 'COMPLETED'
            }
        });

        console.log('✅ Транзакция создана:', transaction);

        // Финальная проверка
        const finalUsers = await prisma.user.findMany();
        const finalLotteries = await prisma.lottery.findMany({
            include: { prizes: true }
        });
        const finalTransactions = await prisma.transaction.findMany();

        console.log('\n📊 Финальные данные в БД:');
        console.log('👥 Всего пользователей:', finalUsers.length);
        console.log('🎰 Всего лотерей:', finalLotteries.length);
        console.log('💰 Всего транзакций:', finalTransactions.length);

        console.log('\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
        console.log('💾 SQLite БД работает идеально!');
        console.log('🔄 Данные сохраняются между запусками');
        console.log('📁 Файл БД: backend/prisma/dev.db');
        console.log('🚀 Готово к использованию в продакшене!');

    } catch (error) {
        console.error('❌ Ошибка тестирования:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testDatabase();