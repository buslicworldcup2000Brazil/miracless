// Vercel Serverless Function: /api/transactions/verify
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const https = require('https');

let db;
try {
    const admin = require("firebase-admin");
    const serviceAccount = require("../serviceAccountKey.json");
    if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    console.log("Firebase Firestore (Transaction Verification): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase:", error);
}

app.use(express.json());

// Конфигурация API ключей
const API_KEYS = {
    TON: process.env.REACT_APP_TON_API_KEY,
    ETH: process.env.REACT_APP_ETH_API_KEY,
    BNB: process.env.REACT_APP_BNB_API_URL,
    POLYGON: process.env.REACT_APP_POLYGON_API_URL,
    TRON: process.env.REACT_APP_TRON_API_KEY
};

// Адреса для приема платежей
const PAYMENT_ADDRESSES = {
    USDT_TRC20: "TAqVqKZ5zHbX4Cz5x5ZGodXLQkuvLCFCYD",
    BNB: "0x25c03364243614BbA73d5d214E29cBFcE241A825",
    ETH: "0x25c03364243614BbA73d5d214E29cBFcE241A825",
    USDT_ERC20: "0x25c03364243614BbA73d5d214E29cBFcE241A825",
    POLYGON: "0x25c03364243614BbA73d5d214E29cBFcE241A825",
    TON: "UQC5JgHh2woeEVsNf197RxYWc7y_ybp3TKczyOR8Q1ck9LVo"
};

// Проверка транзакции в блокчейне
const verifyTransaction = async (txHash, network, expectedAddress, expectedAmount) => {
    try {
        switch (network.toUpperCase()) {
            case 'TON':
                return await verifyTonTransaction(txHash, expectedAddress, expectedAmount);
            case 'ETH':
            case 'USDT_ERC20':
                return await verifyEthTransaction(txHash, expectedAddress, expectedAmount);
            case 'BNB':
                return await verifyBnbTransaction(txHash, expectedAddress, expectedAmount);
            case 'POLYGON':
                return await verifyPolygonTransaction(txHash, expectedAddress, expectedAmount);
            case 'USDT_TRC20':
                return await verifyTronTransaction(txHash, expectedAddress, expectedAmount);
            default:
                return { success: false, message: 'Unsupported network' };
        }
    } catch (error) {
        console.error('Transaction verification error:', error);
        return { success: false, message: 'Verification failed' };
    }
};

// Проверка TON транзакции
const verifyTonTransaction = async (txHash, expectedAddress, expectedAmount) => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'toncenter.com',
            path: `/api/v2/getTransaction?hash=${txHash}`,
            method: 'GET',
            headers: {
                'X-API-Key': API_KEYS.TON
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.ok && response.result) {
                        const tx = response.result;
                        const isValid = tx.out_msgs && tx.out_msgs.some(msg =>
                            msg.destination === expectedAddress &&
                            parseFloat(msg.value) >= expectedAmount * 1000000000 // TON to nanoTON
                        );
                        resolve({
                            success: isValid,
                            message: isValid ? 'Transaction verified' : 'Transaction not found or invalid',
                            details: tx
                        });
                    } else {
                        resolve({ success: false, message: 'Transaction not found' });
                    }
                } catch (error) {
                    resolve({ success: false, message: 'Parse error' });
                }
            });
        });

        req.on('error', () => resolve({ success: false, message: 'Network error' }));
        req.setTimeout(10000, () => resolve({ success: false, message: 'Timeout' }));
        req.end();
    });
};

// Проверка ETH транзакции
const verifyEthTransaction = async (txHash, expectedAddress, expectedAmount) => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.etherscan.io',
            path: `/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${API_KEYS.ETH}`,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.result) {
                        const tx = response.result;
                        const isValid = tx.to && tx.to.toLowerCase() === expectedAddress.toLowerCase() &&
                                      parseFloat(tx.value) / 1e18 >= expectedAmount;
                        resolve({
                            success: isValid,
                            message: isValid ? 'Transaction verified' : 'Transaction invalid',
                            details: tx
                        });
                    } else {
                        resolve({ success: false, message: 'Transaction not found' });
                    }
                } catch (error) {
                    resolve({ success: false, message: 'Parse error' });
                }
            });
        });

        req.on('error', () => resolve({ success: false, message: 'Network error' }));
        req.setTimeout(10000, () => resolve({ success: false, message: 'Timeout' }));
        req.end();
    });
};

