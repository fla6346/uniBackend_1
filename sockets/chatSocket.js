// sockets/chatSocket.js
module.exports = (io) => {

  io.on('connection', (socket) => {
    console.log('🔌 Usuario conectado:', socket.id);

    socket.on('join_event', async (data) => {
    const { eventoId, userId, role } = data;
    
    try {
      // ✅ Validar que el usuario sea del comité
      const [rows] = await db.query(
        `SELECT 1 FROM Comite 
         WHERE idevento = ? AND idusuario = ?`,
        [eventoId, userId]
      );
      
      if (rows.length === 0) {
        socket.emit('error', { message: 'No eres miembro de este comité' });
        return;
      }
      
      // ✅ Unir a la sala del evento
      socket.join(`evento_${eventoId}`);
      socket.emit('joined', { eventoId });
      
      // Enviar historial
      const [messages] = await db.query(
        `SELECT * FROM mensajes_chat 
         WHERE idevento = ? 
         ORDER BY fechaenvio ASC 
         LIMIT 50`,
        [eventoId]
      );
      
      socket.emit('history', messages);
      
    } catch (error) {
      console.error('Error al unirse al chat:', error);
      socket.emit('error', { message: 'Error al conectar al chat' });
    }
  });
  

    socket.on('send_message', async (data) => {
    const { eventoId, userId, role, userName, message } = data;
    
    // ✅ Validar nuevamente antes de enviar
    const [rows] = await db.query(
      `SELECT 1 FROM Comite 
       WHERE idevento = ? AND idusuario = ?`,
      [eventoId, userId]
    );
    
    if (rows.length === 0) {
      socket.emit('error', { message: 'No tienes permiso para enviar mensajes' });
      return;
    }
    
    // Guardar mensaje
    await db.query(
      `INSERT INTO mensajes_chat (idevento, idusuario, rol, nombreusuario, mensaje, fechaenvio) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [eventoId, userId, role, userName, message]
    );
    
    // Broadcast a la sala
    io.to(`evento_${eventoId}`).emit('receive_message', {
      eventoId,
      userId,
      role,
      userName,
      message,
      fechaenvio: new Date()
    });
  });

    socket.on('leave_event', ({ eventoId }) => {
      socket.leave(`evento_${eventoId}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Usuario desconectado:', socket.id);
    });
  });
};