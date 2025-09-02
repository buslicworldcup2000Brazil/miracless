const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

console.log('📋 [ADMIN-LOGGER] Инициализация логгера действий админов с PostgreSQL');

const logAdminAction = async (adminId, action, details = {}) => {
    console.log('👑 [ADMIN-ACTION] НАЧАЛО ЛОГИРОВАНИЯ ДЕЙСТВИЯ АДМИНА');
    console.log('🆔 [ADMIN-ACTION] Admin ID:', adminId);
    console.log('📝 [ADMIN-ACTION] Action:', action);
    console.log('📊 [ADMIN-ACTION] Details:', JSON.stringify(details, null, 2));

    try {
        console.log('💾 [ADMIN-ACTION] Сохранение в PostgreSQL...');
        const logEntry = await prisma.adminLog.create({
            data: {
                admin_id: String(adminId),
                action: action,
                details: details,
                timestamp: new Date(),
                ip_address: details.ip || null,
                user_agent: details.userAgent || null
            }
        });

        console.log('✅ [ADMIN-ACTION] Действие админа сохранено в БД');
        console.log('🆔 [ADMIN-ACTION] Log ID:', logEntry.id);
        console.log('📅 [ADMIN-ACTION] Timestamp:', logEntry.timestamp);

        return logEntry;
    } catch (error) {
        console.error('💥 [ADMIN-ACTION] Ошибка логирования действия админа:', error);
        console.error('🔍 [ADMIN-ACTION] Детали ошибки:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });

        // Fallback: логируем в консоль если БД недоступна
        console.log('📋 [ADMIN-ACTION] FALLBACK: Логирование в консоль');
        console.log(`👑 Admin ${adminId} performed action: ${action}`);
        console.log('📊 Details:', details);

        return null;
    } finally {
        // Всегда отключаемся от БД
        try {
            await prisma.$disconnect();
        } catch (disconnectError) {
            console.warn('⚠️ [ADMIN-ACTION] Ошибка отключения от БД:', disconnectError.message);
        }
    }
};

const getAdminLogs = async (adminId = null, limit = 50) => {
    console.log('📋 [ADMIN-LOGS] Запрос логов действий админов');
    console.log('👑 [ADMIN-LOGS] Admin ID filter:', adminId || 'all');
    console.log('📊 [ADMIN-LOGS] Limit:', limit);

    try {
        const where = adminId ? { admin_id: String(adminId) } : {};
        const logs = await prisma.adminLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: limit
        });

        console.log('✅ [ADMIN-LOGS] Найдено логов:', logs.length);
        return logs;
    } catch (error) {
        console.error('💥 [ADMIN-LOGS] Ошибка получения логов:', error);
        return [];
    } finally {
        try {
            await prisma.$disconnect();
        } catch (disconnectError) {
            console.warn('⚠️ [ADMIN-LOGS] Ошибка отключения от БД:', disconnectError.message);
        }
    }
};

const getAdminStats = async () => {
    console.log('📊 [ADMIN-STATS] Запрос статистики действий админов');

    try {
        const stats = await prisma.adminLog.groupBy({
            by: ['admin_id'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });

        console.log('✅ [ADMIN-STATS] Статистика получена:', stats.length, 'админов');
        return stats;
    } catch (error) {
        console.error('💥 [ADMIN-STATS] Ошибка получения статистики:', error);
        return [];
    } finally {
        try {
            await prisma.$disconnect();
        } catch (disconnectError) {
            console.warn('⚠️ [ADMIN-STATS] Ошибка отключения от БД:', disconnectError.message);
        }
    }
};

module.exports = { logAdminAction, getAdminLogs, getAdminStats };
