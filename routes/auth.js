const express = require('express');
const { auth } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Verify token endpoint
router.post('/verify', verifyToken, (req, res) => {
  res.json({
    message: 'Token is valid',
    user: {
      uid: req.user.uid,
      email: req.user.email,
      name: req.user.name
    }
  });
});

// Get user info
router.get('/user', verifyToken, async (req, res) => {
  try {
    const userRecord = await auth.getUser(req.user.uid);
    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      emailVerified: userRecord.emailVerified,
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime
    });
  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

module.exports = router;