#!/usr/bin/env node
require('dotenv').config();
const { auth } = require('./config/firebase');

async function createTestUser() {
  try {
    // Try to get existing user
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail('jxklikecs@qq.com');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create user if not exists
        userRecord = await auth.createUser({
          email: 'jxklikecs@qq.com',
          password: 'Billgates123',
          displayName: 'Test Guardian User'
        });
      } else {
        throw error;
      }
    }

    // Create custom token
    const customToken = await auth.createCustomToken(userRecord.uid);

    // Output the token for use in curl commands
    console.log('USER_ID=' + userRecord.uid);
    console.log('CUSTOM_TOKEN=' + customToken);

    return { uid: userRecord.uid, customToken };
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createTestUser();