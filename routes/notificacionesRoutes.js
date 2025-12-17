// routes/notificacionesRoutes.js
import { Router } from 'express';
import {
  getUserNotifications,
  markAsRead,
  getUnreadCount,Notification,
  read
} from '../controllers/notificationController.js';
import {protect} from '../middleware/authMiddleware.js'; // o como lo tengas

const router = Router();

// Rutas reales
//router.post('/notificaciones', Notification);
router.get('/', protect, getUserNotifications);
router.patch('/:id/read', protect, read);
router.get('/unread-count', protect, getUnreadCount);

export default router;