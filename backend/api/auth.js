// Vercel Serverless Function: /api/auth
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const { authenticateUser } = require('../src/auth');

console.log('🔐 [API-AUTH] Инициализация API аутентификации с PostgreSQL');
console.log('🔗 [API-AUTH] DATABASE_URL:', process.env.DATABASE_URL ? 'настроена' : 'не настроена');

app.use(express.json());

router.post('/', authenticateUser);

app.use('/api/auth', router);
module.exports = app;
module.exports.handler = serverless(app);
