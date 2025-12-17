// controllers/dashboardController.js
import { getModels } from '../models/index.js';
import { Op } from 'sequelize';
import asyncHandler from 'express-async-handler';

/**
 * Obtener estadísticas del dashboard
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    const models = await getModels();
    const { User, Evento } = models;

    console.log('📊 Calculando estadísticas del dashboard...');

    // 1. Usuarios Activos
    const activeUsers = await User.count({
      where: { habilitado: '1' }
    });

    // 2. Total de Eventos
    const totalEvents = await Evento.count();

    // 3. Obtener todos los eventos con su estado
    const todosLosEventos = await Evento.findAll({
      attributes: ['estado', 'createdAt']
    });

    // 4. Contar eventos por estado
    const estadoCounts = todosLosEventos.reduce((acc, evento) => {
      const estado = evento.estado || 'sin_estado';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    // 5. Eventos aprobados este mes
    const primerDiaDelMes = new Date();
    primerDiaDelMes.setDate(1);
    primerDiaDelMes.setHours(0, 0, 0, 0);

    const eventosAprobadosMes = todosLosEventos.filter(evento => {
      const fechaEvento = new Date(evento.createdAt);
      return evento.estado === 'aprobado' && fechaEvento >= primerDiaDelMes;
    }).length;

    // 6. Calcular tasa de aprobación
    const eventosAprobados = estadoCounts.aprobado || 0;
    const tasaAprobacion = totalEvents > 0 
      ? Math.round((eventosAprobados / totalEvents) * 100) 
      : 0;

    // 7. Estabilidad del sistema (puedes mejorar esto)
    const systemStability = 99;

    const stats = {
      activeUsers,
      totalEvents,
      estadoCounts,
      eventosAprobadosMes,
      tasaAprobacion,
      systemStability
    };

    console.log('✅ Estadísticas calculadas:', JSON.stringify(stats, null, 2));
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('❌ Error al obtener estadísticas del dashboard:', error);
    res.status(500).json({ 
      error: 'Error al cargar estadísticas',
      message: error.message 
    });
  }
});

/**
 * Obtener datos históricos para gráficas
 */
export const getHistoricalData = asyncHandler(async (req, res) => {
  try {
    const models = await getModels();
    const { Evento } = models;

    console.log('📈 Calculando datos históricos...');

    const now = new Date();
    const data = [];

    // Generar datos de los últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      // Contar eventos en este mes
      const eventos = await Evento.findAll({
        where: {
          createdAt: { [Op.between]: [start, end] }
        },
        attributes: ['estado']
      });

      const total = eventos.length;
      const aprobados = eventos.filter(e => e.estado === 'aprobado').length;
      const pendientes = eventos.filter(e => e.estado === 'pendiente').length;
      const rechazados = eventos.filter(e => e.estado === 'rechazado').length;

      data.push({
        mes: start.toLocaleString('es-ES', { month: 'short', year: '2-digit' }),
        total,
        aprobados,
        pendientes,
        rechazados
      });
    }

    console.log('✅ Datos históricos calculados:', data.length, 'meses');
    
    res.status(200).json({ historical: data });
  } catch (error) {
    console.error('❌ Error al obtener datos históricos:', error);
    res.status(500).json({ 
      error: 'Error al cargar datos históricos',
      message: error.message 
    });
  }
});