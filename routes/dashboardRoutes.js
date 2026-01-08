// routes/dashboard.js
import express from 'express';
import {getModels} from '../models/index.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getDashboardStats, getHistoricalData,getMensualStats } from '../controllers/dashboardController.js';
const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.get('/historical', protect,getHistoricalData);
router.get('/mensual', protect, getMensualStats);
  

export default router;