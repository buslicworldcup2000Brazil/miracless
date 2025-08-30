// Vercel Serverless Function: /api/transactions
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const transactionMonitor = require('../src/transactionMonitor');

let db;
try {
    const admin = require("firebase-admin");
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    console.log("Firebase Firestore (Serverless Transactions): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase в Serverless Transactions:", error);
}

app.use(express.json());

// Submit transaction for monitoring
router.post('/monitor', async (req, res) => {
    try {
        const { txHash, currency, userId, expectedAmount, usdAmount } = req.body;

        if (!txHash || !currency || !userId || !expectedAmount || !usdAmount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: txHash, currency, userId, expectedAmount, usdAmount'
            });
        }

        // Add transaction to monitoring
        transactionMonitor.addTransaction({
            txHash,
            currency,
            userId,
            expectedAmount,
            usdAmount
        });

        // Log transaction submission
        await db.collection('transaction_submissions').add({
            txHash,
            currency,
            userId,
            expectedAmount: parseFloat(expectedAmount),
            usdAmount: parseFloat(usdAmount),
            submittedAt: new Date(),
            status: 'monitoring'
        });

        res.json({
            success: true,
            message: 'Transaction submitted for monitoring',
            txHash
        });

    } catch (error) {
        console.error("Error submitting transaction for monitoring:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Get transaction monitoring stats
router.get('/stats', async (req, res) => {
    try {
        const stats = transactionMonitor.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error("Error getting transaction stats:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Get user's transactions
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const transactionsSnapshot = await db
            .collection('transactions')
            .where('userId', '==', userId)
            .orderBy('processedAt', 'desc')
            .limit(20)
            .get();

        const transactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error("Error getting user transactions:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Get all transactions (admin only)
router.get('/', async (req, res) => {
    try {
        const { adminId } = req.query;

        // Simple admin check (in production, use proper authentication)
        const ADMIN_IDS = ["1329896342", "5206288199"];
        if (!ADMIN_IDS.includes(String(adminId))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const transactionsSnapshot = await db
            .collection('transactions')
            .orderBy('processedAt', 'desc')
            .limit(100)
            .get();

        const transactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error("Error getting transactions:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

app.use('/api/transactions', router);
module.exports = app;
module.exports.handler = serverless(app);