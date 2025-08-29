// Vercel Serverless Function: /api/init-payment-system
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const admin = require("firebase-admin");

let db;
try {
    const serviceAccount = require("../serviceAccountKey.json");
    if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    console.log("Firebase Firestore (Init Payment System): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase в Init Payment System:", error);
}

app.use(express.json());

// Initialize payment system for new user
router.post('/', async (req, res) => {
    try {
        const { userId, addresses } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Create payment addresses document for user
        const paymentRef = db.collection('user_payment_addresses').doc(String(userId));
        await paymentRef.set({
            userId: String(userId),
            addresses: addresses,
            created_at: new Date(),
            last_updated: new Date(),
            is_active: true
        });

        // Initialize transaction monitoring settings
        const monitoringRef = db.collection('transaction_monitoring').doc(String(userId));
        await monitoringRef.set({
            userId: String(userId),
            enabled: true,
            last_check: new Date(),
            settings: {
                check_interval: 60, // seconds
                min_confirmations: {
                    TON: 1,
                    ETH: 12,
                    BNB: 12,
                    MATIC: 12,
                    TRX: 1,
                    USDT: 1
                }
            }
        });

        res.json({
            success: true,
            message: 'Payment system initialized successfully',
            addresses: addresses
        });

    } catch (error) {
        console.error('Error initializing payment system:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize payment system',
            error: error.message
        });
    }
});

app.use('/api/init-payment-system', router);
module.exports = app;
module.exports.handler = serverless(app);