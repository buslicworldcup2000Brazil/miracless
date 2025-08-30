// Vercel Serverless Function: /api/admin-logs
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
    console.log("Firebase Firestore (Serverless Admin Logs): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase в Serverless Admin Logs:", error);
}

app.use(express.json());

// Get admin logs (admin only)
router.get('/', async (req, res) => {
    try {
        const { adminId, limit = 50, offset = 0 } = req.query;

        // Simple admin check (in production, use proper authentication)
        const ADMIN_IDS = ["1329896342", "5206288199"];
        if (!ADMIN_IDS.includes(String(adminId))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get logs with pagination
        const logsQuery = db.collection('admin_logs')
            .orderBy('timestamp', 'desc')
            .limit(parseInt(limit))
            .offset(parseInt(offset));

        const logsSnapshot = await logsQuery.get();
        const logs = logsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : null
        }));

        // Get total count
        const totalSnapshot = await db.collection('admin_logs').get();
        const total = totalSnapshot.size;

        res.json({
            success: true,
            data: logs,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: total > parseInt(offset) + parseInt(limit)
            }
        });

    } catch (error) {
        console.error("Error getting admin logs:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Get logs for specific admin
router.get('/admin/:targetAdminId', async (req, res) => {
    try {
        const { adminId } = req.query;
        const { targetAdminId } = req.params;

        // Simple admin check
        const ADMIN_IDS = ["1329896342", "5206288199"];
        if (!ADMIN_IDS.includes(String(adminId))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const logsQuery = db.collection('admin_logs')
            .where('adminId', '==', targetAdminId)
            .orderBy('timestamp', 'desc')
            .limit(100);

        const logsSnapshot = await logsQuery.get();
        const logs = logsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : null
        }));

        res.json({
            success: true,
            data: logs
        });

    } catch (error) {
        console.error("Error getting admin logs:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Search logs
router.get('/search', async (req, res) => {
    try {
        const { adminId, query, limit = 20 } = req.query;

        // Simple admin check
        const ADMIN_IDS = ["1329896342", "5206288199"];
        if (!ADMIN_IDS.includes(String(adminId))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Simple search implementation
        const logsSnapshot = await db.collection('admin_logs')
            .orderBy('timestamp', 'desc')
            .limit(200)
            .get();

        let logs = logsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : null
        }));

        // Filter by search query
        if (query) {
            const searchTerm = query.toLowerCase();
            logs = logs.filter(log =>
                log.action.toLowerCase().includes(searchTerm) ||
                log.adminId.toLowerCase().includes(searchTerm)
            );
        }

        // Apply limit
        logs = logs.slice(0, parseInt(limit));

        res.json({
            success: true,
            data: logs
        });

    } catch (error) {
        console.error("Error searching admin logs:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

module.exports = app;
module.exports.handler = serverless(app);