// Vercel Serverless Function: /api/balance
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const { getUserBalance } = require('../src/auth');

let db;
try {
    const admin = require("firebase-admin");
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    console.log("Firebase Firestore (Serverless Balance): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase в Serverless Balance:", error);
}

app.use(express.json());

router.get('/:userId', getUserBalance);

app.use('/api/balance', router);
module.exports = app;
module.exports.handler = serverless(app);
