// backend/src/auth.js
const { initializeFirebase } = require('./firebase');

let db;
try {
    const { db: firestoreDb } = initializeFirebase();
    db = firestoreDb;
} catch (error) {
    console.error("Ошибка инициализации Firebase в auth.js:", error);
    process.exit(1);
}

const authenticateUser = async (req, res) => {
    console.log('🔐 [AUTH] НАЧАЛО АУТЕНТИФИКАЦИИ ПОЛЬЗОВАТЕЛЯ');
    console.log('📥 [AUTH] Полученные данные:', JSON.stringify(req.body, null, 2));

    try {
        const {
            telegram_id,
            username,
            first_name,
            last_name,
            language_code,
            avatar_url,
            is_premium,
            registration_source,
            registration_timestamp,
            unique_id
        } = req.body;

        console.log('🆔 [AUTH] Telegram ID:', telegram_id);

        if (!telegram_id) {
            console.error('❌ [AUTH] ОТСУТСТВУЕТ TELEGRAM ID');
            return res.status(400).json({ success: false, message: 'Telegram ID is required' });
        }

        console.log('🔍 [AUTH] Проверка существования пользователя в БД...');
        const userRef = db.collection('users').doc(String(telegram_id));
        const doc = await userRef.get();

        let user;
        if (!doc.exists) {
            console.log('👤 [AUTH] ПОЛЬЗОВАТЕЛЬ НЕ НАЙДЕН - СОЗДАЕМ НОВОГО');
            // Создаем нового пользователя с расширенными данными
            user = {
                telegram_id: String(telegram_id),
                username: username || '',
                first_name: first_name || '',
                last_name: last_name || '',
                language_code: language_code || 'en',
                avatar_url: avatar_url || null,
                is_premium: is_premium || false,
                registration_source: registration_source || 'unknown',
                registration_timestamp: registration_timestamp ? new Date(registration_timestamp) : new Date(),
                unique_id: unique_id || `MF_${telegram_id}_${Date.now()}`,
                balance: 0,
                created_at: new Date(),
                last_seen: new Date(),
                is_active: true,
                preferences: {
                    notifications: true,
                    language: language_code || 'en',
                    currency: 'USD'
                }
            };
            console.log('💾 [AUTH] Сохранение нового пользователя в БД...');
            await userRef.set(user);
            console.log(`✅ [AUTH] НОВЫЙ ПОЛЬЗОВАТЕЛЬ ЗАРЕГИСТРИРОВАН: ${telegram_id} (${first_name} ${last_name})`);
        } else {
            console.log('👤 [AUTH] ПОЛЬЗОВАТЕЛЬ УЖЕ СУЩЕСТВУЕТ - ОБНОВЛЯЕМ ДАННЫЕ');
            // Обновляем данные существующего пользователя
            user = doc.data();
            const updateData = {
                last_seen: new Date()
            };

            // Обновляем только если данные изменились
            if (username !== undefined && username !== user.username) updateData.username = username;
            if (first_name !== undefined && first_name !== user.first_name) updateData.first_name = first_name;
            if (last_name !== undefined && last_name !== user.last_name) updateData.last_name = last_name;
            if (language_code !== undefined && language_code !== user.language_code) updateData.language_code = language_code;
            if (avatar_url !== undefined && avatar_url !== user.avatar_url) {
                updateData.avatar_url = avatar_url;
                updateData.avatar_updated_at = new Date();
            }
            if (is_premium !== undefined && is_premium !== user.is_premium) updateData.is_premium = is_premium;

            if (Object.keys(updateData).length > 1) { // больше чем только last_seen
                console.log('💾 [AUTH] Обновление данных пользователя...');
                await userRef.update(updateData);
                user = { ...user, ...updateData };
                console.log('✅ [AUTH] Данные пользователя обновлены');
            } else {
                console.log('📋 [AUTH] Данные пользователя не изменились');
            }
        }

        console.log('📤 [AUTH] Отправка успешного ответа клиенту...');
        console.log('👤 [AUTH] Финальные данные пользователя:', {
            telegram_id: user.telegram_id,
            username: user.username,
            first_name: user.first_name,
            balance: user.balance,
            is_premium: user.is_premium
        });

        res.json({ success: true, user });
        console.log('✅ [AUTH] АУТЕНТИФИКАЦИЯ ЗАВЕРШЕНА УСПЕШНО');
    } catch (error) {
        console.error('💥 [AUTH] КРИТИЧЕСКАЯ ОШИБКА АУТЕНТИФИКАЦИИ:', error);
        console.error('🔍 [AUTH] Детали ошибки:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            telegram_id: req.body?.telegram_id
        });

        // Проверяем тип ошибки
        if (error.code === 'PERMISSION_DENIED') {
            console.error('🔐 [AUTH] Ошибка доступа к Firebase');
        } else if (error.code === 'UNAVAILABLE') {
            console.error('🌐 [AUTH] Firebase недоступен');
        } else if (error.code === 'DEADLINE_EXCEEDED') {
            console.error('⏰ [AUTH] Превышено время ожидания Firebase');
        }

        res.status(500).json({ success: false, message: "Internal Server Error" });
        console.log('❌ [AUTH] ОТПРАВЛЕН ОТВЕТ ОБ ОШИБКЕ КЛИЕНТУ');
    }
};

const getUserBalance = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }
        
        const userRef = db.collection('users').doc(String(userId));
        const doc = await userRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        
        const user = doc.data();
        res.json({ success: true, balance: user.balance });
    } catch (error) {
        console.error("Ошибка получения баланса:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = { authenticateUser, getUserBalance };
