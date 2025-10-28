const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// User routes
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user.toJSON() });
});

module.exports = router;
