import express from 'express';
const router = express.Router();

import {
  createEvento,
  getAllEventos,
  getEventoById,
  updateEvento,
  deleteEvento,
} from '../controllers/eventController.js';

import { protect, authorize } from '../middleware/authMiddleware.js';

router.post('/', protect, createEvento);
router.get('/', getAllEventos);
router.get('/:id', getEventoById);

router.put('/:id', protect, authorize(['admin']), updateEvento);
router.delete('/:id', protect, authorize(['admin']), deleteEvento);
export default router;