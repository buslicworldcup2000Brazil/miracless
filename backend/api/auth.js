// Vercel Serverless Function: /api/auth
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const { authenticateUser } = require('../src/auth');

let db;
try {
    const admin = require("firebase-admin");
    const serviceAccount = require("../serviceAccountKey.json");
    if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    console.log("Firebase Firestore (Serverless Auth): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase в Serverless Auth:", error);
}

app.use(express.json());

router.post('/', authenticateUser);

app.use('/api/auth', router);
module.exports = app;
module.exports.handler = serverless(app);
