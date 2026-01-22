// routes/dashboard.js
import express from 'express';
import {getModels} from '../models/index.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getDashboardStats, getHistoricalData,getMensualStats,getMyHistoricalData,getMyDashboardStats, getMyCommitteeEvents } from '../controllers/dashboardController.js';
const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.get('/historical', protect,getHistoricalData);
router.get('/mensual', protect, getMensualStats);
// Rutas para académicos (datos personales)
router.get('/my-stats', protect, authorize(['academico']), getMyDashboardStats);
router.get('/my-historical', protect, authorize(['academico']), getMyHistoricalData); 
router.get('/my-committee-events', protect, authorize(['academico']), getMyCommitteeEvents);
export default router;