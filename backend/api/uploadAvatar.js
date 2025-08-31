// Vercel Serverless Function: /api/upload-avatar
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const multer = require('multer');
const admin = require("firebase-admin");
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

let db;
try {
    const { db: firestoreDb } = require('../src/firebase').initializeFirebase();
    db = firestoreDb;
    console.log("Firebase Firestore (Avatar Upload): OK");
} catch (error) {
    console.error("Ошибка инициализации Firebase в Avatar Upload:", error);
}

// Upload avatar endpoint
router.post('/', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const userId = req.body.userId;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Get Firebase Storage bucket
        const bucket = admin.storage().bucket();

        // Create unique filename
        const fileName = `avatars/${userId}_${Date.now()}_${req.file.originalname}`;
        const file = bucket.file(fileName);

        // Upload file to Firebase Storage
        await file.save(req.file.buffer, {
            metadata: {
                contentType: req.file.mimetype,
            },
            public: true,
        });

        // Get public URL
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491', // Far future date for permanent access
        });

        // Update user document with avatar URL
        const userRef = db.collection('users').doc(String(userId));
        await userRef.update({
            avatar_url: url,
            avatar_updated_at: new Date()
        });

        res.json({
            success: true,
            avatarUrl: url,
            message: 'Avatar uploaded successfully'
        });

    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload avatar',
            error: error.message
        });
    }
});

// Delete avatar endpoint
router.delete('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Get user document to find avatar URL
        const userRef = db.collection('users').doc(String(userId));
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userData = userDoc.data();
        const avatarUrl = userData.avatar_url;

        if (avatarUrl) {
            // Extract file path from URL
            const urlParts = avatarUrl.split('/');
            const fileName = urlParts[urlParts.length - 1].split('?')[0];

            // Delete from Firebase Storage
            const bucket = admin.storage().bucket();
            const file = bucket.file(`avatars/${fileName}`);
            await file.delete();

            // Update user document
            await userRef.update({
                avatar_url: null,
                avatar_updated_at: null
            });
        }

        res.json({
            success: true,
            message: 'Avatar deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting avatar:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete avatar',
            error: error.message
        });
    }
});

app.use(express.json());
app.use('/api/upload-avatar', router);
module.exports = app;
module.exports.handler = serverless(app);