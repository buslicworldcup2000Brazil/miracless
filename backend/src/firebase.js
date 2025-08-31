// Firebase Admin SDK initialization utility
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

/**
 * Initialize Firebase Admin SDK with service account from environment variable
 * @returns {Object} Firebase Admin app and Firestore instance
 */
function initializeFirebase() {
    try {
        // Parse Firebase service account JSON from environment variable
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

        console.log("🔍 Checking FIREBASE_SERVICE_ACCOUNT environment variable...");
        console.log("📊 FIREBASE_SERVICE_ACCOUNT length:", serviceAccountJson ? serviceAccountJson.length : "undefined");

        if (!serviceAccountJson) {
            console.error("❌ FIREBASE_SERVICE_ACCOUNT environment variable is not set");
            console.log("🔄 Switching to offline mode with mock database");
            return createMockFirebase();
        }

        let serviceAccount;
        try {
            serviceAccount = JSON.parse(serviceAccountJson);
            console.log('✅ Service account parsed successfully');
            console.log('📧 Client email:', serviceAccount.client_email);
            console.log('🏗️  Project ID:', serviceAccount.project_id);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError.message);
            // Покажите первые 200 символов для диагностики
            console.log('📄 First 200 chars:', serviceAccountJson?.substring(0, 200));
            console.log('📄 Last 200 chars:', serviceAccountJson?.substring(serviceAccountJson.length - 200));
            console.log("🔄 Switching to offline mode due to JSON parse error");
            return createMockFirebase();
        }

        // Validate required fields
        const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
        const missingFields = requiredFields.filter(field => !serviceAccount[field]);

        if (missingFields.length > 0) {
            console.error(`Missing required fields in service account JSON: ${missingFields.join(', ')}`);
            console.log("🔄 Switching to offline mode due to missing fields");
            return createMockFirebase();
        }

        // Initialize Firebase Admin SDK if not already initialized
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
            console.log("Firebase Admin SDK initialized successfully for project:", serviceAccount.project_id);
        }

        // Get Firestore instance
        const db = getFirestore();
        console.log("Firebase Firestore connected successfully");

        return { admin, db };
    } catch (error) {
        console.error("Firebase initialization error:", error);
        console.log("🔄 Switching to offline mode due to Firebase error");
        return createMockFirebase();
    }
}

// Create mock Firebase objects for offline mode
function createMockFirebase() {
    console.log("🏗️ Creating mock Firebase objects for offline mode");

    const mockDb = {
        collection: (name) => ({
            doc: (id) => ({
                get: async () => ({ exists: false, data: () => null }),
                set: async () => {},
                update: async () => {},
                delete: async () => {}
            }),
            where: () => ({
                where: () => ({
                    get: async () => ({ docs: [], empty: true })
                }),
                get: async () => ({ docs: [], empty: true })
            }),
            orderBy: () => ({
                limit: () => ({
                    offset: () => ({
                        get: async () => ({ docs: [], empty: true })
                    }),
                    get: async () => ({ docs: [], empty: true })
                }),
                get: async () => ({ docs: [], empty: true })
            }),
            add: async () => ({ id: 'mock-' + Date.now() }),
            get: async () => ({ docs: [], empty: true })
        })
    };

    return {
        admin: {
            apps: [],
            initializeApp: () => {},
            credential: { cert: () => {} }
        },
        db: mockDb
    };
}

module.exports = { initializeFirebase };