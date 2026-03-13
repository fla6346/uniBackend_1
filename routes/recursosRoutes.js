const { Router } = require('express');
const { createRecurso,getRecursos } = require ('../controllers/recursoController.js');
const { protect } =require('../middleware/authMiddleware.js'); 

const router = Router();

router.post('/', protect, createRecurso); 
router.get('/', protect, getRecursos);

module.exports = router;