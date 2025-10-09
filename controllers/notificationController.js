import { Notificacion, sequelize } from '../config/db.js'; // Ajustar según tu configuración

const createNotification = async (req, res) => {
  try {
    const { userId, title, message, type = 'info', relatedId, relatedType } = req.body;
    
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      relatedId,
      relatedType,
      read: false
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({ error: 'Error al crear notificación' });
  }
};

const getUserNotifications = async (req, res) => {
  try {
    // Asumiendo que `req.user.id` viene del middleware `protect`
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

const  markAsRead = async (req, res) => {
    try {
      const notificationId = req.params.id;
      const userId = req.user?.id;

      console.log(`Marcando notificación ${notificationId} como leída`);

      if (!notificationId) {
        return res.status(400).json({
          error: 'ID de notificación requerido'
        });
      }

      // Por ahora solo simular éxito
      console.log('Notificación marcada como leída (simulado)');

      res.json({
        success: true,
        message: 'Notificación marcada como leída'
      });

    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Obtener conteo de notificaciones no leídas
const getUnreadCount = async (req, res) => {
    try {
      const userId = req.user?.id;

      // Por ahora devolver 0
      res.json({
        unread_count: 0
      });

    } catch (error) {
      console.error('Error obteniendo conteo:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  };

 

export default notificationController;