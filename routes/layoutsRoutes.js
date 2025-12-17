import { Router } from 'express';
import { getModels } from '../models/index.js';
import { crearLayout,obtenerLayouts } from '../controllers/layoutsController.js';
import { upload } from '../middleware/upload.js';

const router = Router();
router.post('/', upload.single('imagen'), crearLayout);
router.get('/', obtenerLayouts);

export default router;