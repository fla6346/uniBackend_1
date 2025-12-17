import express from 'express';
import { getFacultades } from '../controllers/facultadController.js';
import { protect } from '../middleware/authMiddleware.js';
import {getModels} from '../models/index.js ';
const router = express.Router();

router.get('/facultades', protect, getFacultades);

export default router;