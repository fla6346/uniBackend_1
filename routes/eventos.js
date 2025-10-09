import express from 'express';
import { Op } from 'sequelize';
import { sequelize, Evento, Objetivo, Resultado, ObjetivoPDI } from '../config/db.js';
import { 
  createEvento,
  getAllEventos, 
  getEventoById,
  updateEvento, 
  deleteEvento,
  getEventosNoAprobados,
  aprobarEvento,rechazarEvento,
  debugEventoById,
  getApprovedEvents,
  } from '../controllers/proyectoController.js';
import {protect,authorize} from '../middleware/authMiddleware.js';
const router = express.Router();

router.use((req, res, next) => {
  console.log(`[RUTA] ${req.method} ${req.path} - Params:`, req.params, '- Body:', req.body);
  next();
});

router.get('/pendientes', getEventosNoAprobados);
router.get('/aprobados', getApprovedEvents);

router.put('/:id/approve', aprobarEvento);
router.put('/:id/reject',rechazarEvento);

router.get('/:id', getEventoById);
router.put('/:id', updateEvento);
router.delete('/:id', deleteEvento);
router.post('/', createEvento);
router.get('/', getAllEventos);

router.get('/debug/:id',debugEventoById);



//router.get('/pendientes',pendientes);

export default router;