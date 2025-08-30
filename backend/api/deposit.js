// Vercel Serverless Function: /api/deposit
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();

let db;
try {
    const { initializeFirebase } = require('../src/firebase');
    const { db: firestoreDb } = initializeFirebase();
    db = firestoreDb;
} catch (error) {
    console.error("Ошибка инициализации Firebase в Deposit:", error);
}

// Default addresses for each currency
const DEFAULT_ADDRESSES = {
    TON: 'UQC5JgHh2woeEVsNf197RxYWc7y_ybp3TKczyOR8Q1ck9LVo',
    USDT_TRC20: 'TAqVqKZ5zHbX4Cz5x5ZGodXLQkuvLCFCYD',
    USDT_ERC20: '0x25c03364243614BbA73d5d214E29cBFcE241A825',
    ETH: '0x25c03364243614BbA73d5d214E29cBFcE241A825',
    MATIC: '0x25c03364243614BbA73d5d214E29cBFcE241A825',
    BNB: '0x25c03364243614BbA73d5d214E29cBFcE241A825'
};

app.use(express.json());

// Get all deposit addresses for user
router.get('/addresses/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Try to get user-specific addresses from database
        const userRef = db.collection('users').doc(String(userId));
        const userDoc = await userRef.get();

        let addresses = { ...DEFAULT_ADDRESSES };

        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.depositAddresses) {
                addresses = { ...addresses, ...userData.depositAddresses };
            }
        }

        res.json({
            success: true,
            addresses
        });
    } catch (error) {
        console.error('Error fetching deposit addresses:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
});

// Generate or get address for specific currency
router.post('/address', async (req, res) => {
    try {
        const { userId, currency } = req.body;

        if (!userId || !currency) {
            return res.status(400).json({
                success: false,
                message: 'User ID and currency are required'
            });
        }

        // For now, return default addresses
        // In production, you would generate unique addresses here
        const address = DEFAULT_ADDRESSES[currency] || DEFAULT_ADDRESSES.TON;

        // Store user-specific address mapping if needed
        const userRef = db.collection('users').doc(String(userId));
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            const depositAddresses = userData.depositAddresses || {};
            depositAddresses[currency] = address;

            await userRef.update({ depositAddresses });
        }

        res.json({
            success: true,
            address,
            currency
        });
    } catch (error) {
        console.error('Error generating deposit address:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
});

// Check transaction status
router.post('/check-transaction', async (req, res) => {
    try {
        const { currency, txHash } = req.body;

        if (!currency || !txHash) {
            return res.status(400).json({
                success: false,
                message: 'Currency and transaction hash are required'
            });
        }

        // In production, you would check actual blockchain
        // For now, simulate transaction checking
        const mockStatus = {
            status: Math.random() > 0.5 ? 'confirmed' : 'pending',
            confirmations: Math.floor(Math.random() * 20) + 1,
            blockHeight: Math.floor(Math.random() * 1000000),
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            ...mockStatus
        });
    } catch (error) {
        console.error('Error checking transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
});

// Get transaction history for user
router.get('/transactions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        // Get transactions from database
        const transactionsRef = db.collection('transactions');
        const snapshot = await transactionsRef
            .where('userId', '==', String(userId))
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            transactions
        });
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
});

// Process deposit notification (webhook endpoint)
router.post('/webhook/:currency', async (req, res) => {
    try {
        const { currency } = req.params;
        const webhookData = req.body;

        console.log(`Received ${currency} webhook:`, webhookData);

        // Process the webhook data
        // In production, you would validate the webhook and update user balance

        res.json({
            success: true,
            message: 'Webhook processed successfully'
        });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
});

app.use('/api/deposit', router);
module.exports = app;
module.exports.handler = serverless(app);