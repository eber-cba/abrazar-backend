const admin = require('firebase-admin');
const path = require('path');
const env = require('./env');

let firebaseAdmin;

if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    // Correctly resolve the path relative to the project root or a known config directory
    // Assuming the service account JSON is in `api/config/`
    const serviceAccountPath = path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH);
    const serviceAccount = require(serviceAccountPath);

    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase Admin SDK initialized.');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    // Optionally, exit the process or handle the error more gracefully
    process.exit(1);
  }
} else {
  console.warn('FIREBASE_SERVICE_ACCOUNT_PATH not set. Firebase Admin SDK not initialized.');
  // Provide a dummy object or a way to ensure subsequent calls don't crash
  firebaseAdmin = {
    auth: () => ({
      verifyIdToken: async () => { throw new Error('Firebase Admin SDK not initialized.'); }
    })
  };
}

module.exports = firebaseAdmin;
