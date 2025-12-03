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

    console.log('Firebase Admin SDK initialized from file.');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK from file:', error.message);
    process.exit(1);
  }
} else if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
  try {
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        // Handle newlines in private key which can be escaped in env vars
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
    console.log('Firebase Admin SDK initialized from environment variables.');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK from env vars:', error.message);
    process.exit(1);
  }
} else {
  console.warn('FIREBASE credentials not set. Firebase Admin SDK not initialized.');
  // Provide a dummy object or a way to ensure subsequent calls don't crash
  firebaseAdmin = {
    auth: () => ({
      verifyIdToken: async () => { throw new Error('Firebase Admin SDK not initialized.'); }
    })
  };
}

module.exports = firebaseAdmin;
