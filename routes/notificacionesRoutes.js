// routes/notificacionesRoutes.js
import { Router } from 'express';
import {protect, authorize} from '../middleware/authMiddleware.js'
const router = Router();
import  notificationController from '../controllers/notificationController.js';

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    // Por ahora, simular usuario autenticado
    // Más tarde conectarás con tu lógica de JWT real
    req.user = { 
      id: 1, 
      role: 'admin',
      nombre: 'Usuario Test'
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para logging
const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
};

// Aplicar middleware de logging a todas las rutas
router.use(logRequest);

// Ruta de prueba para verificar que funciona
router.get('/test', authMiddleware, notificationController.testRoute);

// Rutas principales de notificaciones
router.post('/',  notificationController.createNotification);
router.get('/user', notificationController.getUserNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.get('/count', notificationController.getUnreadCount);

export default router;