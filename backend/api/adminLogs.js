// Vercel Serverless Function: /api/admin-logs
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();

const { getAdminLogs, getAdminStats } = require('../src/adminLogger');
console.log('📋 [API-ADMIN-LOGS] Использование PostgreSQL через adminLogger');

app.use(express.json());

// Get admin logs (admin only)
router.get('/', async (req, res) => {
    console.log('📋 [GET-ADMIN-LOGS] Запрос логов действий админов');
    try {
        const { adminId, limit = 50, offset = 0 } = req.query;
        console.log('👑 [GET-ADMIN-LOGS] Admin ID:', adminId);
        console.log('📊 [GET-ADMIN-LOGS] Limit:', limit, 'Offset:', offset);

        // Admin access control
        const MAIN_ADMIN_ID = "5206288199";
        const RESTRICTED_ADMIN_ID = "1329896342";
        const adminIdStr = String(adminId);

        if (adminIdStr !== MAIN_ADMIN_ID && adminIdStr !== RESTRICTED_ADMIN_ID) {
            console.error('❌ [GET-ADMIN-LOGS] ДОСТУП ЗАПРЕЩЕН');
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        console.log('🔍 [GET-ADMIN-LOGS] Получение логов из PostgreSQL...');
        const logs = await getAdminLogs(null, parseInt(limit));
        const total = logs.length;

        // Пагинация (простая реализация)
        const paginatedLogs = logs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

        console.log('✅ [GET-ADMIN-LOGS] Логи получены:', paginatedLogs.length);
        console.log('📤 [GET-ADMIN-LOGS] Отправка ответа клиенту...');

        res.json({
            success: true,
            data: paginatedLogs,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: total > parseInt(offset) + parseInt(limit)
            }
        });
        console.log('✅ [GET-ADMIN-LOGS] Ответ отправлен успешно');

    } catch (error) {
        console.error('💥 [GET-ADMIN-LOGS] Ошибка получения логов:', error);
        console.error('🔍 [GET-ADMIN-LOGS] Детали ошибки:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
        console.log('❌ [GET-ADMIN-LOGS] Отправлен ответ об ошибке');
    }
});

// Get logs for specific admin
router.get('/admin/:targetAdminId', async (req, res) => {
    try {
        const { adminId } = req.query;
        const { targetAdminId } = req.params;

        // Admin access control
        const MAIN_ADMIN_ID = "5206288199";
        const RESTRICTED_ADMIN_ID = "1329896342";
        const adminIdStr = String(adminId);

        if (adminIdStr !== MAIN_ADMIN_ID && adminIdStr !== RESTRICTED_ADMIN_ID) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const isMainAdmin = adminIdStr === MAIN_ADMIN_ID;

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

        // Admin access control
        const MAIN_ADMIN_ID = "5206288199";
        const RESTRICTED_ADMIN_ID = "1329896342";
        const adminIdStr = String(adminId);

        if (adminIdStr !== MAIN_ADMIN_ID && adminIdStr !== RESTRICTED_ADMIN_ID) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const isMainAdmin = adminIdStr === MAIN_ADMIN_ID;

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