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
    try {
        const snapshot = await db.collection('lotteries').get();
        const lotteries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ success: true, data: lotteries });
    } catch (error) {
        console.error("Error fetching lotteries:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Создать лотерею
router.post('/', isMainAdmin, async (req, res) => {
    try {
        const { newLotteryData, adminId } = req.body;
        const newDoc = db.collection('lotteries').doc();
        const lottery = { 
            id: newDoc.id, 
            ...newLotteryData, 
            participants: [], 
            winner: null,
            created_at: new Date(),
            status: 'active'
        };
        await newDoc.set(lottery);

        // Send notifications about new lottery (async, don't wait)
        setImmediate(() => {
            // Get all users who have participated in lotteries before
            db.collection('users').get().then(snapshot => {
                const userIds = [];
                snapshot.forEach(doc => {
                    const user = doc.data();
                    if (user.balance > 0) {
                        userIds.push(doc.id);
                    }
                });
                if (userIds.length > 0) {
                    notificationService.sendNewLottery(lottery, userIds);
                }
            }).catch(error => {
                console.error('Error sending new lottery notifications:', error);
            });
        });

        res.status(201).json({ success: true, data: lottery });
    } catch (error) {
        console.error("Error creating lottery:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Обновить лотерею
router.put('/:id', isMainAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { updatedData, adminId } = req.body;
        const lotteryRef = db.collection('lotteries').doc(id);

        const doc = await lotteryRef.get();
        if (!doc.exists) {
            return res.status(404).json({ success: false, message: "Lottery not found" });
        }

        const lottery = doc.data();

        // Check if lottery has participants - prevent editing if it has started
        if (lottery.participants && lottery.participants.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot edit lottery that has already started (has participants)"
            });
        }

        await lotteryRef.update(updatedData);
        res.json({ success: true, message: "Lottery updated successfully" });
    } catch (error) {
        console.error("Error updating lottery:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Удалить лотерею
router.delete('/:id', isMainAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId } = req.body;
        const lotteryRef = db.collection('lotteries').doc(id);
        
        const doc = await lotteryRef.get();
        if (!doc.exists) {
            return res.status(404).json({ success: false, message: "Lottery not found" });
        }
        
        await lotteryRef.delete();
        res.json({ success: true, message: "Lottery deleted successfully" });
    } catch (error) {
        console.error("Error deleting lottery:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
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
