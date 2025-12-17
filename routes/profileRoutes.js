// routes/profileRoutes.js
import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getProfile } from '../controllers/userController.js';

const router = Router();

router.get('/',protect, getProfile); 

export default router;