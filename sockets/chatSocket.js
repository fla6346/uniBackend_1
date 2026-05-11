// sockets/chatSocket.js
module.exports = (io) => {

  io.on('connection', (socket) => {
    console.log('🔌 Usuario conectado:', socket.id);

    // Unirse a la sala del evento
    socket.on('join_event', async ({ eventoId, userId, role, userName }) => {
      const room = `evento_${eventoId}`;
      socket.join(room);
      socket.data = { userId, role, eventoId, userName };

      // Enviar historial solo al usuario que acaba de entrar
      try {
        const { ChatMensaje } = require('../models');
        const historial = await ChatMensaje.findAll({
          where: { evento_id: eventoId },
          order: [['createdAt', 'ASC']],
          limit: 50
        });
        socket.emit('history', historial.map(m => ({
          userId:    m.user_id,
          userName:  m.user_name,
          role:      m.role,
          message:   m.message,
          timestamp: m.createdAt
        })));
      } catch (e) {
        console.warn('⚠️ No se cargó historial:', e.message);
        socket.emit('history', []);
      }

      // Notificar a los demás que alguien entró
      socket.to(room).emit('user_joined', { userId, userName, role });
      console.log(`👤 ${userName} (${role}) → sala ${room}`);
    });

    // Recibir y retransmitir mensaje
    socket.on('send_message', async ({ eventoId, userId, role, userName, message }) => {
      const room = `evento_${eventoId}`;

      const msg = {
        userId,
        userName,
        role,
        message,
        timestamp: new Date().toISOString()
      };

      // Guardar en DB
      try {
        const { ChatMensaje } = require('../models');
        await ChatMensaje.create({
          evento_id: eventoId,
          user_id:   userId,
          user_name: userName,
          role,
          message
        });
      } catch (e) {
        console.warn('⚠️ No se guardó en DB:', e.message);
      }

      // Broadcast a todos en la sala
      io.to(room).emit('receive_message', msg);
    });

    socket.on('leave_event', ({ eventoId }) => {
      socket.leave(`evento_${eventoId}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Usuario desconectado:', socket.id);
    });
  });

};