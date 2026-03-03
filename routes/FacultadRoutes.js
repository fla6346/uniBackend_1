const  express = require('express');
const  { protect } = require('../middleware/authMiddleware.js');
const  { getFacultades} = require('../controllers/facultadController.js');

const router = express.Router()
router.get('/facultades', protect, getFacultades);

module.exports = router;