// Проверка BNB транзакции
const verifyBnbTransaction = async (txHash, expectedAddress, expectedAmount) => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.bscscan.com',
            path: `/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${API_KEYS.BNB}`,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.result) {
                        const tx = response.result;
                        const isValid = tx.to && tx.to.toLowerCase() === expectedAddress.toLowerCase() &&
                                      parseFloat(tx.value) / 1e18 >= expectedAmount;
                        resolve({
                            success: isValid,
                            message: isValid ? 'Transaction verified' : 'Transaction invalid',
                            details: tx
                        });
                    } else {
                        resolve({ success: false, message: 'Transaction not found' });
                    }
                } catch (error) {
                    resolve({ success: false, message: 'Parse error' });
                }
            });
        });

        req.on('error', () => resolve({ success: false, message: 'Network error' }));
        req.setTimeout(10000, () => resolve({ success: false, message: 'Timeout' }));
        req.end();
    });
};

// Проверка Polygon транзакции
const verifyPolygonTransaction = async (txHash, expectedAddress, expectedAmount) => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.polygonscan.com',
            path: `/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${API_KEYS.POLYGON}`,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.result) {
                        const tx = response.result;
                        const isValid = tx.to && tx.to.toLowerCase() === expectedAddress.toLowerCase() &&
                                      parseFloat(tx.value) / 1e18 >= expectedAmount;
                        resolve({
                            success: isValid,
                            message: isValid ? 'Transaction verified' : 'Transaction invalid',
                            details: tx
                        });
                    } else {
                        resolve({ success: false, message: 'Transaction not found' });
                    }
                } catch (error) {
                    resolve({ success: false, message: 'Parse error' });
                }
            });
        });

        req.on('error', () => resolve({ success: false, message: 'Network error' }));
        req.setTimeout(10000, () => resolve({ success: false, message: 'Timeout' }));
        req.end();
    });
};

// Проверка TRON транзакции
const verifyTronTransaction = async (txHash, expectedAddress, expectedAmount) => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.trongrid.io',
            path: `/v1/transactions/${txHash}`,
            method: 'GET',
            headers: {
                'TRON-PRO-API-KEY': API_KEYS.TRON
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.data && response.data.length > 0) {
                        const tx = response.data[0];
                        const isValid = tx.raw_data && tx.raw_data.contract &&
                                      tx.raw_data.contract.some(contract =>
                                          contract.parameter &&
                                          contract.parameter.value &&
                                          contract.parameter.value.to_address === expectedAddress &&
                                          parseFloat(contract.parameter.value.amount) / 1000000 >= expectedAmount
                                      );
                        resolve({
                            success: isValid,
                            message: isValid ? 'Transaction verified' : 'Transaction invalid',
                            details: tx
                        });
                    } else {
                        resolve({ success: false, message: 'Transaction not found' });
                    }
                } catch (error) {
                    resolve({ success: false, message: 'Parse error' });
                }
            });
        });

        req.on('error', () => resolve({ success: false, message: 'Network error' }));
        req.setTimeout(10000, () => resolve({ success: false, message: 'Timeout' }));
        req.end();
    });
};

// API endpoint для проверки транзакции
router.post('/verify', async (req, res) => {
    try {
        const { txHash, network, expectedAddress, expectedAmount, userId } = req.body;

        if (!txHash || !network || !expectedAddress || !expectedAmount || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        // Проверяем транзакцию в блокчейне
        const verification = await verifyTransaction(txHash, network, expectedAddress, expectedAmount);

        if (verification.success) {
            // Обновляем баланс пользователя
            const userRef = db.collection('users').doc(String(userId));
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                const user = userDoc.data();
                const newBalance = user.balance + expectedAmount;

                await userRef.update({
                    balance: newBalance,
                    last_transaction: new Date(),
                    transactions: [...(user.transactions || []), {
                        txHash,
                        network,
                        amount: expectedAmount,
                        timestamp: new Date(),
                        status: 'confirmed'
                    }]
                });

                // Логируем транзакцию
                await db.collection('transactions').add({
                    userId,
                    txHash,
                    network,
                    amount: expectedAmount,
                    status: 'confirmed',
                    timestamp: new Date(),
                    verification: verification.details
                });
            }
        }

        res.json({
            success: verification.success,
            message: verification.message,
            details: verification.details
        });

    } catch (error) {
        console.error('Transaction verification API error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Получить статус транзакции
router.get('/status/:txHash', async (req, res) => {
    try {
        const { txHash } = req.params;
        const { network } = req.query;

        if (!txHash || !network) {
            return res.status(400).json({
                success: false,
                message: 'Missing txHash or network'
            });
        }

        const verification = await verifyTransaction(txHash, network, '', 0);

        res.json({
            success: true,
            status: verification.success ? 'confirmed' : 'pending',
            details: verification.details
        });

    } catch (error) {
        console.error('Transaction status API error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

app.use('/api/transactions', router);
module.exports = app;
module.exports.handler = serverless(app);