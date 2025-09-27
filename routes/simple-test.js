const express = require('express');
const router = express.Router();

console.log('Simple test router loaded');

router.get('/hello', (req, res) => {
  res.json({ message: 'Hello from simple test!' });
});

module.exports = router;