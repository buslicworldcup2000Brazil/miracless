const { initializeFirebase } = require('./firebase');

let db;
try {
    const { db: firestoreDb } = initializeFirebase();
    db = firestoreDb;
} catch (error) {
    console.error("Ошибка инициализации Firebase в Logger:", error);
    db = null;
}

const logAdminAction = async (adminId, action) => {
    if (!db) {
        console.log(`Admin ${adminId} performed action: ${action} (logging disabled)`);
        return;
    }
    
    try {
        await db.collection('admin_logs').add({
            adminId,
            action,
            timestamp: new Date()
        });
        console.log(`Admin ${adminId} performed action: ${action}`);
    } catch (error) {
        console.error("Error logging admin action:", error);
    }
};

module.exports = { logAdminAction };
