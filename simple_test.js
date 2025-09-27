// Simple test using Firebase Admin SDK directly
require('dotenv').config();
const { auth } = require('./config/firebase');

async function createTestToken() {
  try {
    // Create or get test user
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail('jxklikecs@qq.com');
      console.log('Found existing user:', userRecord.uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: 'jxklikecs@qq.com',
          password: 'Billgates123',
          displayName: 'Test Guardian'
        });
        console.log('Created new user:', userRecord.uid);
      } else {
        throw error;
      }
    }

    // Create custom token
    const customToken = await auth.createCustomToken(userRecord.uid);
    console.log('Custom token created:', customToken.substring(0, 50) + '...');

    return customToken;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

createTestToken();