const  express = require('express');
const router = express.Router();
const  { protect } = require('../middleware/authMiddleware.js');
const  { getFacultades} = require('../controllers/facultadController.js');

router.get('/facultades', protect, getFacultades);

module.exports = router;