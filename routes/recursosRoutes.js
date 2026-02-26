const { Router } = require('express');
const { createRecurso } = require ('../controllers/recursoController.js');
const { protect } =require('../middleware/authMiddleware.js'); 

const router = Router();

router.post('/', protect, createRecurso); 

module.exports = router;