const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function viewDatabase() {
    try {
        console.log('🔍 Просмотр базы данных...\n');

        // Подключаемся к БД
        await prisma.$connect();
        console.log('✅ Подключение к базе данных успешно!\n');

        // Получаем статистику
        const userCount = await prisma.user.count();
        const lotteryCount = await prisma.lottery.count();
        const transactionCount = await prisma.transaction.count();
        const adminLogCount = await prisma.adminLog.count();

        console.log('📊 ОБЩАЯ СТАТИСТИКА:');
        console.log('👥 Пользователей:', userCount);
        console.log('🎰 Лотерей:', lotteryCount);
        console.log('💰 Транзакций:', transactionCount);
        console.log('📝 Логов администратора:', adminLogCount);
        console.log('');

        // Показываем последних 5 пользователей
        if (userCount > 0) {
            console.log('👥 ПОСЛЕДНИЕ 5 ПОЛЬЗОВАТЕЛЕЙ:');
            const recentUsers = await prisma.user.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    telegramId: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    balance: true,
                    isPremium: true,
                    createdAt: true
                }
            });

            recentUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.firstName} ${user.lastName} (@${user.username})`);
                console.log(`   ID: ${user.telegramId}, Баланс: $${user.balance}, Premium: ${user.isPremium ? '✅' : '❌'}`);
                console.log(`   Создан: ${user.createdAt.toLocaleString('ru-RU')}`);
                console.log('');
            });
        }

        // Показываем активные лотереи
        if (lotteryCount > 0) {
            console.log('🎰 АКТИВНЫЕ ЛОТЕРЕИ:');
            const activeLotteries = await prisma.lottery.findMany({
                where: { status: 'ACTIVE' },
                include: {
                    prizes: true,
                    _count: { select: { participations: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            activeLotteries.forEach((lottery, index) => {
                console.log(`${index + 1}. ${lottery.title}`);
                console.log(`   Стоимость: $${lottery.participationCost}`);
                console.log(`   Участников: ${lottery._count.participations}/${lottery.maxParticipants}`);
                console.log(`   Призы: ${lottery.prizes.length} мест`);
                console.log(`   Завершается: ${lottery.endDate.toLocaleString('ru-RU')}`);
                console.log('');
            });
        }

        // Показываем последние транзакции
        if (transactionCount > 0) {
            console.log('💰 ПОСЛЕДНИЕ 5 ТРАНЗАКЦИЙ:');
            const recentTransactions = await prisma.transaction.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            username: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });

            recentTransactions.forEach((tx, index) => {
                const userName = tx.user.username || `${tx.user.firstName} ${tx.user.lastName}`;
                console.log(`${index + 1}. ${userName} - ${tx.type} $${tx.amount}`);
                console.log(`   Статус: ${tx.status}, Дата: ${tx.createdAt.toLocaleString('ru-RU')}`);
                if (tx.description) console.log(`   Описание: ${tx.description}`);
                console.log('');
            });
        }

        // Показываем логи администратора
        if (adminLogCount > 0) {
            console.log('📝 ПОСЛЕДНИЕ 5 ДЕЙСТВИЙ АДМИНИСТРАТОРА:');
            const recentLogs = await prisma.adminLog.findMany({
                take: 5,
                orderBy: { timestamp: 'desc' }
            });

            recentLogs.forEach((log, index) => {
                console.log(`${index + 1}. ${log.adminId} - ${log.action}`);
                console.log(`   Время: ${log.timestamp.toLocaleString('ru-RU')}`);
                if (log.details) console.log(`   Детали: ${log.details}`);
                console.log('');
            });
        }

        console.log('🎉 Просмотр базы данных завершен!');

    } catch (error) {
        console.error('❌ Ошибка при просмотре базы данных:', error);

        if (error.code === 'P1001') {
            console.log('\n💡 Решение проблемы подключения:');
            console.log('1. Проверьте переменную DATABASE_URL в .env файле');
            console.log('2. Убедитесь, что PostgreSQL база данных запущена');
            console.log('3. Проверьте правильность логина и пароля');
            console.log('4. Убедитесь, что ваш IP разрешен в настройках PostgreSQL');
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Запуск просмотра
viewDatabase();