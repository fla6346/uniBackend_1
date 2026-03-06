const cron = require('node-cron');
const { getModels } = require('../models/index');
const { Op } = require('sequelize');
// const botService = require('../services/botService'); // Si usas bot

const marcarEventosVencidos = async () => {
  try {
    const { Evento } = getModels();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); 

    const eventosVencidos = await Evento.findAll({
      where: {
        fechaevento: { [Op.lt]: hoy },
        estado: { [Op.in]: ['aprobado', 'activo'] }
      }
    });

    if (eventosVencidos.length === 0) {
      console.log('✅ Cron: No hay eventos vencidos para actualizar');
      return;
    }

    console.log('🔍 Eventos a vencer:', eventosVencidos.map(e => ({
      id: e.idevento,
      nombre: e.nombreevento,
      fecha: e.fechaevento,
      estado: e.estado
    })));
    const [cantidad] = await Evento.update(
      { 
        estado: 'vencido',
        updated_at: new Date()
      },
      {
        where: {
          fechaevento: { [Op.lt]: hoy },
          estado: { [Op.in]: ['aprobado', 'activo'] }
        },
        individualHooks: true 
      }
    );

    console.log(`✅ Cron: ${cantidad} eventos marcados como 'vencido'`);

    // for (const evento of eventosVencidos) {
    //   await botService.notificarEventoFinalizado(evento);
    // }

  } catch (error) {
    console.error('❌ Error marcando eventos vencidos:', error.message);
  }
};

const limpiarEventosMuyAntiguos = async () => {
  try {
    const { Evento } = getModels();
    const haceDosSemanas = new Date();
    haceDosSemanas.setDate(haceDosSemanas.getDate() - 14);

    const [cantidad] = await Evento.destroy({
      where: {
        fechaevento: { [Op.lt]: haceDosSemanas },
        estado: 'vencido'
      }
    });

    console.log(`🗑️ Cron: ${cantidad} eventos antiguos eliminados`);
  } catch (error) {
    console.error('❌ Error limpiando eventos antiguos:', error.message);
  }
};

const iniciarCronJobs = async () => {
  console.log('🕐 Iniciando cron jobs...');
  
  await marcarEventosVencidos();
  
  cron.schedule('0 0 * * *', () => {
    console.log('🔄 Ejecutando cron: marcarEventosVencidos');
    marcarEventosVencidos();
  });
//domingo
  cron.schedule('0 3 * * 0', () => {
    console.log('🔄 Ejecutando cron: limpiarEventosMuyAntiguos');
    limpiarEventosMuyAntiguos();
  });

  console.log('✅ Cron jobs configurados:');
  console.log('   - Marcar vencidos: Todos los días a 00:00');
  console.log('   - Limpiar antiguos: Domingos a 03:00');
};

module.exports = { iniciarCronJobs };