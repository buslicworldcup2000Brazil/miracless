// Vercel Serverless Function: /api/lotteries
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const notificationService = require('../src/notificationService');

let db;
try {
    const { initializeFirebase } = require('../src/firebase');
    const { db: firestoreDb } = initializeFirebase();
    db = firestoreDb;
} catch (error) {
    console.error("Ошибка инициализации Firebase в Serverless Lotteries:", error);
}

app.use(express.json());

// --- КОНФИГУРАЦИЯ ---
const ADMIN_IDS = ["1329896342", "5206288199"];

// --- HELPER FUNCTIONS ---
const getAdminLevel = (adminId) => {
    if (adminId === "5206288199") return 'main'; // Главный админ
    if (adminId === "1329896342") return 'restricted'; // Ограниченный админ
    return null;
};

// --- MIDDLEWARE isAdmin ---
const isAdmin = (req, res, next) => {
    const { adminId } = req.body;
    if (ADMIN_IDS.includes(String(adminId))) {
        // В Serverless функциях логирование можно реализовать позже
        next();
    } else {
        res.status(403).json({ success: false, message: 'Permission denied' });
    }
};

// --- MIDDLEWARE isMainAdmin ---
const isMainAdmin = (req, res, next) => {
    const { adminId } = req.body;
    if (adminId === "5206288199") { // Главный админ
        next();
    } else {
        res.status(403).json({ success: false, message: 'Main admin access required' });
    }
};

