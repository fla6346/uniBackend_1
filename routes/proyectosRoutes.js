import express from 'express';
import db from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. OBTENER NOTIFICACIONES DEL USUARIO
router.get('/user', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const query = `
      SELECT 
        n.*,
        p.nombreevento as proyecto_nombre,
        e.nombreevento as evento_nombre
      FROM notifications n
      LEFT JOIN proyectos p ON n.project_id = p.id
      LEFT JOIN eventos e ON n.event_id = e.id
      WHERE n.user_id = ?
      ORDER BY n.timestamp DESC
      LIMIT 50
    `;
    
    const notifications = await db.query(query, [userId]);
    res.json(notifications);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// 2. MARCAR NOTIFICACIÓN COMO LEÍDA
router.patch('/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const result = await db.query(`
      UPDATE notifications 
      SET read_status = true, read_at = NOW()
      WHERE id = ? AND user_id = ?
    `, [id, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Notificación no encontrada'
      });
    }
    
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// 3. OBTENER CONTEO DE NOTIFICACIONES NO LEÍDAS
router.get('/unread-count', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_status = false',
      [userId]
    );
    
    res.json({ unread_count: result[0].count });
  } catch (error) {
    console.error('Error al obtener conteo de notificaciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// 4. MARCAR TODAS LAS NOTIFICACIONES COMO LEÍDAS
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    await db.query(`
      UPDATE notifications 
      SET read_status = true, read_at = NOW()
      WHERE user_id = ? AND read_status = false
    `, [userId]);
    
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// 5. CREAR NOTIFICACIÓN (Solo Admin - para notificar a directores)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { tipo, mensaje, usuario_id, proyecto_id, evento_id } = req.body;
  
  if (!tipo || !mensaje || !usuario_id) {
    return res.status(400).json({
      error: 'Tipo, mensaje y usuario_id son campos obligatorios'
    });
  }
  
  try {
    const query = `
      INSERT INTO notifications (
        type, message, user_id, project_id, event_id,
        timestamp, read_status, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), false, NOW())
    `;
    
    const result = await db.query(query, [
      tipo,
      mensaje,
      usuario_id,
      proyecto_id || null,
      evento_id || null
    ]);
    
    res.json({
      message: 'Notificación enviada exitosamente',
      notification_id: result.insertId
    });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// 6. ELIMINAR NOTIFICACIÓN
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const result = await db.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Notificación no encontrada'
      });
    }
    
    res.json({ message: 'Notificación eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

export default router;