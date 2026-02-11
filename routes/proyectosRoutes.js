import express from 'express';
import {getModels} from '../models/index.js ';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { 
  getEventosNoAprobados,
  aprobarEvento,
  rechazarEvento,
  getEventosAprobados,
  getCarreraById,
  getFacultadById,
  getEstudianteFacultad
} from '../controllers/proyectoController.js';
import {
  Notification,
  getUserNotifications,
  markAsRead,
  getUnreadCount
} from '../controllers/notificationController.js';
const router = express.Router();
router.put('/:id/approve',protect,authorize('admin'), aprobarEvento);
router.put('/:id/reject',protect,authorize('admin'), rechazarEvento);
router.get('/estudiantes/facultad/:idfacultad',getEstudianteFacultad) ;

router.get('/carreras/:id', protect, getCarreraById);

router.get('/facultades/:id', protect,getFacultadById);
router.post('/', Notification);
router.get('/', getUserNotifications);
router.patch('/:id/read', markAsRead);
router.get('/unread-count', getUnreadCount);

export default router;