const { PrismaClient } = require('@prisma/client');

// Диагностика подключения к базе данных
async function diagnoseConnection() {
    console.log('🔍 ДИАГНОСТИКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ\n');

    // Проверяем переменные окружения
    console.log('📋 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ:');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ УСТАНОВЛЕНА' : '❌ НЕТ');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('PORT:', process.env.PORT || '3000');
    console.log('');

    // Проверяем Prisma
    console.log('🗄️ ПРОВЕРКА PRISMA:');
    try {
        const prisma = new PrismaClient({
            log: ['error', 'warn']
        });

        console.log('✅ Prisma клиент создан');

        // Проверяем подключение
        console.log('🔌 Тестирование подключения...');
        await prisma.$connect();
        console.log('✅ Подключение к базе данных успешно!');

        // Получаем информацию о БД
        const userCount = await prisma.user.count();
        const lotteryCount = await prisma.lottery.count();
        const transactionCount = await prisma.transaction.count();

        console.log('📊 СТАТИСТИКА БАЗЫ ДАННЫХ:');
        console.log(`👥 Пользователей: ${userCount}`);
        console.log(`🎰 Лотерей: ${lotteryCount}`);
        console.log(`💰 Транзакций: ${transactionCount}`);

        await prisma.$disconnect();
        console.log('✅ Отключение от базы данных успешно');

    } catch (error) {
        console.error('❌ ОШИБКА ПОДКЛЮЧЕНИЯ К БД:');
        console.error('Тип ошибки:', error.constructor.name);
        console.error('Сообщение:', error.message);

        if (error.code) {
            console.error('Код ошибки:', error.code);
        }

        // Диагностика распространенных проблем
        if (error.message.includes('connect ECONNREFUSED')) {
            console.log('\n💡 РЕШЕНИЕ:');
            console.log('1. Проверьте, что PostgreSQL сервер запущен');
            console.log('2. Убедитесь, что DATABASE_URL правильный');
            console.log('3. Проверьте firewall и сетевые настройки');
        } else if (error.message.includes('authentication failed')) {
            console.log('\n💡 РЕШЕНИЕ:');
            console.log('1. Проверьте логин и пароль в DATABASE_URL');
            console.log('2. Убедитесь, что пользователь имеет права доступа');
        } else if (error.message.includes('does not exist')) {
            console.log('\n💡 РЕШЕНИЕ:');
            console.log('1. Создайте базу данных');
            console.log('2. Выполните миграции: npx prisma db push');
        }
    }

    console.log('\n🎯 ДИАГНОСТИКА ЗАВЕРШЕНА');
}

// Запуск диагностики
diagnoseConnection().catch(error => {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error);
    process.exit(1);
});