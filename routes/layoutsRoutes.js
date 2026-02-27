// backend/routes/layoutsRoutes.js
const express = require('express');
const router = express.Router();
const { getModels } = require('../models/index.js');
const { crearLayout, obtenerLayouts } = require('../controllers/layoutsController.js');
const  upload  = require('../middleware/upload.js');

// Rutas
router.post('/', upload.single('imagen'), crearLayout);
router.get('/', obtenerLayouts);

module.exports = router;