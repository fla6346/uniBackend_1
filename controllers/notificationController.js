import { Notificacion, sequelize } from '../config/db.js'; // Ajustar según tu configuración

<<<<<<< HEAD
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
=======
const notificationController = {
  // Crear nueva notificación
 createNotification : async (req, res) => {
    const t = await sequelize.transaction();

    try {
      console.log('Creando nueva notificación:', req.body);
      
      
      const {
        type,
        title,
        message,
        eventData,
        recipient_role = 'admin',
        idevento
      } = req.body;

      // Validar campos requeridos
      if (!type || !title || !message) {
        return res.status(400).json({
          error: 'Faltan campos requeridos: type, title, message'
        });
      }

      // Si tienes un modelo Sequelize para notificaciones, úsalo aquí
      // Si no, puedes usar consulta SQL directa
      try {
        // Opción 1: Si tienes modelo Sequelize
        /* 
        const notification = await Notificacion.create({
          idusuario: req.user?.id || null,
          idevento: idevento || null,
          mensaje: message,
          tipo: type,
          estado: 'nueva',
          titulo: title,
          event_data: JSON.stringify(eventData || {})
        });
        */

        // Opción 2: Consulta SQL directa (mientras tanto)
        const notificationData = {
          id: Date.now(), // ID temporal
          tipo: type,
          titulo: title,
          mensaje: message,
          idevento: idevento,
          created_at: new Date()
        };

        console.log('Notificación creada:', notificationData);

        res.status(201).json({
          success: true,
          message: 'Notificación creada exitosamente',
          id: notificationData.id,
          data: notificationData
        });

      } catch (dbError) {
        console.error('Error de base de datos:', dbError);
        throw dbError;
      }

    } catch (error) {
      console.error('Error creando notificación:', error);
      res.status(500).json({
        error: 'Error interno del servidor al crear notificación',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Obtener notificaciones del usuario
   getUserNotifications : async (req, res) => {
    try {
      console.log('Obteniendo notificaciones para usuario:', req.user);
      
      const userId = req.user?.id;
      const userRole = req.user?.role || req.user?.rol;

      if (!userId && !userRole) {
        return res.status(401).json({
          error: 'Usuario no autenticado correctamente'
        });
      }

      // Por ahora devolver array vacío hasta que tengas el modelo configurado
      const notifications = [];

      // Cuando tengas el modelo configurado, descomenta esto:
      /*
      const notifications = await Notificacion.findAll({
        where: {
          [Op.or]: [
            { idusuario: userId },
            { idusuario: null }
          ]
        },
        order: [['created_at', 'DESC']],
        limit: 100
      });
      */

      // Procesar notificaciones para el frontend
      const processedNotifications = notifications.map(notif => ({
        id: notif.idnotificacion || notif.id,
        idnotificacion: notif.idnotificacion || notif.id,
        user_id: notif.idusuario,
        idevento: notif.idevento,
        message: notif.mensaje,
        mensaje: notif.mensaje,
        type: notif.tipo,
        tipo: notif.tipo,
        estado: notif.estado,
        created_at: notif.created_at,
        title: notif.titulo,
        titulo: notif.titulo,
        eventData: notif.event_data ? JSON.parse(notif.event_data) : null,
        event_data: notif.event_data ? JSON.parse(notif.event_data) : null,
        read: notif.estado === 'leida',
        timestamp: notif.created_at,
        recipient_role: 'admin'
      }));

      console.log(`Encontradas ${processedNotifications.length} notificaciones`);
      res.json(processedNotifications);

    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      res.status(500).json({
        error: 'Error interno del servidor al obtener notificaciones',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Marcar notificación como leída
  markAsRead : async (req, res) => {
>>>>>>> f102db18a9ba19d1cb87246acae9cb5ab16a009f
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
<<<<<<< HEAD
  };

  // Obtener conteo de notificaciones no leídas
const getUnreadCount = async (req, res) => {
=======
  },

  // Obtener conteo de notificaciones no leídas
   getUnreadCount : async (req, res) => {
>>>>>>> f102db18a9ba19d1cb87246acae9cb5ab16a009f
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
<<<<<<< HEAD
  };

 

=======
  },

  // Ruta de prueba
   testRoute : (req, res) => {
    res.json({
      message: 'Las rutas de notificaciones están funcionando correctamente!',
      timestamp: new Date(),
      user: req.user || 'No autenticado'
    });
  },
};
>>>>>>> f102db18a9ba19d1cb87246acae9cb5ab16a009f
export default notificationController;