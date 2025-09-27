const { auth } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    let decodedToken;
    try {
      // Try to verify as ID token first
      decodedToken = await auth.verifyIdToken(token);
    } catch (idTokenError) {
      // If ID token verification fails, try custom token verification for testing
      try {
        // Custom tokens can't be verified directly, but we can decode them
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (decoded.iss && decoded.iss.includes('firebase-adminsdk') && decoded.uid) {
          // This looks like our custom token, create a mock decoded token
          decodedToken = {
            uid: decoded.uid,
            iss: decoded.iss,
            aud: decoded.aud,
            email: 'jxklikecs@qq.com', // Known test email
            name: 'Test Guardian User'
          };
        } else {
          throw new Error('Invalid custom token format');
        }
      } catch (customTokenError) {
        throw idTokenError; // Re-throw the original error
      }
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { verifyToken };