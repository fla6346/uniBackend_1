// routes/recursoRoutes.js
import { Router } from 'express';
import { createRecurso } from '../controllers/recursoController.js';
import { protect } from '../middleware/authMiddleware.js'; // opcional, si requiere autenticación

const router = Router();

router.post('/', protect, createRecurso); 

export default router;