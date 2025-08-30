// Vercel Serverless Function: /api/fake-users
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();

let db;
try {
    const admin = require("firebase-admin");
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    console.log("Firebase Firestore (Serverless Fake Users): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase в Serverless Fake Users:", error);
}

app.use(express.json());

// Get all fake users
router.get('/', async (req, res) => {
    try {
        const { adminId } = req.query;

        // Simple admin check
        const ADMIN_IDS = ["1329896342", "5206288199"];
        if (!ADMIN_IDS.includes(String(adminId))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const fakeUsersSnapshot = await db
            .collection('fake_users')
            .orderBy('created_at', 'desc')
            .get();

        const fakeUsers = fakeUsersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            data: fakeUsers
        });

    } catch (error) {
        console.error("Error getting fake users:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Create single fake user
router.post('/', async (req, res) => {
    try {
        const { adminId, nickname, avatar, balance } = req.body;

        // Simple admin check
        const ADMIN_IDS = ["1329896342", "5206288199"];
        if (!ADMIN_IDS.includes(String(adminId))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (!nickname || nickname.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Nickname is required'
            });
        }

        const fakeUserData = {
            nickname: nickname.trim(),
            avatar: avatar || `https://via.placeholder.com/100/ff0000/ffffff?text=${nickname}`,
            balance: parseFloat(balance) || 0,
            isFake: true,
            created_at: new Date(),
            created_by: adminId
        };

        const docRef = await db.collection('fake_users').add(fakeUserData);

        res.json({
            success: true,
            data: {
                id: docRef.id,
                ...fakeUserData
            },
            message: 'Fake user created successfully'
        });

    } catch (error) {
        console.error("Error creating fake user:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Bulk create fake users
router.post('/bulk', async (req, res) => {
    try {
        const { adminId, count } = req.body;

        // Simple admin check
        const ADMIN_IDS = ["1329896342", "5206288199"];
        if (!ADMIN_IDS.includes(String(adminId))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const batchSize = parseInt(count) || 10;
        if (batchSize < 1 || batchSize > 100) {
            return res.status(400).json({
                success: false,
                message: 'Count must be between 1 and 100'
            });
        }

        const fakeUsers = [];
        const batch = db.batch();

        for (let i = 0; i < batchSize; i++) {
            const nickname = `FakeUser${i + 1}`;
            const fakeUserData = {
                nickname,
                avatar: `https://via.placeholder.com/100/00${i % 10}0${i % 10}0/ffffff?text=F${i + 1}`,
                balance: Math.floor(Math.random() * 100),
                isFake: true,
                created_at: new Date(),
                created_by: adminId
            };

            const docRef = db.collection('fake_users').doc();
            batch.set(docRef, fakeUserData);

            fakeUsers.push({
                id: docRef.id,
                ...fakeUserData
            });
        }

        await batch.commit();

        res.json({
            success: true,
            data: fakeUsers,
            message: `${batchSize} fake users created successfully`
        });

    } catch (error) {
        console.error("Error bulk creating fake users:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Delete fake user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId } = req.body;

        // Simple admin check
        const ADMIN_IDS = ["1329896342", "5206288199"];
        if (!ADMIN_IDS.includes(String(adminId))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await db.collection('fake_users').doc(id).delete();

        res.json({
            success: true,
            message: 'Fake user deleted successfully'
        });

    } catch (error) {
        console.error("Error deleting fake user:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Update fake user
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId, nickname, avatar, balance } = req.body;

        // Simple admin check
        const ADMIN_IDS = ["1329896342", "5206288199"];
        if (!ADMIN_IDS.includes(String(adminId))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const updateData = {};
        if (nickname !== undefined) updateData.nickname = nickname;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (balance !== undefined) updateData.balance = parseFloat(balance);

        await db.collection('fake_users').doc(id).update(updateData);

        res.json({
            success: true,
            message: 'Fake user updated successfully'
        });

    } catch (error) {
        console.error("Error updating fake user:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

app.use('/api/fake-users', router);
module.exports = app;
module.exports.handler = serverless(app);