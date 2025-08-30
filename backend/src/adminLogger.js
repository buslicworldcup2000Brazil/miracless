const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

let db;
try {
    // Parse Firebase service account JSON from environment variable
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!serviceAccountJson) {
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set");
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseError) {
        throw new Error(`Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON: ${parseError.message}`);
    }

    // Validate required fields
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);

    if (missingFields.length > 0) {
        throw new Error(`Missing required fields in service account JSON: ${missingFields.join(', ')}`);
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin SDK initialized successfully (Logger)");
    }

    // Get Firestore instance
    db = getFirestore();
    console.log("Firebase Firestore (Logger): Connected successfully.");
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
