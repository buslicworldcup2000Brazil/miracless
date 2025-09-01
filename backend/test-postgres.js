const { PrismaClient } = require('@prisma/client');

async function testPostgreSQL() {
    console.log('🧪 ТЕСТИРОВАНИЕ POSTGRESQL ПОДКЛЮЧЕНИЯ\n');

    const prisma = new PrismaClient({
        log: ['query', 'error', 'warn'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    });

    try {
        console.log('🔌 Подключение к PostgreSQL...');
        await prisma.$connect();
        console.log('✅ Подключение успешно!\n');

        // Тестируем базовые операции
        console.log('📊 ТЕСТИРОВАНИЕ ОПЕРАЦИЙ:');

        // 1. Подсчет пользователей
        console.log('👥 Подсчет пользователей...');
        const userCount = await prisma.user.count();
        console.log(`✅ Найдено пользователей: ${userCount}`);

        // 2. Создание тестового пользователя (если нет)
        if (userCount === 0) {
            console.log('👤 Создание тестового пользователя...');
            const testUser = await prisma.user.create({
                data: {
                    telegram_id: '999999999',
                    username: 'test_user',
                    first_name: 'Test',
                    last_name: 'User',
                    language_code: 'ru',
                    balance: 100,
                    is_active: true,
                    created_at: new Date(),
                    last_seen: new Date()
                }
            });
            console.log('✅ Тестовый пользователь создан:', testUser.telegram_id);
        }

        // 3. Получение пользователя
        console.log('🔍 Получение пользователя...');
        const user = await prisma.user.findFirst();
        if (user) {
            console.log('✅ Пользователь найден:', {
                id: user.telegram_id,
                username: user.username,
                balance: user.balance
            });
        }

        // 4. Обновление пользователя
        console.log('💾 Обновление пользователя...');
        const updatedUser = await prisma.user.update({
            where: { telegram_id: user.telegram_id },
            data: { last_seen: new Date() }
        });
        console.log('✅ Пользователь обновлен');

        console.log('\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
        console.log('✅ PostgreSQL работает корректно');
        console.log('✅ Prisma подключен');
        console.log('✅ CRUD операции работают');

    } catch (error) {
        console.error('\n❌ ОШИБКА ТЕСТИРОВАНИЯ:');
        console.error('Тип ошибки:', error.constructor.name);
        console.error('Сообщение:', error.message);
        console.error('Код ошибки:', error.code);

        if (error.code === 'P1001') {
            console.log('\n💡 РЕШЕНИЕ:');
            console.log('1. Проверьте DATABASE_URL');
            console.log('2. Убедитесь, что PostgreSQL сервер запущен');
            console.log('3. Проверьте firewall и сетевые настройки');
        } else if (error.code === 'P3000') {
            console.log('\n💡 РЕШЕНИЕ:');
            console.log('1. Выполните миграции: npx prisma db push');
            console.log('2. Проверьте schema.prisma');
        }

        process.exit(1);
    } finally {
        await prisma.$disconnect();
        console.log('\n🔌 Отключение от базы данных');
    }
}

// Запуск теста
testPostgreSQL().catch(error => {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
});