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

        if (!serviceAccountJson) {
            throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set");
        }

        let serviceAccount;
        try {
            serviceAccount = JSON.parse(serviceAccountJson);
        } catch (parseError) {
            throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT: ${parseError.message}`);
        }

        // Validate required fields
        const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
        const missingFields = requiredFields.filter(field => !serviceAccount[field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields in service account JSON: ${missingFields.join(', ')}`);
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
        throw error;
    }
}

module.exports = { initializeFirebase };