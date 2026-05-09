// routes/daf.js (Node.js/Express)
const express = require('express');
const {reports} = require('../controllers/dafController');
const authMiddleware = require('../middleware/auth'); // Tu middleware de auth

const router = express.Router();

router.get('/reportes', authMiddleware, reports);

module.exports = router;