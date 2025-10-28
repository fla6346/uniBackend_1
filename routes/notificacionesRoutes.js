// routes/notificacionesRoutes.js
import { Router } from 'express';
import {
  createNotification,
  getUserNotifications,
  markAsRead,
  getUnreadCount
} from '../controllers/notificationController.js';
import {protect} from '../middleware/authMiddleware.js'; // o como lo tengas

const router = Router();

// Rutas reales
router.post('/', protect, createNotification);
router.get('/', protect, getUserNotifications);
router.patch('/:id/read', protect, markAsRead);
router.get('/unread-count', protect, getUnreadCount);

export default router;