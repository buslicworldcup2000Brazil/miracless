// Vercel Serverless Function: /api/user/:userId/status
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const admin = require("firebase-admin");

let db;
try {
    const { db: firestoreDb } = require('../src/firebase').initializeFirebase();
    db = firestoreDb;
    console.log("Firebase Firestore (User Status): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase в User Status:", error);
}

app.use(express.json());

// Check user registration status
router.get('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const userRef = db.collection('users').doc(String(userId));
        const doc = await userRef.get();

        res.json({
            success: true,
            registered: doc.exists,
            userData: doc.exists ? doc.data() : null
        });

    } catch (error) {
        console.error('Error checking user status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
});

app.use('/api/user', router);
module.exports = app;
module.exports.handler = serverless(app);