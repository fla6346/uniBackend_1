import asyncHandler from 'express-async-handler';
import { getModels } from '../models/index.js'; 

/**
 * Endpoint para crear notificaciones masivas.
 * Espera un body con: { title, message, type, idevento, idusuarios[] }
 */
export const Notification = asyncHandler(async (req, res) => {
   try {
    const userId = req.user.idusuario; 
    const models = await getModels();
    const {Notificacion} = models;
    const notificaciones = await Notificacion.findAll({
      where: { idusuario: userId },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'idusuario', 'titulo', 'mensaje', 'tipo', 'estado', 'created_at'],
    });

    res.status(200).json(notificaciones);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});
export const getUserNotifications = async (req, res) => {
  try {
    const models = await getModels();
    const { Notificacion } = models;

    const userId = req.user?.idusuario;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const notificaciones = await Notificacion.findAll({
      where: { idusuario: userId },
      order: [['created_at', 'DESC']]
    });

    res.json(notificaciones);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al cargar notificaciones' });
  }
};
export const read = async(req, res) =>{
   try {
    const { id } = req.params;
    const userId = req.user.idusuario;

    const notif = await Notificacion.findOne({ where: { id, idusuario: userId } });
    if (!notif) return res.status(404).json({ message: 'Notificación no encontrada' });

    notif.estado = 'leido';
    await notif.save();

    res.status(200).json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}
export const markAsRead = asyncHandler(async (req, res) => {
  const models = await getModels();
  const { Notificacion } = models;

  const notificationId = req.params.id;
  const userId = req.user?.idusuario;

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  try {
    const [updated] = await Notificacion.update(
      { read: true, estado: 'leido' },
      {
        where: {
          idnotificacion: notificationId,
          idusuario: userId
        }
      }
    );

    if (updated === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json({ success: true, message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const models = await getModels();
  const { Notificacion } = models;

  const userId = req.user?.idusuario;

  if (!userId) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  try {
    const count = await Notificacion.count({
      where: {
        idusuario: userId,
        read: false
      }
    });

    res.json({ unread_count: count });
  } catch (error) {
    console.error('Error obteniendo conteo de notificaciones no leídas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});