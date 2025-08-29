// Vercel Serverless Function: /api/init-conversion-rates
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
    console.log("Firebase Firestore (Init Conversion Rates): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase в Init Conversion Rates:", error);
}

app.use(express.json());

// Initialize conversion rates for new user
router.post('/', async (req, res) => {
    try {
        const { userId, currentRates } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Create conversion rates document for user
        const ratesRef = db.collection('user_conversion_rates').doc(String(userId));
        await ratesRef.set({
            userId: String(userId),
            current_rates: currentRates,
            last_updated: new Date(),
            auto_update_enabled: true,
            update_interval: 300, // 5 minutes
            supported_currencies: Object.keys(currentRates)
        });

        // Create user preferences document
        const preferencesRef = db.collection('user_preferences').doc(String(userId));
        await preferencesRef.set({
            userId: String(userId),
            preferred_currency: 'USD',
            language: 'ru',
            notifications_enabled: true,
            created_at: new Date(),
            last_updated: new Date()
        });

        res.json({
            success: true,
            message: 'Conversion rates initialized successfully',
            rates: currentRates
        });

    } catch (error) {
        console.error('Error initializing conversion rates:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize conversion rates',
            error: error.message
        });
    }
});

app.use('/api/init-conversion-rates', router);
module.exports = app;
module.exports.handler = serverless(app);