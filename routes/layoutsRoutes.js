const  { Router } = require('express');
const  { getModels } =require('../models/index.js');
const  { crearLayout,obtenerLayouts } = require('../controllers/layoutsController.js');
const  { upload } = require('../middleware/upload.js');

const router = Router();
router.post('/', upload.single('imagen'), crearLayout);
router.get('/', obtenerLayouts);

module.exports = router;