// Firebase connection test script
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { initializeFirebase } = require('./src/firebase');

async function testFirebaseConnection() {
    console.log('Testing Firebase connection...');

    // Test JSON parsing first
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    console.log("🔍 Checking FIREBASE_SERVICE_ACCOUNT environment variable...");
    console.log("📊 FIREBASE_SERVICE_ACCOUNT length:", serviceAccountJson ? serviceAccountJson.length : "undefined");

    try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        console.log('✅ Service account parsed successfully');
        console.log('📧 Client email:', serviceAccount.client_email);
        console.log('🏗️  Project ID:', serviceAccount.project_id);
    } catch (parseError) {
        console.error('❌ JSON parse error:', parseError.message);
        // Покажите первые 200 символов для диагностики
        console.log('📄 First 200 chars:', serviceAccountJson?.substring(0, 200));
        console.log('📄 Last 200 chars:', serviceAccountJson?.substring(serviceAccountJson.length - 200));
        throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT: ${parseError.message}`);
    }

    try {
        const { db } = initializeFirebase();
        console.log('✅ Firebase initialized successfully');

        // Test basic Firestore operation
        const testRef = db.collection('test').doc('connection-test');
        await testRef.set({
            timestamp: new Date(),
            message: 'Firebase connection test successful'
        });

        console.log('✅ Firestore write test successful');

        // Clean up test document
        await testRef.delete();
        console.log('✅ Firestore delete test successful');

        console.log('🎉 All Firebase tests passed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Firebase connection test failed:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        process.exit(1);
    }
}

testFirebaseConnection();