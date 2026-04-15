const express = require('express');
const router = express.Router();
const ac = require('../controllers/aiChatController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.post('/chat', ac.chat);

module.exports = router;
