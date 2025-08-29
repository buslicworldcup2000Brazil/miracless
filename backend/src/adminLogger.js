const admin = require("firebase-admin");

let db;
try {
    const serviceAccount = require("../serviceAccountKey.json");
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    db = admin.firestore();
    console.log("Firebase Firestore (Logger): Инициализировано.");
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