// Получить все лотереи
router.get('/', async (req, res) => {
    console.log('🎰 [LOTTERIES] Запрос получения всех лотерей');
    try {
        console.log('🔍 [LOTTERIES] Получение лотерей из PostgreSQL...');
        const lotteries = await prisma.lottery.findMany({
            include: {
                participants: true,
                _count: {
                    select: { participants: true }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        console.log(`✅ [LOTTERIES] Найдено ${lotteries.length} лотерей`);
        console.log('📤 [LOTTERIES] Отправка ответа клиенту...');
        res.status(200).json({ success: true, data: lotteries });
        console.log('✅ [LOTTERIES] Ответ отправлен успешно');
    } catch (error) {
        console.error('💥 [LOTTERIES] Ошибка получения лотерей:', error);
        console.error('🔍 [LOTTERIES] Детали ошибки:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ success: false, message: "Internal Server Error" });
        console.log('❌ [LOTTERIES] Отправлен ответ об ошибке');
    }
});

// Создать лотерею
router.post('/', async (req, res) => {
    console.log('🎰 [CREATE-LOTTERY] НАЧАЛО СОЗДАНИЯ ЛОТЕРЕИ');
    try {
        const { newLotteryData, adminId } = req.body;
        console.log('👑 [CREATE-LOTTERY] Admin ID:', adminId);
        console.log('📋 [CREATE-LOTTERY] Данные лотереи:', JSON.stringify(newLotteryData, null, 2));

        // Проверка прав администратора
        if (adminId !== "5206288199") {
            console.error('❌ [CREATE-LOTTERY] ДОСТУП ЗАПРЕЩЕН - требуется главный админ');
            return res.status(403).json({ success: false, message: 'Main admin access required' });
        }

        console.log('💾 [CREATE-LOTTERY] Сохранение лотереи в PostgreSQL...');
        const lottery = await prisma.lottery.create({
            data: {
                title: newLotteryData.title,
                participation_cost: newLotteryData.participationCost,
                max_participants: newLotteryData.maxParticipants,
                end_date: new Date(newLotteryData.endDate),
                status: 'active',
                prizes: newLotteryData.prizes || [],
                created_by: adminId
            }
        });

        console.log('✅ [CREATE-LOTTERY] Лотерея создана:', lottery.id);
        console.log('📤 [CREATE-LOTTERY] Отправка ответа клиенту...');
        res.status(201).json({ success: true, data: lottery });
        console.log('✅ [CREATE-LOTTERY] Ответ отправлен успешно');

        // Отправка уведомлений (асинхронно)
        setImmediate(async () => {
            try {
                console.log('📢 [CREATE-LOTTERY] Отправка уведомлений о новой лотерее...');
                const users = await prisma.user.findMany({
                    where: { balance: { gt: 0 } },
                    select: { telegram_id: true }
                });

                const userIds = users.map(user => user.telegram_id);
                console.log(`📢 [CREATE-LOTTERY] Найдено ${userIds.length} пользователей для уведомлений`);

                if (userIds.length > 0) {
                    await notificationService.sendNewLottery(lottery, userIds);
                    console.log('✅ [CREATE-LOTTERY] Уведомления отправлены');
                } else {
                    console.log('📋 [CREATE-LOTTERY] Нет пользователей для уведомлений');
                }
            } catch (error) {
                console.error('💥 [CREATE-LOTTERY] Ошибка отправки уведомлений:', error);
            }
        });

    } catch (error) {
        console.error('💥 [CREATE-LOTTERY] Ошибка создания лотереи:', error);
        console.error('🔍 [CREATE-LOTTERY] Детали ошибки:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ success: false, message: "Internal Server Error" });
        console.log('❌ [CREATE-LOTTERY] Отправлен ответ об ошибке');
    }
});

// Обновить лотерею
router.put('/:id', async (req, res) => {
    console.log('🎰 [UPDATE-LOTTERY] НАЧАЛО ОБНОВЛЕНИЯ ЛОТЕРЕИ');
    try {
        const { id } = req.params;
        const { updatedData, adminId } = req.body;

        console.log('🆔 [UPDATE-LOTTERY] Lottery ID:', id);
        console.log('👑 [UPDATE-LOTTERY] Admin ID:', adminId);
        console.log('📋 [UPDATE-LOTTERY] Обновляемые данные:', JSON.stringify(updatedData, null, 2));

        // Проверка прав администратора
        if (adminId !== "5206288199") {
            console.error('❌ [UPDATE-LOTTERY] ДОСТУП ЗАПРЕЩЕН - требуется главный админ');
            return res.status(403).json({ success: false, message: 'Main admin access required' });
        }

        console.log('🔍 [UPDATE-LOTTERY] Поиск лотереи в PostgreSQL...');
        const existingLottery = await prisma.lottery.findUnique({
            where: { id: id },
            include: { participants: true }
        });

        if (!existingLottery) {
            console.error('❌ [UPDATE-LOTTERY] Лотерея не найдена');
            return res.status(404).json({ success: false, message: "Lottery not found" });
        }

        console.log(`📊 [UPDATE-LOTTERY] Лотерея найдена. Участников: ${existingLottery.participants?.length || 0}`);

        // Проверка, что лотерея не началась
        if (existingLottery.participants && existingLottery.participants.length > 0) {
            console.error('❌ [UPDATE-LOTTERY] НЕЛЬЗЯ РЕДАКТИРОВАТЬ - лотерея уже началась');
            return res.status(400).json({
                success: false,
                message: "Cannot edit lottery that has already started (has participants)"
            });
        }

        console.log('💾 [UPDATE-LOTTERY] Обновление лотереи в PostgreSQL...');
        const updatedLottery = await prisma.lottery.update({
            where: { id: id },
            data: {
                title: updatedData.title,
                participation_cost: updatedData.participationCost,
                max_participants: updatedData.maxParticipants,
                end_date: updatedData.endDate ? new Date(updatedData.endDate) : undefined,
                prizes: updatedData.prizes
            }
        });

        console.log('✅ [UPDATE-LOTTERY] Лотерея обновлена успешно');
        console.log('📤 [UPDATE-LOTTERY] Отправка ответа клиенту...');
        res.json({ success: true, message: "Lottery updated successfully", data: updatedLottery });
        console.log('✅ [UPDATE-LOTTERY] Ответ отправлен успешно');

    } catch (error) {
        console.error('💥 [UPDATE-LOTTERY] Ошибка обновления лотереи:', error);
        console.error('🔍 [UPDATE-LOTTERY] Детали ошибки:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ success: false, message: "Internal Server Error" });
        console.log('❌ [UPDATE-LOTTERY] Отправлен ответ об ошибке');
    }
});

// Удалить лотерею
router.delete('/:id', async (req, res) => {
    console.log('🎰 [DELETE-LOTTERY] НАЧАЛО УДАЛЕНИЯ ЛОТЕРЕИ');
    try {
        const { id } = req.params;
        const { adminId } = req.body;

        console.log('🆔 [DELETE-LOTTERY] Lottery ID:', id);
        console.log('👑 [DELETE-LOTTERY] Admin ID:', adminId);

        // Проверка прав администратора
        if (adminId !== "5206288199") {
            console.error('❌ [DELETE-LOTTERY] ДОСТУП ЗАПРЕЩЕН - требуется главный админ');
            return res.status(403).json({ success: false, message: 'Main admin access required' });
        }

        console.log('🔍 [DELETE-LOTTERY] Поиск лотереи в PostgreSQL...');
        const existingLottery = await prisma.lottery.findUnique({
            where: { id: id }
        });

        if (!existingLottery) {
            console.error('❌ [DELETE-LOTTERY] Лотерея не найдена');
            return res.status(404).json({ success: false, message: "Lottery not found" });
        }

        console.log('🗑️ [DELETE-LOTTERY] Удаление лотереи из PostgreSQL...');
        await prisma.lottery.delete({
            where: { id: id }
        });

        console.log('✅ [DELETE-LOTTERY] Лотерея удалена успешно');
        console.log('📤 [DELETE-LOTTERY] Отправка ответа клиенту...');
        res.json({ success: true, message: "Lottery deleted successfully" });
        console.log('✅ [DELETE-LOTTERY] Ответ отправлен успешно');

    } catch (error) {
        console.error('💥 [DELETE-LOTTERY] Ошибка удаления лотереи:', error);
        console.error('🔍 [DELETE-LOTTERY] Детали ошибки:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ success: false, message: "Internal Server Error" });
        console.log('❌ [DELETE-LOTTERY] Отправлен ответ об ошибке');
    }
});

// Добавить участника вручную (админ)
router.post('/:id/add-participant', isMainAdmin, async (req, res) => {
    const { id } = req.params;
    const { userId, adminId } = req.body;
    const lotteryRef = db.collection('lotteries').doc(id);
    const userRef = db.collection('users').doc(String(userId));

    try {
        await db.runTransaction(async (t) => {
            const lotteryDoc = await t.get(lotteryRef);
            const userDoc = await t.get(userRef);
            const lottery = lotteryDoc.data();
            const user = userDoc.data();

            if (!lottery || !user) throw new Error("Lottery or user not found");
            if (lottery.participants.includes(userId)) throw new Error("User already participated");
            if (lottery.participants.length >= lottery.maxParticipants) throw new Error("Lottery is full");

            t.update(lotteryRef, { participants: [...lottery.participants, userId] });
        });
        res.json({ success: true, message: "Participant added successfully" });
    } catch (e) {
        console.error("Error adding participant:", e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Участие в лотерее
router.post('/:id/participate', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    const lotteryRef = db.collection('lotteries').doc(id);
    const userRef = db.collection('users').doc(String(userId));
    
    try {
        await db.runTransaction(async (t) => {
            const lotteryDoc = await t.get(lotteryRef);
            const userDoc = await t.get(userRef);
            const lottery = lotteryDoc.data();
            const user = userDoc.data();
            
            if (!lottery || !user) throw new Error("Lottery or user not found");
            if (user.balance < lottery.participationCost) throw new Error("Insufficient balance");
            if (lottery.participants.includes(userId)) throw new Error("User already participated");
            if (lottery.participants.length >= lottery.maxParticipants) throw new Error("Lottery is full");
            
            t.update(userRef, { balance: user.balance - lottery.participationCost });
            t.update(lotteryRef, { participants: [...lottery.participants, userId] });
        });
        res.json({ success: true, message: "Successfully participated" });
    } catch (e) {
        console.error("Error participating:", e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Выбор победителя
router.post('/:id/draw', isMainAdmin, async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.body;
    const lotteryRef = db.collection('lotteries').doc(id);
    
    try {
        const lotteryDoc = await lotteryRef.get();
        if (!lotteryDoc.exists) {
            return res.status(404).json({ success: false, message: "Lottery not found" });
        }
        
        const lottery = lotteryDoc.data();
        if (lottery.participants.length === 0) {
            return res.status(400).json({ success: false, message: "No participants" });
        }
        
        // Выбор случайного победителя
        const winnerId = lottery.participants[Math.floor(Math.random() * lottery.participants.length)];
        
        // Начисление приза победителю (простая реализация)
        const winnerRef = db.collection('users').doc(String(winnerId));
        const winnerDoc = await winnerRef.get();
        if (winnerDoc.exists) {
            const winner = winnerDoc.data();
            // Предполагаем, что приз за 1 место хранится в lottery.prizes[0].amount
            const prizeAmount = lottery.prizes && lottery.prizes[0] ? lottery.prizes[0].amount : 0;
            await winnerRef.update({ balance: winner.balance + prizeAmount });
        }
        
        await lotteryRef.update({ winner: winnerId, status: 'completed' });
        res.json({ success: true, winnerId, message: `Winner selected: ${winnerId}` });
    } catch (error) {
        console.error("Error drawing winner:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.use('/api/lotteries', router);
module.exports = app;
module.exports.handler = serverless(app);
