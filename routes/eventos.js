import express from 'express';
import { Op } from 'sequelize';
import { getModels } from '../models/index.js';
import { 
  createEvento,
  getAllEventos, 
  getEventoById,
  updateEvento, 
  deleteEvento,
  getEventosNoAprobados,
  getEventosAprobados,
  aprobarEvento,rechazarEvento,
  //pendientes,
  getDashboardStats,
  getHistoricalData,
  getEventosAprobadosPorFacultad,
  //getEventosPendientesPorArea
  } from '../controllers/proyectoController.js';
import {protect,authorize} from '../middleware/authMiddleware.js';
const router = express.Router();

router.use((req, res, next) => {
  console.log(`[RUTA] ${req.method} ${req.path} - Params:`, req.params, '- Body:', req.body);
  next();
});

router.get('/pendientes',protect, getEventosNoAprobados);
router.get('/aprobados',protect, getEventosAprobados);
router.get('/aprobados-por-facultad',protect, getEventosAprobadosPorFacultad);
router.get('/dashboard/stats', protect, getDashboardStats);
router.get('/dashboard/historical', protect, getHistoricalData);


//router.get('/listar-pendientes', pendientes); // si necesitas esta ruta
//router.get('/pendientes',protect, getEventosPendientesPorArea);
router.put('/:id/approve', aprobarEvento);
router.put('/:id/reject',rechazarEvento);
router.put('/:id', updateEvento);
router.delete('/:id', deleteEvento);
router.post('/',protect, createEvento);
router.get('/', getAllEventos);
router.get('/:id',protect, getEventoById);
//router.get('/mios/aprobados',protect, getAprobados);


//router.get('/debug/:id',debugEventoById);



//router.get('/pendientes',pendientes);

export default router;