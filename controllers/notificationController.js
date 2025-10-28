import asyncHandler from 'express-async-handler';
import { Notificacion, User } from '../config/db.js'; 

export const Notification = asyncHandler(async (req, res) => {
  try {
    const { title, message, type = 'info', idevento, idusuarios } = req.body;

    if (Array.isArray(idusuarios) && idusuarios.length > 0) {
      const notifications = await Promise.all(
        idusuarios.map(idusuario =>
          Notificacion.create({
            titulo: title,
            mensaje: message,
            tipo: type,
            idevento: idevento || null,
            idadministrador: idusuario, 
            estado: 'nueva',
            read: false,
            created_at: new Date()
          })
        )
      );
      return res.status(201).json({ success: true, count: notifications.length });
    }

    // Comportamiento anterior: notificar a todos los admins (opcional, puedes mantenerlo o eliminarlo)
    const adminRoles = ['admin', 'academico', 'director', 'coordinador'];
    const adminUsers = await User.findAll({
      where: { role: adminRoles, habilitado: '1' },
      attributes: ['idusuario']
    });

    if (adminUsers.length === 0) {
      return res.status(201).json({ message: 'No hay destinatarios' });
    }

    const notifications = await Promise.all(
      adminUsers.map(user =>
        Notificacion.create({
          titulo: title,
          mensaje: message,
          tipo: type,
          idevento: idevento || null,
          idadministrador: user.idusuario,
          estado: 'nueva',
          read: false,
          created_at: new Date()
        })
      )
    );

    res.status(201).json({ success: true, count: notifications.length });
  } catch (error) {
    console.error('🚨 Error al crear notificaciones:', error);
    res.status(500).json({ error: 'Error interno al crear notificación' });
  }
});
// En notificationController.js
export const createNotification = asyncHandler(async (req, res) => {
  try {
    const { titulo, mensaje, tipo, idevento, destinatarios } = req.body;
    const creadorId = req.user?.idusuario; // Quien crea la notificación

    if (!creadorId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!titulo || !mensaje || !tipo) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: titulo, mensaje, tipo' });
    }

    // Si se especifican destinatarios, notificar solo a ellos
    let usuariosDestino = [];
    if (Array.isArray(destinatarios) && destinatarios.length > 0) {
      usuariosDestino = destinatarios;
    } else {
      // Por defecto: notificar a todos los admins
      const adminRoles = ['admin'];
      const admins = await User.findAll({
        where: { role: adminRoles, habilitado: '1' },
        attributes: ['idusuario']
      });
      usuariosDestino = admins.map(u => u.idusuario);
    }

    // Crear una notificación para cada destinatario
    const notifications = await Promise.all(
      usuariosDestino.map(idusuario =>
        Notificacion.create({
          titulo,
          mensaje,
          tipo,
          idevento: idevento || null,
          idadministrador: idusuario, // ← Asume que los destinatarios son admins
          estado: 'nueva',
          read: false,
          created_at: new Date()
        })
      )
    );

    res.status(201).json({ success: true, count: notifications.length });
  } catch (error) {
    console.error('🚨 Error al crear notificaciones:', error);
    res.status(500).json({ error: 'Error interno al crear notificación' });
  }
});

export const getUserNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?.idusuario;
  const userRole = req.user?.role || req.user?.role;

  if (!userId || !userRole) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  const adminRoles = ['admin', 'academico', 'director', 'coordinador'];
  const whereCondition = adminRoles.includes(userRole)
    ? { idadministrador: userId }
    : { idestudiante: userId };

  try {
    const notifications = await Notificacion.findAll({
      where: whereCondition,
      order: [['created_at', 'DESC']]
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user?.idusuario;
  const userRole = req.user?.role || req.user?.role;

  if (!userId || !userRole) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  if (!notificationId) {
    return res.status(400).json({ error: 'ID de notificación requerido' });
  }

  const adminRoles = ['admin', 'academico', 'director', 'coordinador'];
  const userColumn = adminRoles.includes(userRole)
    ? 'idadministrador'
    : 'idestudiante';

  try {
    const [updated] = await Notificacion.update(
      { read: true, estado: 'leido' },
      {
        where: {
          idnotificacion: notificationId,
          [userColumn]: userId
        }
      }
    );

    if (updated === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada o no autorizada' });
    }

    res.json({ success: true, message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user?.idusuario;
  const userRole = req.user?.role || req.user?.role;

  if (!userId || !userRole) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }

  const adminRoles = ['admin', 'academico', 'director', 'coordinador'];
  const userColumn = adminRoles.includes(userRole)
    ? 'idadministrador'
    : 'idestudiante';

  try {
    const count = await Notificacion.count({
      where: {
        [userColumn]: userId,
        read: false
      }
    });

    res.json({ unread_count: count });
  } catch (error) {
    console.error('Error obteniendo conteo de notificaciones no leídas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});