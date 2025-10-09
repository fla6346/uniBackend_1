// routes/authRoutes.js
import express from 'express';
const router = express.Router();
//import {loginUser} from '../controllers/authController';
// Asegúrate de que los paths sean correctos y que los archivos exporten correctamente
import { registerUser, loginUser, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';


router.post('/register', registerUser); 
router.post('/login', loginUser);
router.get('/me', protect, getMe); 

export default router; // Usar export default