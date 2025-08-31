// Vercel Serverless Function: /api/participate
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();

let db;
try {
    const { db: firestoreDb } = require('../src/firebase').initializeFirebase();
    db = firestoreDb;
    console.log("Firebase Firestore (Serverless): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase:", error);
}

router.post('/:id', async (req, res) => {
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
            
            t.update(userRef, { balance: user.balance - lottery.participationCost });
            t.update(lotteryRef, { participants: admin.firestore.FieldValue.arrayUnion(userId) });
        });
        res.status(200).json({ success: true, message: "Successfully participated" });
    } catch (e) {
        console.error("Error participating:", e);
        res.status(400).json({ success: false, message: e.message });
    }
});

// --- Экспортируем обработчик для Vercel ---
app.use('/api/participate', router);
module.exports = app;
module.exports.handler = serverless(app);
