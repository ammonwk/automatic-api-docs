// service/routes/api.js (updated)
const express = require('express');
const chatController = require('../controllers/chatController');

const router = express.Router();

// Chat endpoint (POST for regular requests)
router.post('/chat', chatController.chat);

// Chat endpoint (GET for SSE streaming)
router.get('/chat', chatController.chat);

module.exports = router;