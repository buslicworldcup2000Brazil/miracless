// Vercel Serverless Function: /api/auth
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const { authenticateUser } = require('../src/auth');
const { initializeFirebase } = require('../src/firebase');

let db;
try {
    const { db: firestoreDb } = initializeFirebase();
    db = firestoreDb;
} catch (error) {
    console.error("Ошибка инициализации Firebase в Serverless Auth:", error);
}

app.use(express.json());

router.post('/', authenticateUser);

app.use('/api/auth', router);
module.exports = app;
module.exports.handler = serverless(app);
