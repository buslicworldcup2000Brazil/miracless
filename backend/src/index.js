const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const { logAdminAction } = require('./adminLogger');
const { authenticateUser, getUserBalance } = require('./auth');
const lotteryScheduler = require('./lotteryScheduler');
const notificationService = require('./notificationService');

// --- Инициализация ---
const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- КОНФИГУРАЦИЯ ---
const ADMIN_IDS = ["1329896342", "5206288199"];
const MAIN_ADMIN = "1329896342"; // Главный админ с полными правами
const RESTRICTED_ADMIN = "5206288199"; // Ограниченный админ
const COINGECKO_API_KEY = "CG-7ZzjP5H5QkdkC78DXGU9mCpY";

// --- Firebase Инициализация ---
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

let db;
try {
    // Parse Firebase service account JSON from environment variable
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!serviceAccountJson) {
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set");
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseError) {
        throw new Error(`Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON: ${parseError.message}`);
    }

    // Validate required fields
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);

    if (missingFields.length > 0) {
        throw new Error(`Missing required fields in service account JSON: ${missingFields.join(', ')}`);
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin SDK initialized successfully");
    }

    // Get Firestore instance
    db = getFirestore();
    console.log("Firebase Firestore: Connected successfully.");
} catch (error) {
    console.error("Ошибка инициализации Firebase:", error);
    console.error("Please ensure GOOGLE_APPLICATION_CREDENTIALS_JSON is properly set");
    process.exit(1);
}

