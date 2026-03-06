const cron = require('node-cron');
const { getModels } = require('../models/index');
const { Op } = require('sequelize');

const limpiarEventosVencidos = async () => {
  try {
    const { Evento } = getModels();
    const haceDosSemanas = new Date();
    haceDosSemanas.setDate(haceDosSemanas.getDate() - 14);

    const [cantidad] = await Evento.update(
      { estado: 'inactivo' },
      {
        where: {
          fechaevento: { [Op.lt]: haceDosSemanas },
          estado: { [Op.notIn]: ['inactivo', 'rechazado'] }
        }
      }
    );
    console.log(`✅ Cron: ${cantidad} eventos marcados como inactivos`);
  } catch (error) {
    console.error('❌ Cron error:', error.message);
  }
};

const iniciarCronJobs = async () => {
  // Ejecuta al arrancar el servidor también
  await limpiarEventosVencidos();

  // Luego corre cada día a medianoche
  cron.schedule('0 0 * * *', limpiarEventosVencidos);
  console.log('✅ Cron jobs iniciados');
};

module.exports = { iniciarCronJobs };