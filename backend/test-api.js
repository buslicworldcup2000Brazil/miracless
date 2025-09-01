const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

console.log('🧪 ТЕСТИРОВАНИЕ API ENDPOINTS');
console.log('🌐 Базовый URL:', API_BASE_URL);
console.log('');

// Тестовые данные
const testUser = {
    telegram_id: '123456789',
    username: 'test_user',
    first_name: 'Test',
    last_name: 'User',
    language_code: 'ru',
    avatar_url: 'https://example.com/avatar.jpg',
    is_premium: false,
    registration_source: 'test',
    registration_timestamp: new Date().toISOString(),
    unique_id: 'TEST_123456789_' + Date.now()
};

async function testEndpoint(method, url, data = null) {
    console.log(`🔍 Тестирование ${method} ${url}`);

    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE_URL}${url}`, options);

        console.log(`📊 Статус: ${response.status}`);
        console.log(`🏷️ Content-Type: ${response.headers.get('content-type')}`);
        console.log(`📏 Content-Length: ${response.headers.get('content-length')}`);

        const responseText = await response.text();

        if (responseText) {
            try {
                const jsonData = JSON.parse(responseText);
                console.log('📄 JSON ответ:', JSON.stringify(jsonData, null, 2));
            } catch (e) {
                console.log('📄 Текстовый ответ:', responseText);
            }
        } else {
            console.log('❌ ПУСТОЙ ОТВЕТ!');
        }

        console.log('');
        return { status: response.status, data: responseText };

    } catch (error) {
        console.error('❌ Ошибка запроса:', error.message);
        console.log('');
        return { error: error.message };
    }
}

async function runTests() {
    console.log('🚀 НАЧАЛО ТЕСТИРОВАНИЯ\n');

    // Тест 1: Аутентификация
    console.log('='.repeat(50));
    console.log('🔐 ТЕСТ 1: АУТЕНТИФИКАЦИЯ');
    console.log('='.repeat(50));

    const authResult = await testEndpoint('POST', '/api/auth', testUser);

    if (authResult.error) {
        console.log('❌ АУТЕНТИФИКАЦИЯ НЕ РАБОТАЕТ!');
        console.log('🔍 Возможные причины:');
        console.log('   - Бэкенд не запущен');
        console.log('   - База данных не подключена');
        console.log('   - Переменные окружения не настроены');
        console.log('   - Firebase не инициализирован');
        return;
    }

    if (authResult.status === 200) {
        console.log('✅ АУТЕНТИФИКАЦИЯ РАБОТАЕТ!');
    } else {
        console.log('⚠️ АУТЕНТИФИКАЦИЯ ВЕРНУЛА ОШИБКУ');
    }

    // Тест 2: Баланс пользователя
    console.log('='.repeat(50));
    console.log('💰 ТЕСТ 2: ПОЛУЧЕНИЕ БАЛАНСА');
    console.log('='.repeat(50));

    await testEndpoint('GET', `/api/balance/${testUser.telegram_id}`);

    // Тест 3: Курсы валют
    console.log('='.repeat(50));
    console.log('💱 ТЕСТ 3: КУРСЫ ВАЛЮТ');
    console.log('='.repeat(50));

    await testEndpoint('GET', '/api/exchange-rates');

    console.log('🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!');
    console.log('\n💡 Для просмотра детальных логов смотрите:');
    console.log('   - Консоль браузера (фронтенд)');
    console.log('   - Логи Render (бэкенд)');
}

// Запуск тестов
runTests().catch(error => {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ТЕСТИРОВАНИЯ:', error);
});