// --- Клиент CoinGecko API ---
const getExchangeRate = (currencyIds) => {
    return new Promise((resolve, reject) => {
        const ids = currencyIds.join(',');
        const options = {
            hostname: 'api.coingecko.com',
            path: `/api/v3/simple/price?ids=${ids}&vs_currencies=usd&x_cg_demo_api_key=${COINGECKO_API_KEY}`,
            method: 'GET'
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', error => reject(error));
        req.end();
    });
};

// --- HELPER FUNCTIONS ---
const getAdminLevel = (adminId) => {
    if (adminId === MAIN_ADMIN) return 'main';
    if (adminId === RESTRICTED_ADMIN) return 'restricted';
    return null;
};

// --- MIDDLEWARE isAdmin ---
const isAdmin = (req, res, next) => {
    const { adminId } = req.body;
    if (ADMIN_IDS.includes(String(adminId))) {
        logAdminAction(adminId, `${req.method} ${req.path}`);
        next();
    } else {
        res.status(403).json({ success: false, message: 'Permission denied' });
    }
};

// --- MIDDLEWARE isMainAdmin ---
const isMainAdmin = (req, res, next) => {
    const { adminId } = req.body;
    if (adminId === MAIN_ADMIN) {
        logAdminAction(adminId, `${req.method} ${req.path}`);
        next();
    } else {
        res.status(403).json({ success: false, message: 'Main admin access required' });
    }
};

// --- API Роуты ---
app.post('/auth', authenticateUser);

app.get('/api/user/:userId/balance', getUserBalance);

app.get('/api/lotteries', async (req, res) => {
    try {
        const snapshot = await db.collection('lotteries').get();
        const lotteries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, data: lotteries });
    } catch (error) {
        console.error("Error fetching lotteries:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.post('/api/lotteries', isMainAdmin, async (req, res) => {
    try {
        const { newLotteryData } = req.body;
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
            lotteryScheduler.sendNewLotteryNotifications(lottery);
        });

        res.json({ success: true, data: lottery });
    } catch (error) {
        console.error("Error creating lottery:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.put('/api/lotteries/:id', isMainAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { updatedData } = req.body;
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

app.delete('/api/lotteries/:id', isMainAdmin, async (req, res) => {
    try {
        const { id } = req.params;
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

app.post('/api/lotteries/:id/participate', async (req, res) => {
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

app.post('/api/lotteries/:id/draw', isMainAdmin, async (req, res) => {
    const { id } = req.params;
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
        logAdminAction(req.body.adminId, `Drew winner for ${id}: ${winnerId}`);
        res.json({ success: true, winnerId, message: `Winner selected: ${winnerId}` });
    } catch (error) {
        console.error("Error drawing winner:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.post('/api/lotteries/:id/add-participant', isMainAdmin, async (req, res) => {
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

        logAdminAction(adminId, `Added participant ${userId} to lottery ${id}`);
        res.json({ success: true, message: "Participant added successfully" });
    } catch (e) {
        console.error("Error adding participant:", e);
        res.status(400).json({ success: false, message: e.message });
    }
});

app.post('/api/lotteries/:id/select-winner', isMainAdmin, async (req, res) => {
    const { id } = req.params;
    const { winnerId, adminId } = req.body;
    const lotteryRef = db.collection('lotteries').doc(id);

    try {
        const lotteryDoc = await lotteryRef.get();
        if (!lotteryDoc.exists) {
            return res.status(404).json({ success: false, message: "Lottery not found" });
        }

        const lottery = lotteryDoc.data();

        // Проверка, что победитель участвует в лотерее
        if (!lottery.participants || !lottery.participants.includes(winnerId)) {
            return res.status(400).json({ success: false, message: "Selected user is not a participant" });
        }

        // Начисление приза победителю
        const winnerRef = db.collection('users').doc(String(winnerId));
        const winnerDoc = await winnerRef.get();
        if (winnerDoc.exists) {
            const winner = winnerDoc.data();
            // Начисляем приз за 1 место
            const prizeAmount = lottery.prizes && lottery.prizes[0] ? lottery.prizes[0].amount : 0;
            await winnerRef.update({ balance: winner.balance + prizeAmount });
        }

        // Обновление статуса лотереи
        await lotteryRef.update({
            winner: winnerId,
            status: 'completed',
            completedAt: new Date()
        });

        logAdminAction(adminId, `Selected winner for ${id}: ${winnerId}`);

        // Здесь можно добавить отправку уведомлений участникам
        // TODO: Implement push notifications

        res.json({
            success: true,
            winnerId,
            prizeAmount: lottery.prizes && lottery.prizes[0] ? lottery.prizes[0].amount : 0,
            message: `Winner selected: ${winnerId}`
        });
    } catch (error) {
        console.error("Error selecting winner:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.post('/api/lotteries/:id/add-participant', isMainAdmin, async (req, res) => {
    const { id } = req.params;
    const { userId, adminId } = req.body;
    const lotteryRef = db.collection('lotteries').doc(id);
    const userRef = db.collection('users').doc(String(userId));

    try {
        const lotteryDoc = await lotteryRef.get();
        if (!lotteryDoc.exists) {
            return res.status(404).json({ success: false, message: "Lottery not found" });
        }

        const lottery = lotteryDoc.data();

        // Check if lottery is active
        if (lottery.status !== 'active') {
            return res.status(400).json({ success: false, message: "Lottery is not active" });
        }

        // Check if user exists
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check if user is already a participant
        if (lottery.participants && lottery.participants.includes(userId)) {
            return res.status(400).json({ success: false, message: "User is already a participant" });
        }

        // Check if lottery is full
        if (lottery.participants && lottery.participants.length >= lottery.maxParticipants) {
            return res.status(400).json({ success: false, message: "Lottery is full" });
        }

        // Check if user has enough balance
        const user = userDoc.data();
        if (user.balance < lottery.participationCost) {
            return res.status(400).json({ success: false, message: "User has insufficient balance" });
        }

        // Add participant using transaction
        await db.runTransaction(async (transaction) => {
            // Deduct participation cost
            transaction.update(userRef, { balance: user.balance - lottery.participationCost });

            // Add to participants list
            const newParticipants = [...(lottery.participants || []), userId];
            transaction.update(lotteryRef, { participants: newParticipants });
        });

        logAdminAction(adminId, `Added participant ${userId} to lottery ${id}`);

        res.json({
            success: true,
            message: `Participant ${userId} added successfully`,
            participantId: userId
        });
    } catch (error) {
        console.error("Error adding participant:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Manual lottery completion (admin only)
app.post('/api/lotteries/:id/complete', isMainAdmin, async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.body;

    try {
        const success = await lotteryScheduler.completeLotteryManually(id);

        if (success) {
            logAdminAction(adminId, `Manually completed lottery ${id}`);
            res.json({
                success: true,
                message: `Lottery ${id} completed successfully`
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Lottery not found or could not be completed"
            });
        }
    } catch (error) {
        console.error("Error manually completing lottery:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
