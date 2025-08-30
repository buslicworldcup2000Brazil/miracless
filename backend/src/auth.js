// backend/src/auth.js
const admin = require("firebase-admin");

let db;
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    db = admin.firestore();
    console.log("Firebase Firestore (Auth): Инициализировано.");
} catch (error) {
    console.error("Ошибка инициализации Firebase в auth.js:", error);
}

const authenticateUser = async (req, res) => {
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

        if (!telegram_id) {
            return res.status(400).json({ success: false, message: 'Telegram ID is required' });
        }

        const userRef = db.collection('users').doc(String(telegram_id));
        const doc = await userRef.get();

        let user;
        if (!doc.exists) {
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
            await userRef.set(user);
            console.log(`New user registered: ${telegram_id} (${first_name} ${last_name})`);
        } else {
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
                await userRef.update(updateData);
                user = { ...user, ...updateData };
            }
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error("Ошибка аутентификации:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
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
