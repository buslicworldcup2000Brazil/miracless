// Firebase connection test script
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { initializeFirebase } = require('./src/firebase');

async function testFirebaseConnection() {
    console.log('Testing Firebase connection...');

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